from fastapi.responses import HTMLResponse
from fastapi import APIRouter

router = APIRouter()


@router.get("/", response_class=HTMLResponse)
async def server_index():
    with open("/home/server/frontend/static/index.html", "r") as f:
        return HTMLResponse(content=f.read())
