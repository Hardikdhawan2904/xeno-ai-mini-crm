from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..database import get_db
from ..models import Campaign, Communication, Segment
from ..services.segment_service import get_segment_customers
from ..services.campaign_service import dispatch_campaign
from ..services.ai_service import generate_insights

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])


class CampaignCreate(BaseModel):
    name: str
    segment_id: int
    message: str
    channel: str = "whatsapp"


def _compute_stats(campaign_id: int, db: Session) -> dict:
    comms = db.query(Communication).filter(Communication.campaign_id == campaign_id).all()
    sent = len(comms)
    delivered = sum(1 for c in comms if c.status in ("delivered", "opened", "clicked"))
    failed = sum(1 for c in comms if c.status == "failed")
    opened = sum(1 for c in comms if c.status in ("opened", "clicked"))
    clicked = sum(1 for c in comms if c.status == "clicked")
    return {
        "sent": sent,
        "delivered": delivered,
        "failed": failed,
        "opened": opened,
        "clicked": clicked,
    }


@router.post("")
async def create_campaign(
    data: CampaignCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    segment = db.query(Segment).filter(Segment.id == data.segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    campaign = Campaign(
        name=data.name,
        segment_id=data.segment_id,
        message=data.message,
        channel=data.channel,
        status="running",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    customers = get_segment_customers(data.segment_id, db)
    customer_ids = [c.id for c in customers]

    background_tasks.add_task(
        dispatch_campaign,
        campaign.id,
        customer_ids,
        data.message,
        data.channel,
    )

    return {**campaign.__dict__, "stats": {"sent": 0, "delivered": 0, "failed": 0, "opened": 0, "clicked": 0}}


@router.get("")
def list_campaigns(db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).all()
    result = []
    for c in campaigns:
        segment = db.query(Segment).filter(Segment.id == c.segment_id).first()
        result.append({
            **{k: v for k, v in c.__dict__.items() if not k.startswith("_")},
            "segment_name": segment.name if segment else "Unknown",
            "stats": _compute_stats(c.id, db),
        })
    return result


@router.get("/{campaign_id}")
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    segment = db.query(Segment).filter(Segment.id == campaign.segment_id).first()
    stats = _compute_stats(campaign_id, db)

    return {
        **{k: v for k, v in campaign.__dict__.items() if not k.startswith("_")},
        "segment_name": segment.name if segment else "Unknown",
        "segment_description": segment.description if segment else "",
        "stats": stats,
    }


@router.get("/{campaign_id}/insights")
def campaign_insights(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    segment = db.query(Segment).filter(Segment.id == campaign.segment_id).first()
    stats = _compute_stats(campaign_id, db)

    insight = generate_insights(stats, segment.name if segment else "Unknown", campaign.channel)
    return {"insights": insight}


@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.query(Communication).filter(Communication.campaign_id == campaign_id).delete()
    db.delete(campaign)
    db.commit()
    return {"ok": True}


@router.get("/overview/stats")
def overview_stats(db: Session = Depends(get_db)):
    from ..models import Customer
    total_customers = db.query(Customer).count()
    total_campaigns = db.query(Campaign).count()
    total_comms = db.query(Communication).count()

    delivered = db.query(Communication).filter(
        Communication.status.in_(["delivered", "opened", "clicked"])
    ).count()
    opened = db.query(Communication).filter(
        Communication.status.in_(["opened", "clicked"])
    ).count()
    clicked = db.query(Communication).filter(Communication.status == "clicked").count()

    return {
        "total_customers": total_customers,
        "total_campaigns": total_campaigns,
        "total_communications": total_comms,
        "delivery_rate": round(delivered / total_comms * 100, 1) if total_comms else 0,
        "open_rate": round(opened / total_comms * 100, 1) if total_comms else 0,
        "click_rate": round(clicked / total_comms * 100, 1) if total_comms else 0,
    }
