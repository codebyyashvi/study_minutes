from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router, get_current_user

app = FastAPI()

# CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth routes
app.include_router(auth_router)

# Example protected route
@app.get("/protected")
def protected(user = Depends(get_current_user)):
    return {
        "message": "You are authenticated",
        "email": user["email"]
    }

@app.get("/")
def root():
    return {"message": "StudyMinutes Backend is running 🚀"}