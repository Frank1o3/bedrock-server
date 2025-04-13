#!/bin/bash

set -e

chmod +x /bedrock/backup.sh
chmod +x /bedrock/rollback.sh

VENV_DIR="${HOME}/venv"
REQUIREMENTS_FILE="${HOME}/Backend/requirements.txt"
MAIN_SCRIPT="${HOME}/Backend/Main.py"

# Create virtual environment if missing
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Activate it
source "$VENV_DIR/bin/activate"

# Upgrade pip & tools
pip install --upgrade pip setuptools wheel

# Install or update requirements
pip install --upgrade -r "$REQUIREMENTS_FILE"

# Run the main server control script
python3 "$MAIN_SCRIPT"
