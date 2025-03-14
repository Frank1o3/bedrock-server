#!/bin/bash

# Get the most recent backup
latest_backup=$(ls -t /bedrock/backups/Main-* | head -n 1)

if [ -z "$latest_backup" ]; then
  echo "No backup found!"
  exit 1
fi

# Replace the current world with the latest backup
echo "Rolling back to the latest backup: $latest_backup"
rm -rf /bedrock/worlds/Main
cp -r "$latest_backup" /bedrock/worlds/Main

echo "Rollback complete!"

# Start the server again
./start.sh
