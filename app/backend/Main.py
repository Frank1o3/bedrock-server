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


clients: Set[WebSocket] = set()
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


# Function to stream logs from Bedrock server
async def stream_bedrock_logs():
    global bedrock_process
    loop = asyncio.get_running_loop()
    while True:
        line = await loop.run_in_executor(None, bedrock_process.stdout.readline)
        if line:
            await broadcast(line.strip(), "bedrock")
        await asyncio.sleep(0.1)


# Function to stream logs from the Bash terminal
async def stream_bash_logs():
    global bash_process
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
    global clients
    data = json.dumps({"source": source, "message": message})
    disconnected = []
    for client in clients:
        try:
            await client.send_text(data)
        except:
            disconnected.append(client)
    for client in disconnected:
        clients.remove(client)


@app.websocket("/ws")
async def terminals_endpoint(websocket: WebSocket):
    global clients
    await websocket.accept()
    clients.add(websocket)
    try:
        while True:
            await asyncio.sleep(1)
    except:
        if websocket in clients:
            clients.discard(websocket)


@app.post("/send_command")
async def send_command(request: Request):
    """
    Sends a command to the Bedrock Server.
    """
    global bedrock_process

    body = await request.json()
    command: str = body["command"]
    session_token = request.cookies.get("session_token")

    username = SESSION_STORE.get(session_token)
    user_data = db.get_user(username)
    if user_data is None:
        return {"error": "Invalid credentials", "success": False}
    elif "admin" not in user_data:
        return {"error": "You don't have permission to execute this command.", "success": False}

    if bedrock_process.poll() is None:
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

    username = SESSION_STORE.get(session_token)
    user_data = db.get_user(username)
    if user_data is None:
        return {"error": "Invalid credentials", "success": False}
    elif "admin" not in user_data:
        return {"error": "You don't have permission to execute this command.", "success": False}

    if bash_process.poll() is None:
        bash_process.stdin.write(f"{command}\n")
        bash_process.stdin.flush()
        return {"message": "Command sent to Bash terminal", "success": True}
    return {"error": "Bash terminal is not running", "success": False}


@app.post("/server_command")
async def server_command(request: Request):
    global bedrock_process, bash_process

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
        if bedrock_process and bedrock_process.poll() is None:
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


if __name__ == "__main__":
    IP = get_ip()

    # Start the log streaming threads
    threading.Thread(target=lambda: asyncio.run(
        stream_bedrock_logs()), daemon=True).start()
    threading.Thread(target=lambda: asyncio.run(
        stream_bash_logs()), daemon=True).start()

    # Start the FastAPI server
    uvicorn.run(app, host=IP, port=5000)
