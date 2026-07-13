from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default="default")
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    avatar: Mapped[str] = mapped_column(String(80), nullable=False, default="User")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    gender: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    personality: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    appearance: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_initialized: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
