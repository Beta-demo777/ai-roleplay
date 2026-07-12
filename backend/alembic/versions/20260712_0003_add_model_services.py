"""add model services

Revision ID: 20260712_0003
Revises: 20260712_0002
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260712_0003"
down_revision: Union[str, None] = "20260712_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "model_services",
        sa.Column("id", sa.String(length=120), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("config", sa.JSON(), nullable=False),
        sa.Column("encrypted_api_key", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_model_services_is_active", "model_services", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_model_services_is_active", table_name="model_services")
    op.drop_table("model_services")
