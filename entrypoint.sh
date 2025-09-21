#!/bin/bash
set -e

chmod +x /bedrock/backup.sh
chmod +x /bedrock/rollback.sh

# === Bedrock server setup ===
BEDROCK_DIR="/bedrock"
BEDROCK_ZIP="bedrock-server.zip"
BEDROCK_BIN="${BEDROCK_DIR}/bedrock_server"
BEDROCK_URL="https://www.minecraft.net/bedrockdedicatedserver/bin-linux/bedrock-server-${BEDROCK_VERSION}.zip"

if [ ! -f "$BEDROCK_BIN" ]; then
    echo "Bedrock server binary not found. Downloading version ${BEDROCK_VERSION}..."
    cd "$BEDROCK_DIR"
    curl -L -A "bedrock-server.zip" -o "$BEDROCK_ZIP" "$BEDROCK_URL"
    unzip -o "$BEDROCK_ZIP"
    rm "$BEDROCK_ZIP"
    chmod +x "$BEDROCK_BIN"
    echo "Bedrock server ${BEDROCK_VERSION} installed."
fi

# === No-IP DUC setup ===
NOIP_DIR="/home/server/noip-duc"
NOIP_DEB="noip-duc_3.3.0_amd64.deb"
NOIP_URL="https://www.noip.com/download/linux/latest"

if [ ! -d "$NOIP_DIR" ]; then
    echo "No-IP DUC not found. Downloading and installing..."
    cd /home/server
    wget --content-disposition "$NOIP_URL"
    tar xf noip-duc_*.tar.gz
    cd noip-duc_*/binaries
    sudo apt-get update
    sudo apt-get install -y "./${NOIP_DEB}"
    echo "No-IP DUC installed."
fi

# === Python environment setup ===
VENV_DIR="${HOME}/venv"
REQUIREMENTS_FILE="${HOME}/backend/requirements.txt"
MAIN_SCRIPT="${HOME}/backend/main.py"

if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
pip install --upgrade -r "$REQUIREMENTS_FILE"

exec "$VENV_DIR/bin/python" "$MAIN_SCRIPT"
