"""Lichess integration API endpoints."""

# ROOT CAUSE of "Failed to read PGN file" bug:
# The backend was saving PGN to a temp file (e.g., /tmp/xyz.pgn) and returning
# the filesystem path to the frontend. The frontend tried to fetch() this path
# as a URL, which failed because:
# 1. It's a server filesystem path, not a URL
# 2. The server doesn't serve files from /tmp/
# 3. Frontend cannot access server filesystem
#
# FIX: Use in-memory cache with session tokens. Download returns a token,
# import endpoints use the token to retrieve cached PGN.

import json
import time
import tempfile
import uuid
from datetime import datetime, timedelta
from typing import Iterator, Dict, Optional
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()

# In-memory cache for PGN content
# Key: session token, Value: (pgn_text, summary, expiry_time)
_pgn_cache: Dict[str, tuple[str, dict, datetime]] = {}


def _clean_expired_cache():
    """Remove expired entries from the cache."""
    now = datetime.now()
    expired_keys = [k for k, v in _pgn_cache.items() if v[2] < now]
    for k in expired_keys:
        del _pgn_cache[k]


def _cache_pgn(pgn_text: str, summary: dict) -> str:
    """Cache PGN content and return a session token."""
    _clean_expired_cache()
    token = uuid.uuid4().hex
    expiry = datetime.now() + timedelta(minutes=10)
    _pgn_cache[token] = (pgn_text, summary, expiry)
    return token


def _get_cached_pgn(token: str) -> Optional[tuple[str, dict]]:
    """Retrieve cached PGN content by token."""
    _clean_expired_cache()
    if token in _pgn_cache:
        pgn_text, summary, expiry = _pgn_cache[token]
        if expiry > datetime.now():
            return pgn_text, summary
    return None


class LichessImportRequest(BaseModel):
    lichess_username: str
    lichess_api_token: str
    session_token: Optional[str] = None  # For retrieving cached content


def fetch_lichess_studies(
    username: str,
    token: str,
    emit: callable = None
) -> tuple[str, dict]:
    """Fetch all studies for a Lichess user and concatenate into single PGN.
    
    Returns:
        (combined_pgn, summary_dict)
    """
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 1: Fetch list of studies
    if emit:
        emit({"type": "status", "message": f"Fetching studies for {username}..."})
    
    try:
        with httpx.Client(timeout=30) as client:
            # Get list of studies (NDJSON format)
            resp = client.get(
                f"https://lichess.org/api/study/by/{username}",
                headers=headers
            )
            
            if resp.status_code == 401:
                raise HTTPException(status_code=401, detail="Invalid API token. Get a new one at https://lichess.org/account/oauth/token with study:read scope")
            if resp.status_code == 404:
                raise HTTPException(status_code=404, detail=f"User '{username}' not found on Lichess")
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f"Lichess API error: {resp.text}")
            
            # Parse NDJSON (one JSON object per line)
            studies = []
            for line in resp.text.strip().split("\n"):
                if line:
                    studies.append(json.loads(line))
            
            if not studies:
                if emit:
                    emit({"type": "status", "message": "No studies found for this user"})
                return "", {"studies_count": 0, "chapters_count": 0, "failed_studies": []}
            
            if emit:
                emit({"type": "status", "message": f"Found {len(studies)} studies"})
            
            # Step 2: Fetch each study's PGN
            combined_pgn = []
            total_chapters = 0
            failed_studies = []
            
            for i, study in enumerate(studies):
                study_id = study["id"]
                study_name = study.get("name", study_id)
                
                if emit:
                    emit({
                        "type": "progress",
                        "current": i + 1,
                        "total": len(studies),
                        "message": f"Downloading study: {study_name}"
                    })
                
                # Rate limit safety: 1 second between requests
                if i > 0:
                    time.sleep(1)
                
                try:
                    pgn_resp = client.get(
                        f"https://lichess.org/api/study/{study_id}.pgn",
                        headers=headers
                    )
                    
                    if pgn_resp.status_code == 200:
                        pgn_text = pgn_resp.text.strip()
                        if pgn_text:
                            # Count chapters (games) in this study
                            chapters_in_study = pgn_text.count("[Event ")
                            total_chapters += chapters_in_study
                            
                            # Add study metadata as comment
                            combined_pgn.append(f"[StudyName \"{study_name}\"]\n[StudyId \"{study_id}\"]\n")
                            combined_pgn.append(pgn_text)
                            combined_pgn.append("\n\n")
                    else:
                        failed_studies.append({
                            "id": study_id,
                            "name": study_name,
                            "error": f"HTTP {pgn_resp.status_code}"
                        })
                        if emit:
                            emit({
                                "type": "warning",
                                "message": f"Failed to fetch study '{study_name}': HTTP {pgn_resp.status_code}"
                            })
                
                except Exception as e:
                    failed_studies.append({
                        "id": study_id,
                        "name": study_name,
                        "error": str(e)
                    })
                    if emit:
                        emit({
                            "type": "warning",
                            "message": f"Failed to fetch study '{study_name}': {str(e)}"
                        })
            
            combined = "\n".join(combined_pgn)
            
            summary = {
                "studies_count": len(studies),
                "successful_studies": len(studies) - len(failed_studies),
                "chapters_count": total_chapters,
                "failed_studies": failed_studies
            }
            
            if emit:
                emit({
                    "type": "summary",
                    "summary": summary
                })
            
            return combined, summary
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching studies: {str(e)}")


def stream_lichess_import(username: str, api_token: str, session_token: Optional[str] = None) -> Iterator[str]:
    """Stream SSE events for Lichess import process.
    
    If session_token is provided, tries to use cached PGN first.
    Otherwise fetches from Lichess.
    """
    
    # Start event
    yield f"data: {json.dumps({'type': 'start'})}\n\n"
    
    # Try to use cached PGN if token provided
    if session_token:
        cached = _get_cached_pgn(session_token)
        if cached:
            pgn_text, summary = cached
            yield f"data: {json.dumps({'type': 'status', 'message': 'Using cached studies'})}\n\n"
            session_token_new = session_token  # Reuse the same token
        else:
            session_token = None  # Cache miss, will fetch fresh
    
    # Fetch fresh if no cache or cache miss
    if not session_token:
        events = []
        def collect_emit(event: dict):
            events.append(event)
        
        try:
            # Fetch studies (this collects events)
            pgn_text, summary = fetch_lichess_studies(username, api_token, emit=collect_emit)
            
            # Yield collected events
            for event in events:
                yield f"data: {json.dumps(event)}\n\n"
            
            # Cache the result
            if pgn_text:
                session_token_new = _cache_pgn(pgn_text, summary)
            else:
                session_token_new = None
                
        except HTTPException as e:
            yield f"data: {json.dumps({'type': 'error', 'status_code': e.status_code, 'detail': e.detail})}\n\n"
            return
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"
            return
    
    # Return the session token and summary (not a file path!)
    if pgn_text:
        yield f"data: {json.dumps({'type': 'complete', 'session_token': session_token_new, 'summary': summary})}\n\n"
    else:
        yield f"data: {json.dumps({'type': 'complete', 'session_token': None, 'summary': summary})}\n\n"


@router.post("/lichess/import-studies")
def import_lichess_studies(data: LichessImportRequest):
    """Import all studies from a Lichess account.
    
    Returns SSE stream with progress updates.
    """
    return StreamingResponse(
        stream_lichess_import(data.lichess_username, data.lichess_api_token, data.session_token),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )