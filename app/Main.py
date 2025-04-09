import subprocess
import threading
import asyncio
import uvicorn
from fastapi import FastAPI, WebSocket, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json

app = FastAPI()
app.mount("/bedrock/static", StaticFiles(directory="static"), name="static")

# Start Bedrock server


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

# WebSocket clients
clients: set[WebSocket] = set()


class CommandRequest(BaseModel):
    command: str


class AuthRequest(BaseModel):
    username: str
    password: str


# Load account data from file (data.json)
def load_account_data():
    try:
        with open("./data.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def save_account_data(data):
    with open("./data.json", "w") as f:
        json.dump(data, f)


# Check if account is created (only the first user can access)


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


# Fetch server No-IP IP


def fetch_noip_ip():
    # Example command to fetch No-IP IP (replace with actual logic)
    return "multidot.ddns.net"


# Update No-IP credentials via bash command (assuming stored in some config file)


def update_noip_credentials(username, password):
    # Example of running bash commands to update credentials (replace with actual logic)
    if bash_process.poll() is None:
        bash_process.stdin.write(
            f"export NO_IP_USERNAME={username}\nexport NO_IP_PASSWORD={password}\n"
        )
        bash_process.stdin.flush()


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

# Cookie handling (check account creation)


@app.post("/cookie")
async def handle_cookie(request: Request):
    data = await request.json()
    username = data.get("username")
    password = data.get("password")

    # Load account data from the file (data.json)
    account_data = load_account_data()

    # Check if the account already exists
    if username in account_data:
        return {"accountCreated": True}  # User already exists

    # Add new user if they don't exist
    account_data[username] = {"password": password}
    save_account_data(account_data)  # Save updated account data to file

    return {"accountCreated": True}  # Successfully created account



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


@app.post("/server_command")
async def server_command(request: CommandRequest):
    global bedrock_process

    if request.command.lower() == "stop":
        if bedrock_process and bedrock_process.poll() is None:
            bedrock_process.stdin.write("stop\n")
            bedrock_process.stdin.flush()
            return {"message": "Stop command sent to Bedrock server"}
        return {"error": "Bedrock server is not running"}

    elif request.command.lower() == "start":
        start_bedrock_server()
        return {"message": "Bedrock server started"}

    return {"error": "Invalid command. Use 'start' or 'stop'."}


@app.get("/settings")
async def get_settings(auth: AuthRequest):
    """
    Returns server settings if the user is authenticated with correct username and password.
    """
    account_data = load_account_data()

    # Authenticate user by username and password
    if auth.username in account_data and account_data[auth.username]["password"] == auth.password:
        ip = fetch_noip_ip()
        return {"ip": ip}
    else:
        raise HTTPException(
            status_code=401, detail="Invalid username or password")

@app.post("/update_noip")
async def update_noip(auth: AuthRequest, request: Request):
    """
    Updates the No-IP credentials with the provided username and password.
    """
    account_data = load_account_data()

    # Authenticate user by username and password
    if auth.username in account_data and account_data[auth.username]["password"] == auth.password:
        data = await request.json()
        username = data.get("username")
        password = data.get("password")
        update_noip_credentials(username, password)
        return {"message": "No-IP credentials updated successfully."}
    else:
        raise HTTPException(
            status_code=401, detail="Invalid username or password")


# Start the log streaming threads
threading.Thread(target=lambda: asyncio.run(
    stream_bedrock_logs()), daemon=True).start()
threading.Thread(target=lambda: asyncio.run(
    stream_bash_logs()), daemon=True).start()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
