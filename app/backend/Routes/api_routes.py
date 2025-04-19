from models import AuthRequest, SettingsRequest, ModRequest, ModResponce
from fastapi import APIRouter, HTTPException, Request, Response
from Shared.data import SESSION_STORE, SESSION_COOKIE_NAME
from Libs.ModLoader import ModManager
from Libs.Database import Database
from uuid import uuid4
import os

md = ModManager()
router = APIRouter()
db = Database()


@router.get("/auth/session")
async def get_session(request: Request):
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if session_token in SESSION_STORE:
        return {"authenticated": True, "username": SESSION_STORE[session_token]}
    return {"authenticated": False}


@router.post("/auth/login")
async def login_or_register(request: AuthRequest, response: Response):
    user = db.get_user(request.username)

    # LOGIN: if isLogin is True
    if request.login:
        if user:
            session_token = str(uuid4())
            SESSION_STORE[session_token] = request.username
            SESSION_STORE.pop(request.session_token, None)  # Remove old session token
            response.set_cookie(
                key=SESSION_COOKIE_NAME,
                value=session_token,
                httponly=True,
                secure=False,
                samesite="lax",
            )
            return {"success": True, "message": "Logged in"}
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # REGISTER: if not isLogin
    if user:
        raise HTTPException(status_code=400, detail="User already exists")

    # Determine rank (admin for first user)
    is_admin = len(db.get_all_users()) == 0
    rank = "admin" if is_admin else "user"

    # Create user with appropriate rank
    db.insert_user(request.username, request.password, rank)

    session_token = str(uuid4())
    SESSION_STORE[session_token] = request.username
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=False,
        samesite="lax",
    )
    return {"success": True, "message": "Account created", "username": request.username}


@router.get("/settings")
async def get_all_env_vars():
    """
    Fetch all environment variables if the user is authenticated.
    """
    # Authenticate user
    return {"env_vars": dict(os.environ)}


@router.post("/settings")
async def update_env_var(request: SettingsRequest):
    """
    Update a specific environment variable if the user is authenticated.
    """
    account_data = db.get_user(request.username, request.password)

    if request.username in account_data and request.password in account_data:
        env_var_name = request.option
        new_value = request.update

        if env_var_name not in os.environ:
            raise HTTPException(
                status_code=400, detail=f"Environment variable '{env_var_name}' does not exist.")

        # Update the environment variable inside the container
        os.environ[env_var_name] = new_value

        # Apply changes by restarting the container (Optional)

        return {"message": f"Environment variable '{env_var_name}' updated successfully."}

    raise HTTPException(status_code=401, detail="Invalid username or password")


@router.post("/mods/")
async def add(request: ModRequest):
    Type = request.requestType.lower()
    modId = request.modId
    # Mock data

    if Type == "available":
        BP, RP = md.list_all_mods()
        mods = BP + RP
        return {"mods": [ModResponce(id=mod.header.uuid.int, name=mod.header.name, Type="resource" if mod.dependencies is None else "behavior") for mod in mods]}
    elif Type == "active":
        BP, RP = md.list_all_active_mods()
        mods = BP + RP if BP and RP else []
        return {"mods": [ModResponce(id=uuid4().int, name=md.look_up(mod.pack_id).header.name, Type="resource" if md.look_up(mod.pack_id).dependencies is None else "behavior") for mod in mods]}

    return HTTPException(status_code=400)