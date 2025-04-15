from Functions.functions import stream_bash_logs, stream_bedrock_logs, get_ip
from fastapi.staticfiles import StaticFiles
from Routes import web_routes, api_routes
from fastapi import FastAPI
import threading
import asyncio
import uvicorn

app = FastAPI()
app.mount(
    "/static", StaticFiles(directory="/home/server/frontend/static"), name="static")

app.include_router(web_routes.router)
app.include_router(api_routes.router)


if __name__ == "__main__":
    IP = get_ip()

    # Start the log streaming threads
    threading.Thread(target=lambda: asyncio.run(
        stream_bedrock_logs()), daemon=True).start()
    threading.Thread(target=lambda: asyncio.run(
        stream_bash_logs()), daemon=True).start()
    
    # Start the FastAPI server
    uvicorn.run(app, host=IP, port=5000)
