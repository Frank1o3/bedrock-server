from fastapi import APIRouter, HTTPException
from models import AuthRequest, SettingsRequest, ModRequest, ModResponce
from Functions.functions import load_account_data, save_account_data
from Libs.ModLoader import ModManager
from uuid import uuid4
import os

md = ModManager()
router = APIRouter()


@router.post("/auth")
async def handle_cookie(request: AuthRequest):
    account_data = load_account_data()
    username = request.username
    password = request.password

    if request.cookie:
        # Load account data from the file (data.json)
        account_data = load_account_data()

        # Check if the account already exists
        if username in account_data:
            return {"accountCreated": True}  # User already exists

        # Add new user if they don't exist
        account_data[username] = {"password": password}
        save_account_data(account_data)  # Save updated account data to file

        return {"accountCreated": True}  # Successfully created account
    else:
        # Authenticate user
        if request.username in account_data and account_data[request.username]["password"] == request.password:
            return {"authenticated": True}
        else:
            return {"authenticated": False}


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
    account_data = load_account_data()

    if request.username in account_data and account_data[request.username]["password"] == request.password:
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
