from fastapi import FastAPI
from app.db.session import test_db_connection
from app.core.redis import redis_client

app = FastAPI(
    title="AI Assistant API",
    version="0.1.0"
)


@app.get("/")
def root():
    return {
        "message": "AI Assistant Backend Running!"
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