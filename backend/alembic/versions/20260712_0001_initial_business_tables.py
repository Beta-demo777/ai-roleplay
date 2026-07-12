"""create initial business tables

Revision ID: 20260712_0001
Revises:
Create Date: 2026-07-12
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260712_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_profiles",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("avatar", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("gender", sa.String(length=80), nullable=True),
        sa.Column("personality", sa.Text(), nullable=True),
        sa.Column("appearance", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "characters",
        sa.Column("id", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("tagline", sa.String(length=300), nullable=False),
        sa.Column("avatar", sa.String(length=80), nullable=False),
        sa.Column("category", sa.String(length=40), nullable=False),
        sa.Column("personality", sa.Text(), nullable=False),
        sa.Column("scenario", sa.Text(), nullable=False),
        sa.Column("first_message", sa.Text(), nullable=False),
        sa.Column("system_instruction", sa.Text(), nullable=False),
        sa.Column("is_custom", sa.Boolean(), nullable=False),
        sa.Column("starters", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_characters_category"), "characters", ["category"], unique=False)
    op.create_index(op.f("ix_characters_name"), "characters", ["name"], unique=False)
    op.create_table(
        "chat_threads",
        sa.Column("id", sa.String(length=160), nullable=False),
        sa.Column("character_id", sa.String(length=120), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("timestamp", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["character_id"], ["characters.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_chat_threads_character_id"), "chat_threads", ["character_id"], unique=False)
    op.create_index(op.f("ix_chat_threads_timestamp"), "chat_threads", ["timestamp"], unique=False)
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.String(length=180), nullable=False),
        sa.Column("thread_id", sa.String(length=160), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("timestamp", sa.BigInteger(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["thread_id"], ["chat_threads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_chat_messages_thread_id"), "chat_messages", ["thread_id"], unique=False)
    op.create_index(op.f("ix_chat_messages_timestamp"), "chat_messages", ["timestamp"], unique=False)
    op.create_index("ix_chat_messages_thread_position", "chat_messages", ["thread_id", "position"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_chat_messages_thread_position", table_name="chat_messages")
    op.drop_index(op.f("ix_chat_messages_timestamp"), table_name="chat_messages")
    op.drop_index(op.f("ix_chat_messages_thread_id"), table_name="chat_messages")
    op.drop_table("chat_messages")
    op.drop_index(op.f("ix_chat_threads_timestamp"), table_name="chat_threads")
    op.drop_index(op.f("ix_chat_threads_character_id"), table_name="chat_threads")
    op.drop_table("chat_threads")
    op.drop_index(op.f("ix_characters_name"), table_name="characters")
    op.drop_index(op.f("ix_characters_category"), table_name="characters")
    op.drop_table("characters")
    op.drop_table("user_profiles")
