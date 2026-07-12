import secrets

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel

from app.core.auth import AUTH_COOKIE_NAME, create_session_token, verify_session_token
from app.core.config import settings

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class LoginRequest(BaseModel):
    password: str


@router.get("/status")
def auth_status(request: Request) -> dict[str, bool]:
    authenticated = not settings.AUTH_ENABLED or verify_session_token(
        request.cookies.get(AUTH_COOKIE_NAME, "")
    )
    return {"enabled": settings.AUTH_ENABLED, "authenticated": authenticated}


@router.post("/login")
def login(payload: LoginRequest, response: Response) -> dict[str, bool]:
    expected_password = settings.APP_ADMIN_PASSWORD or ""
    if not settings.AUTH_ENABLED or not secrets.compare_digest(payload.password, expected_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="密码错误")

    max_age = settings.AUTH_SESSION_HOURS * 3600
    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=create_session_token(),
        max_age=max_age,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return {"authenticated": True}


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie(AUTH_COOKIE_NAME, path="/")
    return {"authenticated": False}
