#!/bin/bash

echo "Starting backup at $(date)" >> /backups/backup.log

# Set paths
WORLD_DIR="/bedrock/worlds/Main"
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_PATH="$BACKUP_DIR/Main-$TIMESTAMP"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Check if the world exists
if [ ! -d "$WORLD_DIR" ]; then
  echo "ERROR: World directory not found: $WORLD_DIR" >> "$BACKUP_DIR/backup.log"
  exit 1
fi

# Create a backup using rsync for better reliability
rsync -a "$WORLD_DIR/" "$BACKUP_PATH/" 2>> "$BACKUP_DIR/backup.log"

# Verify backup success
if [ $? -eq 0 ]; then
  echo "Backup created: $BACKUP_PATH" >> "$BACKUP_DIR/backup.log"
else
  echo "ERROR: Backup failed" >> "$BACKUP_DIR/backup.log"
  exit 1
fi

# Remove backups older than 1 hour
find "$BACKUP_DIR" -type d -name "Main-*" -mmin +60 -exec rm -rf {} \; 2>> "$BACKUP_DIR/backup.log"

echo "Backup completed at $(date)" >> "$BACKUP_DIR/backup.log"
