from fastapi.staticfiles import StaticFiles
from Routes import web_routes, api_routes
from Functions.functions import get_ip
from fastapi import FastAPI, WebSocket
from Shared.data import SESSION_STORE
from Libs.Database import Database
from fastapi import Request
from pathlib import Path
from typing import Set
import subprocess
import threading
import asyncio
import uvicorn
import json
import os


bedrock_clients: Set[WebSocket] = set()
bash_clients: Set[WebSocket] = set()
home_dir = Path.home()

db = Database()

app = FastAPI()

app.mount(
    "/static", StaticFiles(directory=os.path.join(home_dir, "frontend/static")), name="static")

app.include_router(web_routes.router)
app.include_router(api_routes.router, prefix="/api", tags=["api"])

bedrock_process = subprocess.Popen(
    ["/bin/bash", "/bedrock/start.sh"],
    stdin=subprocess.PIPE,  # Ensure stdin is set to PIPE
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=1,
)

# Start Bash terminal inside the same container
bash_process = subprocess.Popen(
    ["/bin/bash"],
    stdin=subprocess.PIPE,  # Ensure stdin is set to PIPE
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


async def stream_bedrock_logs():
    """Stream logs from Bedrock server to bedrock clients only"""
    global bedrock_process
    loop = asyncio.get_running_loop()
    while True:
        if bedrock_process and bedrock_process.poll() is None:  # Check if process is still running
            try:
                # Read stdout
                if bedrock_process.stdout is not None:
                    bedrock_line = await loop.run_in_executor(
                        None, bedrock_process.stdout.readline)
                    if bedrock_line and bedrock_line.strip():
                        await broadcast_to_bedrock(bedrock_line.strip())
                
                # Read stderr
                if bedrock_process.stderr is not None:
                    bedrock_error = await loop.run_in_executor(
                        None, bedrock_process.stderr.readline)
                    if bedrock_error and bedrock_error.strip():
                        await broadcast_to_bedrock(f"[ERROR] {bedrock_error.strip()}")
            except Exception as e:
                print(f"Error reading bedrock logs: {e}")
        await asyncio.sleep(0.1)


async def stream_bash_logs():
    """Stream logs from Bash terminal to bash clients only"""
    global bash_process
    loop = asyncio.get_running_loop()
    while True:
        if bash_process and bash_process.poll() is None:  # Check if process is still running
            try:
                # Read stdout
                if bash_process.stdout is not None:
                    bash_line = await loop.run_in_executor(
                        None, bash_process.stdout.readline)
                    if bash_line and bash_line.strip():
                        await broadcast_to_bash(bash_line.strip())
                
                # Read stderr
                if bash_process.stderr is not None:
                    bash_error = await loop.run_in_executor(
                        None, bash_process.stderr.readline)
                    if bash_error and bash_error.strip():
                        await broadcast_to_bash(f"[ERROR] {bash_error.strip()}")
            except Exception as e:
                print(f"Error reading bash logs: {e}")
        await asyncio.sleep(0.1)


async def broadcast_to_bedrock(message: str):
    """Send messages only to bedrock WebSocket clients"""
    global bedrock_clients
    if not message.strip():  # Skip empty messages
        return
    
    data = json.dumps({"source": "bedrock", "message": message})
    disconnected = []
    for client in bedrock_clients.copy():  # Use copy to avoid modification during iteration
        try:
            await client.send_text(data)
        except Exception:
            disconnected.append(client)
    
    # Remove disconnected clients
    for client in disconnected:
        bedrock_clients.discard(client)


async def broadcast_to_bash(message: str):
    """Send messages only to bash WebSocket clients"""
    global bash_clients
    if not message.strip():  # Skip empty messages
        return
    
    data = json.dumps({"source": "bash", "message": message})
    disconnected = []
    for client in bash_clients.copy():  # Use copy to avoid modification during iteration
        try:
            await client.send_text(data)
        except Exception:
            disconnected.append(client)
    
    # Remove disconnected clients
    for client in disconnected:
        bash_clients.discard(client)


@app.websocket("/ws/bedrock")
async def bedrock_terminal_endpoint(websocket: WebSocket):
    """WebSocket endpoint specifically for bedrock server logs"""
    global bedrock_clients
    await websocket.accept()
    bedrock_clients.add(websocket)
    try:
        while True:
            await asyncio.sleep(1)
    except Exception:
        pass
    finally:
        bedrock_clients.discard(websocket)


@app.websocket("/ws/bash")
async def bash_terminal_endpoint(websocket: WebSocket):
    """WebSocket endpoint specifically for bash terminal logs"""
    global bash_clients
    await websocket.accept()
    bash_clients.add(websocket)
    try:
        while True:
            await asyncio.sleep(1)
    except Exception:
        pass
    finally:
        bash_clients.discard(websocket)


@app.post("/send_command")
async def send_command(request: Request):
    """
    Sends a command to the Bedrock Server.
    """
    global bedrock_process

    body = await request.json()
    command: str = body["command"]
    session_token = request.cookies.get("session_token")
    print(
        f"Bedrock PID: {bedrock_process.pid}, Running: {bedrock_process.poll() is None} Command: {command}")

    username = SESSION_STORE.get(session_token)
    user_data = db.get_user(username)
    if user_data is None:
        return {"error": "Invalid credentials", "success": False}
    elif "admin" not in user_data:
        return {"error": "You don't have permission to execute this command.", "success": False}

    if bedrock_process and bedrock_process.stdin and bedrock_process.poll() is None:
        bedrock_process.stdin.write(f"{command}\n")
        bedrock_process.stdin.flush()
        return {"message": "Command sent to Bedrock server", "success": True}
    return {"error": "Bedrock server is not running", "success": False}


@app.post("/send_terminal_command")
async def send_terminal_command(request: Request):
    """
    Sends a command to the Bash Terminal.
    """
    global bash_process

    body = await request.json()
    command: str = body["command"]
    session_token = request.cookies.get("session_token")

    print(
        f"Bash PID: {bash_process.pid}, Running: {bash_process.poll() is None} Command: {command}")

    username = SESSION_STORE.get(session_token)
    user_data = db.get_user(username)
    if user_data is None:
        return {"error": "Invalid credentials", "success": False}
    elif "admin" not in user_data:
        return {"error": "You don't have permission to execute this command.", "success": False}

    if bash_process and bash_process.stdin and bash_process.poll() is None:
        bash_process.stdin.write(f"{command}\n")
        bash_process.stdin.flush()
        return {"message": "Command sent to Bash terminal", "success": True}
    return {"error": "Bash terminal is not running", "success": False}


@app.post("/server_command")
async def server_command(request: Request):
    global bedrock_process, bash_process
    print(
        f"Bedrock PID: {bedrock_process.pid}, Running: {bedrock_process.poll() is None}")
    print(
        f"Bash PID: {bash_process.pid}, Running: {bash_process.poll() is None}")

    body = await request.json()
    command: str = body["command"]
    session_token = request.cookies.get("session_token")

    username = SESSION_STORE.get(session_token)
    user_data = db.get_user(username)
    if user_data is None:
        return {"error": "Invalid credentials", "success": False}
    elif "admin" not in user_data:
        return {"error": "You don't have permission to execute this command.", "success": False}

    if command.lower() == "stop":
        if bedrock_process and bedrock_process.stdin and bedrock_process.poll() is None:
            bedrock_process.stdin.write("stop\n")
            bedrock_process.stdin.flush()
            return {"message": "Stop command sent to Bedrock server", "success": True}
        return {"error": "Bedrock server is not running", "success": False}

    elif command.lower() == "start":
        start_bedrock_server()
        return {"message": "Bedrock server started"}
    elif command.lower() == "start bash":
        start_bash_console()
        return {"message": "Bash terminal started"}
    elif command.lower() == "stop bash":
        if bash_process and bash_process.stdin and bash_process and bash_process.poll() is None:
            bash_process.kill()
            return {"message": "Stop command sent to Bash terminal"}
    return {"error": "Invalid command. Use 'start' or 'stop'."}


if __name__ == "__main__":
    IP = get_ip() or "0.0.0.0"

    print("Starting bedrock log streaming...")
    threading.Thread(target=lambda: asyncio.run(
        stream_bedrock_logs()), daemon=True).start()
    
    print("Starting bash log streaming...")
    threading.Thread(target=lambda: asyncio.run(
        stream_bash_logs()), daemon=True).start()

    print("Starting web server...")
    # Start the FastAPI server
    uvicorn.run(app, host=IP, port=5000)
