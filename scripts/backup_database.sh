#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$HOME/Droppbox/programming/projects/chessquiz"
DB_FILE="$PROJECT_ROOT/chessquiz.db"
BACKUP_DIR="$PROJECT_ROOT/backups"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/chessquiz-$TIMESTAMP.db"

# Use Python + SQLite's native backup API (safer than cp for live databases)
python3 -c "
import sqlite3
src = sqlite3.connect('$DB_FILE')
dst = sqlite3.connect('$BACKUP_FILE')
src.backup(dst)
src.close()
dst.close()
"

# Prune old backups beyond retention window
find "$BACKUP_DIR" -name "chessquiz-*.db" -mtime +$RETENTION_DAYS -delete

echo "Backup created: $BACKUP_FILE"
echo "Retained backups:"
ls -lht "$BACKUP_DIR"/chessquiz-*.db 2>/dev/null | head -5 || echo "  No backups found yet"