from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import customers, segments, campaigns, receipts, ai

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Xeno Mini CRM", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router)
app.include_router(segments.router)
app.include_router(campaigns.router)
app.include_router(receipts.router)
app.include_router(ai.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "crm-backend"}
