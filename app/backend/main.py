"""
Main backend application for managing the Bedrock server and Bash terminal.
Handles WebSocket connections, command execution, and log streaming.
"""

import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Set

import uvicorn
from fastapi import FastAPI, Request, WebSocket
from fastapi.staticfiles import StaticFiles
from Functions.functions import get_ip
from Libs.database import Database
from Routes import api_routes, web_routes
from Shared.data import SESSION_STORE

# Ensure the current directory is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Add the Functions, Libs, Routes and Shared directories with their files to sys.path
sys.path.append(os.path.join(os.path.dirname(
    os.path.abspath(__file__)), 'Functions'))
sys.path.append(os.path.join(os.path.dirname(
    os.path.abspath(__file__)), 'Libs'))
sys.path.append(os.path.join(os.path.dirname(
    os.path.abspath(__file__)), 'Routes'))
sys.path.append(os.path.join(os.path.dirname(
    os.path.abspath(__file__)), 'Shared'))

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

    if bedrock_process is not None and bedrock_process.poll() is None:
        return  # Server already running

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

    if bash_process is not None and bash_process.poll() is None:
        return  # Bash already running

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
        if bedrock_process and bedrock_process.poll() is None:
            try:
                if bedrock_process.stdout is not None:
                    bedrock_line = await loop.run_in_executor(
                        None, bedrock_process.stdout.readline
                    )
                    if bedrock_line and bedrock_line.strip():
                        print(f"Bedrock Output: {bedrock_line.strip()}")
                        await broadcast_to_bedrock(bedrock_line)

                if bedrock_process.stderr is not None:
                    bedrock_error = await loop.run_in_executor(
                        None, bedrock_process.stderr.readline
                    )
                    if bedrock_error and bedrock_error.strip():
                        print(f"Bedrock Error: {bedrock_error.strip()}")
                        await broadcast_to_bedrock(f"[ERROR] {bedrock_error}")
            except Exception as e:
                print(f"Error reading bedrock logs: {e}")
        await asyncio.sleep(0.1)


async def stream_bash_logs():
    """Stream logs from Bash terminal to bash clients only"""
    global bash_process
    loop = asyncio.get_running_loop()
    while True:
        if bash_process and bash_process.poll() is None:
            try:
                if bash_process.stdout is not None:
                    bash_line = await loop.run_in_executor(
                        None, bash_process.stdout.readline
                    )
                    if bash_line and bash_line.strip():
                        print(f"Bash Output: {bash_line.strip()}")
                        await broadcast_to_bash(bash_line)

                if bash_process.stderr is not None:
                    bash_error = await loop.run_in_executor(
                        None, bash_process.stderr.readline
                    )
                    if bash_error and bash_error.strip():
                        print(f"Bash Error: {bash_error.strip()}")
                        await broadcast_to_bash(f"[ERROR] {bash_error}")
            except Exception as e:
                print(f"Error reading bash logs: {e}")
        await asyncio.sleep(0.1)


async def broadcast_to_bedrock(message: str):
    """Send messages only to bedrock WebSocket clients"""
    global bedrock_clients
    if not message.strip():
        return

    data = json.dumps({"source": "bedrock", "message": message})
    disconnected = []
    for client in bedrock_clients:
        try:
            await client.send_text(data)
        except Exception:
            disconnected.append(client)

    for client in disconnected:
        bedrock_clients.discard(client)


async def broadcast_to_bash(message: str):
    """Send messages only to bash WebSocket clients"""
    global bash_clients
    if not message.strip():
        return

    data = json.dumps({"source": "bash", "message": message})
    disconnected = []
    for client in bash_clients:
        try:
            await client.send_text(data)
        except Exception:
            disconnected.append(client)

    for client in disconnected:
        bash_clients.discard(client)


@app.websocket("/ws/bedrock")
async def bedrock_terminal_endpoint(websocket: WebSocket):
    global bedrock_clients
    await websocket.accept()
    bedrock_clients.add(websocket)
    try:
        while True:
            await asyncio.sleep(1)
    finally:
        bedrock_clients.discard(websocket)


@app.websocket("/ws/bash")
async def bash_terminal_endpoint(websocket: WebSocket):
    global bash_clients
    await websocket.accept()
    bash_clients.add(websocket)
    try:
        while True:
            await asyncio.sleep(1)
    finally:
        bash_clients.discard(websocket)


@app.post("/send_command")
async def send_command(request: Request):
    global bedrock_process

    body = await request.json()
    command: str = body["command"]
    session_token = request.cookies.get("session_token")
    print(
        f"Bedrock PID: {bedrock_process.pid}, Running: {bedrock_process.poll() is None} Command: {command}"
    )

    if session_token is None:
        return {"error": "Invalid credentials", "success": False}
    username = SESSION_STORE.get(session_token)

    user_data = db.get_user(username.username if username else None)
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
    global bash_process

    body = await request.json()
    command: str = body["command"]
    session_token = request.cookies.get("session_token")

    print(
        f"Bash PID: {bash_process.pid}, Running: {bash_process.poll() is None} Command: {command}"
    )

    if session_token is None:
        return {"error": "Invalid credentials", "success": False}
    username = SESSION_STORE.get(session_token)

    user_data = db.get_user(username.username if username else None)
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
        f"Bedrock PID: {bedrock_process.pid}, Running: {bedrock_process.poll() is None}"
    )
    print(
        f"Bash PID: {bash_process.pid}, Running: {bash_process.poll() is None}"
    )

    body = await request.json()
    command: str = body["command"]
    session_token = request.cookies.get("session_token")

    if session_token is None:
        return {"error": "Invalid credentials", "success": False}
    username = SESSION_STORE.get(session_token)

    user_data = db.get_user(username.username if username else None)
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
        if bash_process and bash_process.poll() is None:
            bash_process.kill()
            return {"message": "Stop command sent to Bash terminal"}
    return {"error": "Invalid command. Use 'start' or 'stop'."}



# === Lifespan context for startup/shutdown ===
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting bedrock log streaming...")
    bedrock_task = asyncio.create_task(stream_bedrock_logs())
    print("Starting bash log streaming...")
    bash_task = asyncio.create_task(stream_bash_logs())
    try:
        yield
    finally:
        global bedrock_process, bash_process
        print("Shutting down processes...")
        if bedrock_process and bedrock_process.poll() is None:
            bedrock_process.kill()
        if bash_process and bash_process.poll() is None:
            bash_process.kill()
        # Optionally cancel log streaming tasks
        bedrock_task.cancel()
        bash_task.cancel()

app.router.lifespan_context = lifespan


if __name__ == "__main__":
    IP = get_ip() or "0.0.0.0"
    uvicorn.run(app, host=IP, port=5000)
