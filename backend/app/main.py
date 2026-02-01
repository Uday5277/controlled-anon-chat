from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.onboarding import router as onboarding_router

app = FastAPI(title="Controlled Anonymity Chat API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(onboarding_router)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Backend is running"
    }
