import subprocess
import threading
import asyncio
import uvicorn
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json

app = FastAPI()
app.mount("/bedrock/static", StaticFiles(directory="static"), name="static")

# Start Bedrock server
bedrock_process = subprocess.Popen(
    ["/bin/bash", "/bedrock/start.sh"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=1
)

# Start Bash terminal inside the same container
bash_process = subprocess.Popen(
    ["/bin/bash"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=1
)

# WebSocket clients
clients = set()

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

# Function to broadcast messages to WebSocket clients


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


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    with open("static/index.html", "r") as f:
        return HTMLResponse(content=f.read())


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    try:
        while True:
            await asyncio.sleep(1)
    except:
        clients.discard(websocket)


class CommandRequest(BaseModel):
    command: str


@app.post("/send_command")
async def send_command(request: CommandRequest):
    """
    Sends a command to the Bedrock Server.
    """
    if bedrock_process.poll() is None:
        bedrock_process.stdin.write(f"{request.command}\n")
        bedrock_process.stdin.flush()
        return {"message": "Command sent to Bedrock server"}
    return {"error": "Bedrock server is not running"}


@app.post("/send_terminal_command")
async def send_terminal_command(request: CommandRequest):
    """
    Sends a command to the Bash Terminal.
    """
    if bash_process.poll() is None:
        bash_process.stdin.write(f"{request.command}\n")
        bash_process.stdin.flush()
        return {"message": "Command sent to Bash terminal"}
    return {"error": "Bash terminal is not running"}

# Start the log streaming threads
threading.Thread(target=lambda: asyncio.run(
    stream_bedrock_logs()), daemon=True).start()
threading.Thread(target=lambda: asyncio.run(
    stream_bash_logs()), daemon=True).start()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
