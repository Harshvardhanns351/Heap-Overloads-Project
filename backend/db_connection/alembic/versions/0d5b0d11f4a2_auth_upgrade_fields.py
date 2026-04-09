"""auth upgrade fields

Revision ID: 0d5b0d11f4a2
Revises: eb73792d2263
Create Date: 2026-04-10 01:05:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0d5b0d11f4a2"
down_revision: Union[str, Sequence[str], None] = "eb73792d2263"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("user") as batch_op:
        batch_op.alter_column("role", existing_type=sa.String(), nullable=True)
        batch_op.add_column(sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("google_id", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("avatar_url", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("oauth_provider", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("password_reset_version", sa.Integer(), nullable=False, server_default="0"))
        batch_op.create_index("ix_user_google_id", ["google_id"], unique=True)
    op.execute("UPDATE user SET is_verified = 1 WHERE is_verified IS NULL")


def downgrade() -> None:
    with op.batch_alter_table("user") as batch_op:
        batch_op.drop_index("ix_user_google_id")
        batch_op.drop_column("password_reset_version")
        batch_op.drop_column("oauth_provider")
        batch_op.drop_column("avatar_url")
        batch_op.drop_column("google_id")
        batch_op.drop_column("is_verified")
        batch_op.alter_column("role", existing_type=sa.String(), nullable=False)
