from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .ws.socket import router as ws_router
from .api.onboarding import router as onboarding_router
from .api.verification import router as verification_router
from .api.profile import router as profile_router
from dotenv import load_dotenv
load_dotenv()
from .api.queue import router as queue_router
from .api.match import router as match_router
from .api.safety import router as safety_router



app = FastAPI(title="Controlled Anonymity Chat API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","https://controlled-anon-chat.vercel.app"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(onboarding_router)
app.include_router(verification_router)
app.include_router(profile_router)
app.include_router(queue_router)
app.include_router(match_router)
app.include_router(safety_router)
app.include_router(ws_router)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Backend is running"
    }
