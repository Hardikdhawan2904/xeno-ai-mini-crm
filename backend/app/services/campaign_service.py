import os
import asyncio
import httpx
from datetime import datetime
from ..database import SessionLocal
from ..models import Campaign, Communication, Customer

CHANNEL_SERVICE_URL = os.getenv("CHANNEL_SERVICE_URL", "http://localhost:8001")


async def dispatch_campaign(campaign_id: int, customer_ids: list[int], message: str, channel: str):
    """
    Persist one Communication row per recipient, then fire all sends to the
    channel service concurrently. The channel service callbacks back to
    /api/receipts asynchronously as delivery events occur.

    Runs as a FastAPI BackgroundTask so the campaign creation response
    returns immediately while sends happen in the background.
    """
    db = SessionLocal()
    try:
        comm_payloads = []

        for customer_id in customer_ids:
            customer = db.query(Customer).filter(Customer.id == customer_id).first()
            if not customer:
                continue

            personalized = message.replace("{name}", customer.name.split()[0])

            comm = Communication(
                campaign_id=campaign_id,
                customer_id=customer_id,
                message=personalized,
                status="sent",
            )
            db.add(comm)
            db.flush()

            comm_payloads.append({
                "communication_id": comm.id,
                "recipient": customer.email,
                "message": personalized,
                "channel": channel,
            })

        db.commit()

        async with httpx.AsyncClient(timeout=10.0) as http:
            tasks = [
                http.post(f"{CHANNEL_SERVICE_URL}/send", json=payload)
                for payload in comm_payloads
            ]
            await asyncio.gather(*tasks, return_exceptions=True)

        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if campaign:
            campaign.status = "completed"
            campaign.sent_at = datetime.utcnow()
            db.commit()

    finally:
        db.close()
