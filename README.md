# Controlled Anonymity Chat

A privacy-first 1-to-1 anonymous chat with AI gender verification, device fingerprinting, and safe matching.

## Features
- Anonymous onboarding with device ID
- Live camera gender verification
- Pseudonymous profiles (nickname + short bio)
- Real-time matching with filters and cooldowns
- WebSocket chat with report/leave/next actions
- Daily limits for specific gender filters

## Architecture
- Diagram: docs/architecture.mmd
- Privacy notes: docs/privacy.md

## Local Setup

### Backend
1. Set REDIS_URL in a .env file under backend/ (e.g., redis://localhost:6379/0)
2. Install dependencies: pip install -r backend/requirements.txt
3. Run: uvicorn backend.app.main:app --reload

### Frontend
1. Install dependencies: npm install (in frontend/)
2. Run: npm run dev

## Core API
- POST /onboarding/init
- POST /verify/gender
- POST /profile/setup
- POST /match/find
- POST /match/status
- POST /queue/leave
- WS /ws?device_id=...
