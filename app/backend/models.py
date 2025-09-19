from pydantic import BaseModel
from typing import Optional
from fastapi import Cookie
from uuid import UUID

class CommandRequest(BaseModel):
    command: str
    session_token: Optional[str] = Cookie(default=None)

class AuthRequest(BaseModel):
    username: str
    password: str
    login: Optional[bool] = False
    session_token: Optional[str] = Cookie(default=None)

class SettingsRequest(BaseModel):
    username: str
    password: str
    option: Optional[str] = ""
    update: Optional[str] = ""


class ModRequest(BaseModel):
    requestType: str
    modId: Optional[UUID] = ""


class ModResponce(BaseModel):
    id: int
    name: str
    Type: Optional[str] = None


class ModUploadRequest(BaseModel):
    filename: str
    data: bytes


class ModActionRequest(BaseModel):
    action: str  # "enable", "disable", "remove"
    mod_uuid: str
    mod_type: str  # "behavior" or "resource"


class ModDetailsResponse(BaseModel):
    uuid: str
    name: str
    description: Optional[str]
    version: list
    type: str
    enabled: bool
    file_path: str


class SessionResponse(BaseModel):
    success: bool
    authenticated: bool
    username: Optional[str] = None
    role: Optional[str] = None
    message: str


class ServerStatusResponse(BaseModel):
    server_online: bool
    uptime: Optional[str]
    player_count: Optional[int]
    max_players: Optional[int]
    world_name: Optional[str]
    

class UserProfileResponse(BaseModel):
    username: str
    role: str
    created_at: Optional[str]
    last_login: Optional[str]
    

class SettingsUpdateRequest(BaseModel):
    setting_key: str
    setting_value: str
    

class LogoutRequest(BaseModel):
    pass
