from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DialogueScenario(Base):
    __tablename__ = "dialogue_scenarios"

    id: Mapped[str] = mapped_column(String(160), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    character_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("characters.id", ondelete="SET NULL"), nullable=True, index=True
    )
    location: Mapped[str] = mapped_column(Text, nullable=False, default="")
    time_period: Mapped[str] = mapped_column(Text, nullable=False, default="")
    atmosphere: Mapped[str] = mapped_column(Text, nullable=False, default="")
    world_background: Mapped[str] = mapped_column(Text, nullable=False, default="")
    relationship: Mapped[str] = mapped_column(Text, nullable=False, default="")
    opening_context: Mapped[str] = mapped_column(Text, nullable=False, default="")
    plot_hooks: Mapped[str] = mapped_column(Text, nullable=False, default="")
    scene_rules: Mapped[str] = mapped_column(Text, nullable=False, default="")
    prompt: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
