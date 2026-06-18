from sqlalchemy import Column, String, BigInteger
from app.database import Base

class IndexerState(Base):
    __tablename__ = "indexer_state"

    key = Column(String(50), primary_key=True)
    value = Column(BigInteger, nullable=False)
