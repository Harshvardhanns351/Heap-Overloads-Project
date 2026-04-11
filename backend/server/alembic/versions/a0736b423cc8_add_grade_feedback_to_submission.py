"""add_grade_feedback_to_submission

Revision ID: a0736b423cc8
Revises: eb73792d2263
Create Date: 2026-04-11 11:48:30.591376

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a0736b423cc8'
down_revision: Union[str, Sequence[str], None] = 'eb73792d2263'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('assignmentsubmission', sa.Column('grade', sa.String(), nullable=True))
    op.add_column('assignmentsubmission', sa.Column('feedback', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('assignmentsubmission', 'feedback')
    op.drop_column('assignmentsubmission', 'grade')
