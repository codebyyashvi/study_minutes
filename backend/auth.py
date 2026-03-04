import os
from fastapi import APIRouter, HTTPException, Header, Depends
from jose import jwt, JWTError
from datetime import datetime, timedelta
from google.oauth2 import id_token
from google.auth.transport import requests
from dotenv import load_dotenv
from db import users_collection
from models import GoogleToken

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

router = APIRouter()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/auth/google")
def google_login(data: GoogleToken):
    try:
        idinfo = id_token.verify_oauth2_token(
            data.token,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )

        email = idinfo["email"]
        name = idinfo.get("name")
        picture = idinfo.get("picture")

        user = users_collection.find_one({"email": email})

        if not user:
            users_collection.insert_one({
                "email": email,
                "name": name,
                "picture": picture,
                "created_at": datetime.utcnow()
            })

        token = create_access_token({"email": email})

        return {
            "token": token,
            "user": {
                "email": email,
                "name": name,
                "picture": picture
            }
        }

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Google token")

def get_current_user(authorization: str = Header(...)):
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("email")

        user = users_collection.find_one({"email": email})

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return user

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")