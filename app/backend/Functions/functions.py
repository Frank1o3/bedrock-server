from fastapi import WebSocket
from typing import Set
import subprocess
import asyncio
import socket
import psutil
import json
import os

DATA_FILE = "data.json"
clients: Set[WebSocket] = set()

bedrock_process = subprocess.Popen(
    ["/bin/bash", "/bedrock/start.sh"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=1,
)

# Start Bash terminal inside the same container
bash_process = subprocess.Popen(
    ["/bin/bash"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=1,
)


def start_bedrock_server():
    global bedrock_process

    # Ensure the previous process is completely stopped before starting a new one
    if bedrock_process is not None and bedrock_process.poll() is None:
        return  # Server is already running, do nothing

    # Start a new Bedrock server process
    bedrock_process = subprocess.Popen(
        ["/bin/bash", "/bedrock/start.sh"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )


def start_bash_console():
    global bash_process

    # Ensure the previous process is completely stopped before starting a new one
    if bash_process is not None and bash_process.poll() is None:
        return  # Server is already running, do nothing

    # Start a new Bedrock server process
    bash_process = subprocess.Popen(
        ["/bin/bash"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )


def check_account_created():
    account_data = load_account_data()
    return "first_user" in account_data


# Function to stream logs from Bedrock server
async def stream_bedrock_logs():
    loop = asyncio.get_running_loop()
    while True:
        line = await loop.run_in_executor(None, bedrock_process.stdout.readline)
        if line:
            await broadcast(line.strip(), "bedrock")
        await asyncio.sleep(0.1)


# Function to stream logs from the Bash terminal
async def stream_bash_logs():
    loop = asyncio.get_running_loop()
    while True:
        line = await loop.run_in_executor(None, bash_process.stdout.readline)
        if line:
            await broadcast(line.strip(), "bash")
        await asyncio.sleep(0.1)

async def broadcast(message: str, source: str):
    """
    Sends messages over WebSocket with a source identifier.
    `source` should be "bedrock" or "bash".
    """
    data = json.dumps({"source": source, "message": message})
    disconnected = []
    for client in clients:
        try:
            await client.send_text(data)
        except:
            disconnected.append(client)
    for client in disconnected:
        clients.remove(client)

def load_account_data():
    if not os.path.exists(DATA_FILE):
        return {}
    with open(DATA_FILE, "r") as f:
        return json.load(f)


def save_account_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=4)

def get_ip():
    """
    Get the IP address of the server.
    """
    interfaces = psutil.net_if_addrs()
    ethernet_ip = None
    wireless_ip = None

    for interface_name, interface_addresses in interfaces.items():
        for address in interface_addresses:
            if address.family == socket.AF_INET:
                if "eth" in interface_name.lower() or "en" in interface_name.lower():
                    ethernet_ip = address.address
                elif "wlan" in interface_name.lower() or "wl" in interface_name.lower():
                    wireless_ip = address.address
    if ethernet_ip:
        return ethernet_ip
    elif wireless_ip:
        return wireless_ip
    else:
        return "127.0.0.1"
