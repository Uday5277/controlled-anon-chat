from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.onboarding import router as onboarding_router
from .api.verification import router as verification_router
from .api.profile import router as profile_router

app = FastAPI(title="Controlled Anonymity Chat API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(onboarding_router)
app.include_router(verification_router)
app.include_router(profile_router)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Backend is running"
    }
