import os
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

_raw = os.getenv("DATABASE_URL", "sqlite:///./crm.db")

if _raw.startswith("sqlite"):
    DATABASE_URL = _raw
    connect_args = {"check_same_thread": False}
else:
    _url = make_url(_raw)
    DATABASE_URL = _url.set(drivername="postgresql+pg8000").render_as_string(hide_password=False)
    connect_args = {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
