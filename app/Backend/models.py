from pydantic import BaseModel
from typing import Optional


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
    option: Optional[str] = ""  # The environment variable name
    update: Optional[str] = ""  # The new value for the environment variable
