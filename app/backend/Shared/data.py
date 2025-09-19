import subprocess
from typing import Dict, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta


SESSION_COOKIE_NAME = "session_token"

@dataclass
class SessionData:
    username: str
    role: str
    created_at: datetime
    last_activity: datetime
    
    def is_expired(self, timeout_minutes: int = 60) -> bool:
        return datetime.now() - self.last_activity > timedelta(minutes=timeout_minutes)
    
    def refresh_activity(self):
        self.last_activity = datetime.now()

# Session store: token -> SessionData
SESSION_STORE: Dict[str, SessionData] = {}

# User to session mapping: username -> token (for single session enforcement)
USER_SESSION_MAP: Dict[str, str] = {}


def create_session(username: str, role: str) -> str:
    """Create a new session for a user, invalidating any existing session"""
    from uuid import uuid4
    
    # Remove existing session for this user
    existing_token = USER_SESSION_MAP.get(username)
    if existing_token and existing_token in SESSION_STORE:
        del SESSION_STORE[existing_token]
    
    # Create new session
    new_token = str(uuid4())
    session_data = SessionData(
        username=username,
        role=role,
        created_at=datetime.now(),
        last_activity=datetime.now()
    )
    
    SESSION_STORE[new_token] = session_data
    USER_SESSION_MAP[username] = new_token
    
    return new_token


def get_session(token: str) -> Optional[SessionData]:
    """Get session data and refresh activity if valid"""
    session = SESSION_STORE.get(token)
    if session and not session.is_expired():
        session.refresh_activity()
        return session
    elif session:
        # Clean up expired session
        invalidate_session(token)
    return None


def invalidate_session(token: str):
    """Remove a session from all stores"""
    session = SESSION_STORE.get(token)
    if session:
        # Remove from user mapping
        if USER_SESSION_MAP.get(session.username) == token:
            del USER_SESSION_MAP[session.username]
        # Remove from session store
        del SESSION_STORE[token]


def cleanup_expired_sessions():
    """Clean up all expired sessions"""
    expired_tokens = []
    for token, session in SESSION_STORE.items():
        if session.is_expired():
            expired_tokens.append(token)
    
    for token in expired_tokens:
        invalidate_session(token)

