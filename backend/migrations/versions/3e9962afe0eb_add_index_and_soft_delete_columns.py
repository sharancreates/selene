"""add index and soft delete columns

Revision ID: 3e9962afe0eb
Revises: 8f73fb177958
Create Date: 2026-06-15 08:30:08.530424

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3e9962afe0eb'
down_revision = '8f73fb177958'
branch_labels = None
depends_on = None


def upgrade():
    # Check if index exists before creating
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_indexes = [idx['name'] for idx in inspector.get_indexes('daily_logs')]
    
    if 'ix_daily_logs_user_id' not in existing_indexes:
        with op.batch_alter_table('daily_logs', schema=None) as batch_op:
            batch_op.create_index(batch_op.f('ix_daily_logs_user_id'), ['user_id'], unique=False)

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('deleted_at', sa.DateTime(), nullable=True))

    # ### end Alembic commands ###


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('deleted_at')
        batch_op.drop_column('is_deleted')

    # Check if index exists before dropping
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_indexes = [idx['name'] for idx in inspector.get_indexes('daily_logs')]
    
    if 'ix_daily_logs_user_id' in existing_indexes:
        with op.batch_alter_table('daily_logs', schema=None) as batch_op:
            batch_op.drop_index(batch_op.f('ix_daily_logs_user_id'))

    # ### end Alembic commands ###
