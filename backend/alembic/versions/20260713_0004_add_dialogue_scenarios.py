"""add dialogue scenarios and bind threads

Revision ID: 20260713_0004
Revises: 20260712_0003
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260713_0004"
down_revision: Union[str, None] = "20260712_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "dialogue_scenarios",
        sa.Column("id", sa.String(length=160), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("character_id", sa.String(length=120), nullable=True),
        sa.Column("location", sa.Text(), nullable=False),
        sa.Column("time_period", sa.Text(), nullable=False),
        sa.Column("atmosphere", sa.Text(), nullable=False),
        sa.Column("world_background", sa.Text(), nullable=False),
        sa.Column("relationship", sa.Text(), nullable=False),
        sa.Column("opening_context", sa.Text(), nullable=False),
        sa.Column("plot_hooks", sa.Text(), nullable=False),
        sa.Column("scene_rules", sa.Text(), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["character_id"], ["characters.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_dialogue_scenarios_character_id", "dialogue_scenarios", ["character_id"])
    op.create_index("ix_dialogue_scenarios_name", "dialogue_scenarios", ["name"])
    op.add_column("chat_threads", sa.Column("scenario_id", sa.String(length=160), nullable=True))
    op.create_foreign_key(
        "fk_chat_threads_scenario_id", "chat_threads", "dialogue_scenarios", ["scenario_id"], ["id"], ondelete="SET NULL"
    )
    op.create_index("ix_chat_threads_scenario_id", "chat_threads", ["scenario_id"])


def downgrade() -> None:
    op.drop_index("ix_chat_threads_scenario_id", table_name="chat_threads")
    op.drop_constraint("fk_chat_threads_scenario_id", "chat_threads", type_="foreignkey")
    op.drop_column("chat_threads", "scenario_id")
    op.drop_index("ix_dialogue_scenarios_name", table_name="dialogue_scenarios")
    op.drop_index("ix_dialogue_scenarios_character_id", table_name="dialogue_scenarios")
    op.drop_table("dialogue_scenarios")
