"""add terms accepted columns to user

Revision ID: 5a91c8f72e10
Revises: da411c616a11
Create Date: 2026-09-06 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import models


# revision identifiers, used by Alembic.
revision = '5a91c8f72e10'
down_revision = 'da411c616a11'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('terms_accepted', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        batch_op.add_column(sa.Column('terms_signed_name', models.EncryptedString(), nullable=True))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('terms_signed_name')
        batch_op.drop_column('terms_accepted')
