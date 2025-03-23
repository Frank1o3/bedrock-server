import subprocess
import threading
import asyncio
import uvicorn
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI()
app.mount("/bedrock/static", StaticFiles(directory="static"), name="static")

# Start Bedrock server
process = subprocess.Popen(
    ["/bin/bash", "/bedrock/start.sh"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    bufsize=1
)

# WebSocket clients
clients = set()

# Function to stream logs


async def stream_logs():
    loop = asyncio.get_running_loop()
    while True:
        line = await loop.run_in_executor(None, process.stdout.readline)
        if line:
            await broadcast(line.strip())
        await asyncio.sleep(0.1)

# Function to broadcast logs to all clients


async def broadcast(message: str):
    disconnected = []
    for client in clients:
        try:
            await client.send_text(message)
        except Exception:
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
    except Exception:
        clients.discard(websocket)


class CommandRequest(BaseModel):
    command: str


@app.post("/send_command")
async def send_command(request: CommandRequest):
    if process.poll() is None:
        process.stdin.write(request.command + "\n")
        process.stdin.flush()
        return {"message": "Command sent"}
    return {"error": "Server is not running"}

# Start the log streaming thread
threading.Thread(target=lambda: asyncio.run(
    stream_logs()), daemon=True).start()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
