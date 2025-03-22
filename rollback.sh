#!/bin/bash

BACKUP_DIR="/backups"
WORLD_DIR="/worlds/Main"

# Ensure backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
  echo "ERROR: Backup directory not found: $BACKUP_DIR"
  exit 1
fi

# Find the latest backup
latest_backup=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "Main-*" | sort -r | head -n 1)

if [ -z "$latest_backup" ]; then
  echo "ERROR: No valid backup found in $BACKUP_DIR"
  ls -l "$BACKUP_DIR"  # Debugging output
  exit 1
fi

# Backup the current world before rollback
TEMP_BACKUP="${WORLD_DIR}_old_$(date +%Y-%m-%d_%H-%M-%S)"
mv "$WORLD_DIR" "$TEMP_BACKUP"

# Restore the latest backup
rsync -a --delete "$latest_backup/" "$WORLD_DIR/"

# Verify rollback success
if [ $? -eq 0 ]; then
  echo "Rollback successful! Restored from: $latest_backup"
  rm -rf "$TEMP_BACKUP"  # Remove old world backup after successful rollback
else
  echo "ERROR: Rollback failed! Restoring the previous world..."
  mv "$TEMP_BACKUP" "$WORLD_DIR"
  exit 1
fi
