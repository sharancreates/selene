"""add encrypted_data to daily_logs and make legacy columns nullable

Revision ID: c19d4e5f2a3b
Revises: 5a91c8f72e10
Create Date: 2026-09-06 09:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c19d4e5f2a3b'
down_revision = '5a91c8f72e10'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = [col['name'] for col in inspector.get_columns('daily_logs')]
    
    with op.batch_alter_table('daily_logs', schema=None) as batch_op:
        if 'encrypted_data' not in existing_columns:
            batch_op.add_column(sa.Column('encrypted_data', sa.Text(), nullable=True))
        if 'phase' in existing_columns:
            batch_op.alter_column('phase', nullable=True)

    existing_indexes = [idx['name'] for idx in inspector.get_indexes('daily_logs')]
    if 'ix_daily_logs_log_date' not in existing_indexes:
        with op.batch_alter_table('daily_logs', schema=None) as batch_op:
            batch_op.create_index(batch_op.f('ix_daily_logs_log_date'), ['log_date'], unique=False)


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_indexes = [idx['name'] for idx in inspector.get_indexes('daily_logs')]
    if 'ix_daily_logs_log_date' in existing_indexes:
        with op.batch_alter_table('daily_logs', schema=None) as batch_op:
            batch_op.drop_index(batch_op.f('ix_daily_logs_log_date'))

    with op.batch_alter_table('daily_logs', schema=None) as batch_op:
        batch_op.drop_column('encrypted_data')
