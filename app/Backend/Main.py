import threading
import asyncio
import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from Functions.functions import stream_bash_logs, stream_bedrock_logs
from Routes import web_routes, api_routes
import os



app = FastAPI()
app.mount(os.path.join(os.path.dirname(__file__), "static"),
          StaticFiles(directory="static"), name="static")

app.include_router(web_routes.router)
app.include_router(api_routes.router)

# Start the log streaming threads
threading.Thread(target=lambda: asyncio.run(
    stream_bedrock_logs()), daemon=True).start()
threading.Thread(target=lambda: asyncio.run(
    stream_bash_logs()), daemon=True).start()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
