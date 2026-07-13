"""add multiple personas and bind threads

Revision ID: 20260713_0005
Revises: 20260713_0004
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260713_0005"
down_revision: Union[str, None] = "20260713_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user_profiles", sa.Column("is_active", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.execute("UPDATE user_profiles SET is_active = true WHERE id = 'default'")
    op.create_index("ix_user_profiles_is_active", "user_profiles", ["is_active"])
    op.add_column("chat_threads", sa.Column("persona_id", sa.String(length=64), nullable=True))
    op.create_foreign_key(
        "fk_chat_threads_persona_id", "chat_threads", "user_profiles", ["persona_id"], ["id"], ondelete="SET NULL"
    )
    op.create_index("ix_chat_threads_persona_id", "chat_threads", ["persona_id"])


def downgrade() -> None:
    op.drop_index("ix_chat_threads_persona_id", table_name="chat_threads")
    op.drop_constraint("fk_chat_threads_persona_id", "chat_threads", type_="foreignkey")
    op.drop_column("chat_threads", "persona_id")
    op.drop_index("ix_user_profiles_is_active", table_name="user_profiles")
    op.drop_column("user_profiles", "is_active")
