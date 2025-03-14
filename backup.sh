#!/bin/bash

# Get the current timestamp
timestamp=$(date +%Y-%m-%d_%H-%M-%S)

# Define backup directory
backup_dir="/bedrock/backups"

# Create a backup folder if it doesn't exist
mkdir -p "$backup_dir"

# Check if the main world directory exists
if [ ! -d "/bedrock/worlds/Main" ]; then
  echo "ERROR: /bedrock/worlds/Main not found!" >> "$backup_dir/backup.log"
  exit 1
fi

# Remove backups older than 1 hour
find "$backup_dir" -type d -name "Main-*" -mmin +60 -exec rm -rf {} \; 2>> "$backup_dir/backup.log"

# Create a backup of the world (Main in this example)
cp -r /bedrock/worlds/Main "$backup_dir/Main-$timestamp" 2>> "$backup_dir/backup.log"

# Check for successful backup creation
if [ $? -eq 0 ]; then
  echo "Backup created: $backup_dir/Main-$timestamp" >> "$backup_dir/backup.log"
else
  echo "ERROR: Backup failed" >> "$backup_dir/backup.log"
  exit 1
fi
