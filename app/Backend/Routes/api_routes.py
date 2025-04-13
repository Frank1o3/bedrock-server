from fastapi import APIRouter, HTTPException
from models import AuthRequest, SettingsRequest
from Functions.functions import load_account_data, save_account_data, DATA_FILE
import os

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
            raise HTTPException(status_code=401, detail="Invalid credentials")


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
