#!/usr/bin/env python3
"""
One-time cleanup: delete all puzzle-typed positions.
Tabiyas are preserved.
Run after backup.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal
from backend.models import Position, PositionType

def main():
    db = SessionLocal()
    
    # Count puzzles and tabiyas
    puzzle_count = db.query(Position).filter(Position.position_type == PositionType.puzzle).count()
    tabiya_count = db.query(Position).filter(Position.position_type == PositionType.tabiya).count()
    
    print(f"Current database status:")
    print(f"  Puzzles: {puzzle_count}")
    print(f"  Tabiyas: {tabiya_count}")
    print()
    
    if puzzle_count == 0:
        print("No puzzles to delete.")
        return
    
    print(f"About to delete {puzzle_count} puzzle positions and their tag links.")
    print(f"Tabiyas ({tabiya_count} positions) will be preserved.")
    response = input("Continue? [y/N]: ")
    
    if response.lower() == 'y':
        # Get puzzle IDs for deletion
        puzzle_ids = [p.id for p in db.query(Position.id).filter(
            Position.position_type == PositionType.puzzle
        ).all()]
        
        # Delete position_tags entries (SQLAlchemy will handle cascades)
        # No need to manually delete from position_tags if CASCADE is set up properly
        
        # Delete positions
        deleted = db.query(Position).filter(
            Position.position_type == PositionType.puzzle
        ).delete(synchronize_session=False)
        
        db.commit()
        
        # Verify
        remaining_puzzles = db.query(Position).filter(
            Position.position_type == PositionType.puzzle
        ).count()
        remaining_tabiyas = db.query(Position).filter(
            Position.position_type == PositionType.tabiya
        ).count()
        
        print(f"Deleted {deleted} puzzles.")
        print(f"{remaining_tabiyas} tabiyas remain.")
        
        if remaining_puzzles > 0:
            print(f"WARNING: {remaining_puzzles} puzzles still exist!")
    else:
        print("Cancelled.")
    
    db.close()

if __name__ == "__main__":
    main()