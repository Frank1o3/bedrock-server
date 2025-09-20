#!/bin/bash

set -e

chmod +x /bedrock/backup.sh
chmod +x /bedrock/rollback.sh

VENV_DIR="${HOME}/venv"
REQUIREMENTS_FILE="${HOME}/backend/requirements.txt"
MAIN_SCRIPT="${HOME}/backend/main.py"

# Create virtual environment if missing
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Activate it
source "$VENV_DIR/bin/activate"

# Install or update requirements
pip install --upgrade -r "$REQUIREMENTS_FILE"

# Run the main server control script
"$VENV_DIR/bin/python" "$MAIN_SCRIPT"