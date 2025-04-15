from pydantic import BaseModel
from typing import Optional
from uuid import UUID


class CommandRequest(BaseModel):
    command: str
    username: str
    password: str


class AuthRequest(BaseModel):
    username: str
    password: str
    cookie: Optional[bool] = False


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