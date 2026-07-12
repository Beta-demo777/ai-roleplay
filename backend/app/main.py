from fastapi import FastAPI
from app.db.session import test_db_connection
from app.core.redis import redis_client
from app.api import auth_router, model_services_router, state_router

app = FastAPI(
    title="AI Roleplay API",
    version="0.1.0"
)

app.include_router(auth_router)
app.include_router(model_services_router)
app.include_router(state_router)


@app.get("/")
def root():
    return {
        "message": "AI Roleplay Backend Running!"
    }

@app.get("/health/db")
def health_db():
    result = test_db_connection()
    return {
        "database":"connected",
        "result":result,
    }

@app.get("/health/redis")
async def health_redis():
    pong = await redis_client.ping()
    return {
        "redis": "connected",
        "ping": pong
    }
