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