from sqlalchemy import create_engine, Column, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))
DATABASE_URL = "sqlite:///./data/kai_finance.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    recovery_phrase = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(IST))
    
    profile = relationship("Profile", back_populates="user", uselist=False)
    transactions = relationship("Transaction", back_populates="user")

class Profile(Base):
    __tablename__ = "profiles"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String)
    profession = Column(String, default="General")
    # Store JSON string of custom categories
    custom_categories = Column(Text, default='["Groceries", "Restaurant", "Fast Food & Drink", "Gas", "Bills", "Health & Sports", "Mental Health", "Income", "Saved", "Other"]')
    instructions = Column(Text, default="I prefer concise and direct answers.")
    
    user = relationship("User", back_populates="profile")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    amount = Column(Float)
    currency = Column(String, default="₹")
    category = Column(String)
    tx_type = Column(String) # 'income', 'expense', 'save'
    description = Column(String)
    date = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(IST))
    
    user = relationship("User", back_populates="transactions")

# Create all tables
Base.metadata.create_all(bind=engine)
