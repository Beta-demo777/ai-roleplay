from fastapi import FastAPI
from app.db.session import test_db_connection

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