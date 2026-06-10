"""
Stubbed channel service.

Receives send requests from the CRM, simulates the full message delivery
lifecycle asynchronously, and calls back into the CRM receipt API for each
state change. No real messages are sent.

Simulated rates (close to real WhatsApp marketing benchmarks):
  Delivery:  90%  (10% fail at network/number level)
  Open:      55%  of delivered
  Click:     25%  of opened
"""
import asyncio
import os
import random
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel

load_dotenv()

CRM_URL = os.getenv("CRM_URL", "http://localhost:8000")

app = FastAPI(title="Channel Service (Stub)", version="1.0.0")


class SendRequest(BaseModel):
    communication_id: int
    recipient: str
    message: str
    channel: str


async def _post_receipt(comm_id: int, status: str, retries: int = 3):
    """
    POST a delivery event to the CRM receipt webhook.
    Retries with exponential backoff if the CRM is temporarily unreachable.
    """
    payload = {
        "communication_id": comm_id,
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(f"{CRM_URL}/api/receipts", json=payload)
                resp.raise_for_status()
                return
        except Exception:
            if attempt < retries - 1:
                await asyncio.sleep(2 ** attempt)


async def simulate_lifecycle(comm_id: int):
    """
    Simulate the full delivery → open → click lifecycle for one message.
    Each state change is reported back to the CRM via _post_receipt.
    """
    await asyncio.sleep(random.uniform(1.0, 3.0))

    if random.random() < 0.10:
        await _post_receipt(comm_id, "failed")
        return

    await _post_receipt(comm_id, "delivered")

    await asyncio.sleep(random.uniform(2.0, 8.0))
    if random.random() > 0.55:
        return

    await _post_receipt(comm_id, "opened")

    await asyncio.sleep(random.uniform(1.0, 5.0))
    if random.random() > 0.25:
        return

    await _post_receipt(comm_id, "clicked")


@app.post("/send")
async def send(req: SendRequest):
    """
    Accept a send request from the CRM and queue the delivery simulation.
    Returns immediately; the lifecycle runs asynchronously in the background.
    """
    asyncio.create_task(simulate_lifecycle(req.communication_id))
    return {"status": "queued", "communication_id": req.communication_id}


@app.get("/health")
def health():
    return {"status": "ok", "service": "channel-service", "crm_url": CRM_URL}
