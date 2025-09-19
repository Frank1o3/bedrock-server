# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a containerized Minecraft Bedrock Edition server management system with a web-based control panel. It consists of:

- **Minecraft Bedrock Server**: The actual game server running in a container
- **Python FastAPI Backend**: Web API for server control and management (`app/backend/`)
- **React Frontend**: Web interface for server administration (`app/frontend/`)
- **Docker Infrastructure**: Containerization with automated builds and deployment

## Common Development Commands

### Docker Operations
```bash
# Build and run the complete server
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d

# Push image (requires Docker Hub credentials)
docker compose -f docker-compose.yml push
```

### Backend Development
```bash
# Navigate to backend directory
cd app/backend

# Install Python dependencies
pip install -r requirements.txt

# Run the backend server directly (for development)
python Main.py
```

### Frontend Development
```bash
# Navigate to frontend directory
cd app/frontend

# Install Node.js dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Server Management Scripts
```bash
# Start the Bedrock server
./start.sh

# Create backup of world data
./backup.sh

# Rollback to latest backup
./rollback.sh

# Container entrypoint (used in Docker)
./entrypoint.sh
```

## Architecture Overview

### Three-Tier Architecture

1. **Game Server Layer** (`/bedrock/`):
   - Minecraft Bedrock Server executable
   - World data stored in `/bedrock/worlds/`
   - Server configuration in `server.properties`
   - Automatic backups to `/bedrock/backups/`

2. **API Layer** (`app/backend/`):
   - **FastAPI application** (`Main.py`) - Main server orchestrator
   - **Route handlers** (`Routes/`) - API endpoints for web and server commands
   - **Database layer** (`Libs/Database.py`) - SQLite user management
   - **Mod system** (`Libs/ModLoader.py`) - Bedrock mod management
   - **Process management** - Controls Bedrock server and bash processes via subprocess

3. **Frontend Layer** (`app/frontend/`):
   - **React SPA** with TypeScript
   - **Pages**: Console (server logs), Mods (mod management), Settings (configuration)
   - **WebSocket integration** for real-time server log streaming
   - **Authentication system** with session-based login

### Key Integration Points

- **Process Control**: FastAPI backend manages Bedrock server subprocess, sending commands via stdin and reading stdout/stderr
- **Real-time Communication**: Separate WebSocket connections (`/ws/bedrock`, `/ws/bash`) stream logs to correct frontend terminals
- **Enhanced Authentication System**:
  - Single session per user enforcement (prevents concurrent logins)
  - First user automatically becomes admin, subsequent users are standard users
  - Session timeout and automatic cleanup (60-minute sessions)
  - Role-based access control with secure cookie management
  - Admin users: Full server control (console, mods, settings)
  - Standard users: Server status view only
- **Backup System**: Automated cron-based backups every 15 minutes, with rollback capabilities
- **Comprehensive Mod Management**: 
  - Upload `.mcaddon` and `.mcpack` files via web interface
  - Enable/disable mods without removing files
  - Complete removal of mods from filesystem and world config
  - Automatic world configuration JSON updates (`world_behavior_packs.json`, `world_resource_packs.json`)

### Container Architecture

The system runs as a single container with multiple processes:
- **No-IP DDNS client** for dynamic DNS updates
- **Cron daemon** for automated backups
- **FastAPI server** (port 5000) serving both API and frontend
- **Bedrock server** as a subprocess

### Database Schema

SQLite database (`~/database.db`):
- **users table**: id, username, password, rank (user/admin)
- Admin users can execute server commands and manage settings

## Development Notes

- Backend uses subprocess management to control the Bedrock server process
- Frontend built with Vite, uses development proxy for API calls
- **WebSocket endpoints**: `/ws/bedrock` for server logs, `/ws/bash` for terminal logs (fixed routing issue)
- Each terminal has dedicated streaming threads that handle both stdout and stderr
- **Authentication APIs**:
  - `GET /api/auth/session` - Check authentication status and get user details
  - `POST /api/auth/login` - Enhanced login/register with role assignment
  - `POST /api/auth/logout` - Secure logout with session invalidation
  - `GET /api/server/status` - Server status for authenticated users
  - `GET /api/user/profile` - User profile information
- **Settings Management APIs**:
  - `GET /api/settings` - Retrieve server configuration (admin only)
  - `POST /api/settings/update` - Update environment variables and server properties
  - Support for both environment variables and server.properties modifications
- **Mod Management APIs**:
  - `POST /api/mods/upload` - Upload new mod files (admin only)
  - `POST /api/mods/action` - Enable/disable/remove mods (admin only)
  - Enhanced `POST /api/mods/` - Get available/active mods with detailed info
- **Frontend Architecture**: Role-based UI with separate views for admin vs standard users
- **Mod System Architecture**: Separates available mods (filesystem) from active mods (world config)
- Environment variables configured via `.env` file and docker-compose
- CI/CD pipeline builds and publishes Docker images on main branch pushes
