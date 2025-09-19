from models import (
    AuthRequest, SettingsRequest, ModRequest, ModResponce,
    SessionResponse, ServerStatusResponse, UserProfileResponse, 
    SettingsUpdateRequest, LogoutRequest
)
from fastapi import APIRouter, HTTPException, Request, Response
from Shared.data import (
    SESSION_STORE, SESSION_COOKIE_NAME, SessionData,
    create_session, get_session, invalidate_session, cleanup_expired_sessions
)
from Libs.ModLoader import ModManager
from Libs.Database import Database
import os
import subprocess
import psutil
from datetime import datetime

md = ModManager()
router = APIRouter()
db = Database()


def require_auth(request: Request, require_admin: bool = False) -> SessionData:
    """Helper function to check authentication and optionally admin role"""
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = get_session(session_token)
    if not session:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    
    if require_admin and session.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return session


def get_server_status() -> dict:
    """Get current server status information"""
    try:
        # Check if bedrock server process is running (basic check)
        server_online = False
        uptime = None
        
        # Look for bedrock server process
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time']):
            try:
                if 'bedrock_server' in proc.info['name'] or \
                   any('bedrock' in str(cmd).lower() for cmd in proc.info.get('cmdline', [])):
                    server_online = True
                    create_time = datetime.fromtimestamp(proc.info['create_time'])
                    uptime = str(datetime.now() - create_time).split('.')[0]
                    break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        return {
            "server_online": server_online,
            "uptime": uptime,
            "player_count": None,  # Would need to parse server logs for this
            "max_players": None,   # Would need to parse server.properties
            "world_name": "Main"   # Default world name
        }
    except Exception as e:
        print(f"Error getting server status: {e}")
        return {
            "server_online": False,
            "uptime": None,
            "player_count": None,
            "max_players": None,
            "world_name": "Main"
        }


@router.get("/auth/session")
async def check_session(request: Request) -> SessionResponse:
    """Check if the user is authenticated and return session details"""
    # Clean up expired sessions first
    cleanup_expired_sessions()
    
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_token:
        return SessionResponse(
            success=False,
            authenticated=False,
            message="No session token provided"
        )
    
    session = get_session(session_token)
    if session:
        return SessionResponse(
            success=True,
            authenticated=True,
            username=session.username,
            role=session.role,
            message="Authenticated"
        )
    else:
        return SessionResponse(
            success=False,
            authenticated=False,
            message="Session expired or invalid"
        )


@router.post("/auth/login")
async def login_or_register(request: AuthRequest) -> SessionResponse:
    """Handle both login and registration with enhanced security"""
    cleanup_expired_sessions()
    
    if request.login:
        # LOGIN PROCESS
        user_data = db.get_user(request.username, request.password)  # Verify password
        if not user_data:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Get user role from database result
        user_id, username, password, role = user_data
        
        # Create new session (this will invalidate any existing session for this user)
        session_token = create_session(username, role)
        
        # Set secure cookie
        response = Response(content=SessionResponse(
            success=True,
            authenticated=True,
            username=username,
            role=role,
            message="Successfully logged in"
        ).model_dump_json())
        
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_token,
            httponly=True,
            secure=True,  # Secure cookie: Only sent via HTTPS
            samesite="lax",
            max_age=3600  # 1 hour
        )
        response.headers["Content-Type"] = "application/json"
        
        return response
    
    else:
        # REGISTRATION PROCESS
        existing_user = db.get_user(request.username)
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Check if this is the first user (becomes admin)
        all_users = db.get_all_users()
        is_first_user = len(all_users) == 0
        role = "admin" if is_first_user else "user"
        
        # Create the user
        user_id = db.insert_user(request.username, request.password, role)
        if not user_id:
            raise HTTPException(status_code=500, detail="Failed to create user")
        
        # Create session for the new user
        session_token = create_session(request.username, role)
        
        # Set secure cookie
        response = Response(content=SessionResponse(
            success=True,
            authenticated=True,
            username=request.username,
            role=role,
            message=f"Account created successfully. Role: {role}"
        ).model_dump_json())
        
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_token,
            httponly=True,
            secure=True,  # Secure cookie: Only sent via HTTPS
            samesite="lax",
            max_age=3600  # 1 hour
        )
        response.headers["Content-Type"] = "application/json"
        
        return response


@router.post("/auth/logout")
async def logout(request: Request) -> dict:
    """Logout and invalidate session"""
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if session_token:
        invalidate_session(session_token)
    
    response = Response(content='{"success": true, "message": "Logged out successfully"}')
    response.delete_cookie(SESSION_COOKIE_NAME, secure=True)
    response.headers["Content-Type"] = "application/json"
    return response


@router.get("/server/status")
async def server_status(request: Request) -> ServerStatusResponse:
    """Get server status - accessible to all authenticated users"""
    session = require_auth(request, require_admin=False)
    status = get_server_status()
    return ServerStatusResponse(**status)


@router.get("/user/profile")
async def user_profile(request: Request) -> UserProfileResponse:
    """Get current user's profile information"""
    session = require_auth(request, require_admin=False)
    
    # Get user data from database
    user_data = db.get_user(session.username)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserProfileResponse(
        username=session.username,
        role=session.role,
        created_at=session.created_at.isoformat(),
        last_login=session.last_activity.isoformat()
    )


@router.get("/settings")
async def get_server_settings(request: Request):
    """Get server settings - admin only"""
    session = require_auth(request, require_admin=True)
    
    # Return selected environment variables and server config
    safe_env_vars = {
        key: value for key, value in os.environ.items() 
        if key in ['NO_IP_USERNAME', 'SERVER_NAME', 'GAMEMODE', 'DIFFICULTY', 
                   'MAX_PLAYERS', 'ALLOW_CHEATS', 'LEVEL_NAME']
    }
    
    # Read server.properties if it exists
    server_props = {}
    server_props_path = "/bedrock/server.properties"
    if os.path.exists(server_props_path):
        try:
            with open(server_props_path, 'r') as f:
                for line in f:
                    if '=' in line and not line.strip().startswith('#'):
                        key, value = line.strip().split('=', 1)
                        server_props[key] = value
        except Exception as e:
            print(f"Error reading server.properties: {e}")
    
    return {
        "env_vars": safe_env_vars,
        "server_properties": server_props,
        "success": True
    }


@router.post("/settings/update")
async def update_server_setting(request: Request):
    """Update a server setting - admin only"""
    session = require_auth(request, require_admin=True)
    
    try:
        body = await request.json()
        setting_key = body.get("setting_key")
        setting_value = body.get("setting_value")
        setting_type = body.get("setting_type", "env")  # 'env' or 'server_prop'
        
        if not setting_key:
            raise HTTPException(status_code=400, detail="Setting key is required")
        
        if setting_type == "env":
            # Update environment variable
            safe_env_keys = ['NO_IP_USERNAME', 'SERVER_NAME', 'GAMEMODE', 'DIFFICULTY', 
                           'MAX_PLAYERS', 'ALLOW_CHEATS', 'LEVEL_NAME']
            
            if setting_key not in safe_env_keys:
                raise HTTPException(status_code=403, detail="This environment variable cannot be modified")
            
            os.environ[setting_key] = str(setting_value)
            message = f"Environment variable '{setting_key}' updated successfully"
            
        elif setting_type == "server_prop":
            # Update server.properties file
            server_props_path = "/bedrock/server.properties"
            if not os.path.exists(server_props_path):
                raise HTTPException(status_code=404, detail="server.properties file not found")
            
            # Read current properties
            lines = []
            with open(server_props_path, 'r') as f:
                lines = f.readlines()
            
            # Update or add the setting
            found = False
            for i, line in enumerate(lines):
                if line.strip().startswith(f"{setting_key}="):
                    lines[i] = f"{setting_key}={setting_value}\n"
                    found = True
                    break
            
            if not found:
                lines.append(f"{setting_key}={setting_value}\n")
            
            # Write back to file
            with open(server_props_path, 'w') as f:
                f.writelines(lines)
            
            message = f"Server property '{setting_key}' updated successfully"
        
        else:
            raise HTTPException(status_code=400, detail="Invalid setting_type")
        
        return {"success": True, "message": message}
        
    except Exception as e:
        print(f"Error updating setting: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update setting: {str(e)}")


@router.post("/mods/")
async def get_mods(request: ModRequest):
    Type = request.requestType.lower()
    modId = request.modId

    if Type == "available":
        BP, RP = md.list_all_mods()
        mods = BP + RP
        available_mods = []
        for mod in mods:
            mod_type = "behavior" if any(module.get("type") == "script" for module in mod.modules) else "resource"
            available_mods.append(ModResponce(
                id=mod.header.uuid.int,
                name=mod.header.name,
                Type=mod_type
            ))
        return {"mods": available_mods}
        
    elif Type == "active":
        BP, RP = md.list_all_active_mods()
        active_mods = []
        
        for mod in BP:
            mod_info = md.look_up(mod.pack_id)
            if mod_info:
                active_mods.append(ModResponce(
                    id=mod.pack_id.int,
                    name=mod_info.header.name,
                    Type="behavior"
                ))
        
        for mod in RP:
            mod_info = md.look_up(mod.pack_id)
            if mod_info:
                active_mods.append(ModResponce(
                    id=mod.pack_id.int,
                    name=mod_info.header.name,
                    Type="resource"
                ))
                
        return {"mods": active_mods}
        
    elif Type == "details" and modId:
        mod_details = md.get_mod_details(modId)
        if mod_details:
            return {"mod": mod_details}
        else:
            raise HTTPException(status_code=404, detail="Mod not found")

    raise HTTPException(status_code=400, detail="Invalid request type")


@router.post("/mods/upload")
async def upload_mod(request: Request):
    """Upload a new mod file"""
    from fastapi import UploadFile, File, Form
    import tempfile
    
    # Check admin authentication
    session = require_auth(request, require_admin=True)
    
    try:
        # Get the uploaded file from form data
        form_data = await request.form()
        uploaded_file = form_data.get("file")
        
        if not uploaded_file or not hasattr(uploaded_file, 'filename'):
            raise HTTPException(status_code=400, detail="No file uploaded")
        
        # Validate file extension
        if not uploaded_file.filename.endswith(('.mcaddon', '.mcpack')):
            raise HTTPException(status_code=400, detail="Invalid file type. Only .mcaddon and .mcpack files are supported")
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(uploaded_file.filename)[1]) as tmp_file:
            content = await uploaded_file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        # Use ModLoader to install the mod
        from Libs.ModLoader import ModLoader
        mod_loader = ModLoader(server_world_path="/bedrock")
        mod_loader.load_mod(tmp_file_path, force=True)
        
        # Clean up temporary file
        os.unlink(tmp_file_path)
        
        return {"success": True, "message": f"Mod {uploaded_file.filename} uploaded successfully"}
        
    except Exception as e:
        print(f"Error uploading mod: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload mod: {str(e)}")


@router.post("/mods/action")
async def mod_action(request: Request):
    """Enable, disable, or remove a mod"""
    # Check admin authentication
    session = require_auth(request, require_admin=True)
    
    try:
        body = await request.json()
        action = body.get("action").lower()
        mod_uuid = body.get("mod_uuid")
        mod_type = body.get("mod_type").lower()
        
        if not all([action, mod_uuid, mod_type]):
            raise HTTPException(status_code=400, detail="Missing required parameters")
        
        if action not in ["enable", "disable", "remove"]:
            raise HTTPException(status_code=400, detail="Invalid action. Must be 'enable', 'disable', or 'remove'")
        
        if mod_type not in ["behavior", "resource"]:
            raise HTTPException(status_code=400, detail="Invalid mod_type. Must be 'behavior' or 'resource'")
        
        from uuid import UUID
        uuid_obj = UUID(mod_uuid)
        
        success = False
        message = ""
        
        if action == "enable":
            success = md.enable_mod(uuid_obj, mod_type)
            message = f"Mod {'enabled' if success else 'failed to enable'}"
        elif action == "disable":
            success = md.disable_mod(uuid_obj, mod_type)
            message = f"Mod {'disabled' if success else 'failed to disable'}"
        elif action == "remove":
            success = md.remove_mod(uuid_obj)
            message = f"Mod {'removed' if success else 'failed to remove'}"
        
        if success:
            return {"success": True, "message": message}
        else:
            raise HTTPException(status_code=500, detail=message)
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid UUID format")
    except Exception as e:
        print(f"Error in mod action: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to {action} mod: {str(e)}")
