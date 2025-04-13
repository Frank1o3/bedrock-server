from Functions.functions import (start_bedrock_server,
                                 start_bash_console,
                                 load_account_data,
                                 clients,
                                 bedrock_process,bash_process
                                 )
from fastapi import APIRouter, WebSocket, HTTPException
from fastapi.responses import HTMLResponse
from models import CommandRequest
import asyncio

router = APIRouter()

@router.get("/", response_class=HTMLResponse)
async def server_index():
    with open("static/index.html", "r") as f:
        return HTMLResponse(content=f.read())


@router.websocket("/ws")
async def terminals_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    try:
        while True:
            await asyncio.sleep(1)
    except:
        if websocket in clients:
            clients.discard(websocket)


@router.post("/send_command")
async def send_command(request: CommandRequest):
    """
    Sends a command to the Bedrock Server.
    """
    account_data = load_account_data()

    if request.username in account_data and account_data[request.username]["password"] == request.password:
        if bedrock_process.poll() is None:
            bedrock_process.stdin.write(f"{request.command}\n")
            bedrock_process.stdin.flush()
            return {"message": "Command sent to Bedrock server"}
        return {"error": "Bedrock server is not running"}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/send_terminal_command")
async def send_terminal_command(request: CommandRequest):
    """
    Sends a command to the Bash Terminal.
    """
    account_data = load_account_data()

    if request.username in account_data and account_data[request.username]["password"] == request.password:
        if bash_process.poll() is None:
            bash_process.stdin.write(f"{request.command}\n")
            bash_process.stdin.flush()
            return {"message": "Command sent to Bash terminal"}
        return {"error": "Bash terminal is not running"}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/server_command")
async def server_command(request: CommandRequest):
    global bedrock_process, bash_process
    account_data = load_account_data()

    if request.username in account_data and account_data[request.username]["password"] == request.password:
        if request.command.lower() == "stop":
            if bedrock_process and bedrock_process.poll() is None:
                bedrock_process.stdin.write("stop\n")
                bedrock_process.stdin.flush()
                return {"message": "Stop command sent to Bedrock server"}
            return {"error": "Bedrock server is not running"}
        elif request.command.lower() == "start":
            start_bedrock_server()
            return {"message": "Bedrock server started"}
        elif request.command.lower() == "start bash":
            start_bash_console()
            return {"message": "Bash terminal started"}
        elif request.command.lower() == "stop bash":
            if bash_process and bash_process.poll() is None:
                bash_process.kill()
                return {"message": "Stop command sent to Bash terminal"}
        return {"error": "Invalid command. Use 'start' or 'stop'."}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")
