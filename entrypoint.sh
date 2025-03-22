#!/bin/bash

# Define paths
BACKUP_DIR="/bedrock/backups"
WORLD_DIR="/bedrock/worlds"
WORLD_NAME="Main"

# Ensure No-IP DUC is installed and running
if ! command -v noip-duc &> /dev/null; then
    echo "No-IP DUC not found."
fi

# Configure and start No-IP DUC
if [ -n "$NO_IP_USERNAME" ] && [ -n "$NO_IP_PASSWORD" ]; then
    echo "Configuring No-IP DUC..."
else
    echo "No-IP credentials not set. Skipping update."
fi

# Handle rollback command
if [ "$1" == "rollback" ]; then
    echo "Rolling back to the latest backup..."
    pkill -f bedrock_server
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR/${WORLD_NAME}-"* | head -n 1)

    if [ -z "$LATEST_BACKUP" ]; then
        echo "No backup found!"
        exit 1
    fi

    echo "Restoring from: $LATEST_BACKUP"
    cp -r "$LATEST_BACKUP"/* "$WORLD_DIR/"
    rm -rf "$LATEST_BACKUP"

    echo "Restarting server..."
    # Activate the virtual environment
    source .venv/bin/activate
    .venv/bin/python /bedrock/tool.py
else
    echo "Starting Minecraft server..."
    # Activate the virtual environment
    source .venv/bin/activate
    .venv/bin/python /bedrock/tool.py
fi
