from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app import models
from app.services.auth_service import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # 1. Email එක දැනටමත් තියෙනවද කියලා check කරනවා
    existing_user = db.query(models.User).filter(models.User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="මේ email එකෙන් account එකක් දැනටමත් තියෙනවා")

    # 2. Password එක hash කරලා, User එකක් හදනවා
    new_user = models.User(
        email=request.email,
        hashed_password=hash_password(request.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 3. Token එකක් හදලා return කරනවා (register වුනා ගමන් login වෙනවා)
    token = create_access_token(new_user.id, new_user.email)

    return {
        "message": "Account එක හැදුවා!",
        "access_token": token,
        "email": new_user.email
    }


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # 1. User එක email එකෙන් හොයනවා
    user = db.query(models.User).filter(models.User.email == request.email).first()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email එක හෝ password එක වැරදියි")

    # 2. Token එකක් හදලා return කරනවා
    token = create_access_token(user.id, user.email)

    return {
        "message": "Login success!",
        "access_token": token,
        "email": user.email
    }