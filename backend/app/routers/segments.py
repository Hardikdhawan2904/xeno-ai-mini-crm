from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..database import get_db
from ..models import Segment
from ..services.segment_service import build_customer_query, count_segment_customers
from ..services.ai_service import nl_to_filters

router = APIRouter(prefix="/api/segments", tags=["segments"])


def segment_to_dict(s: Segment, customer_count: int) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "description": s.description,
        "filters": s.filters or {},
        "customer_count": customer_count,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


class SegmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    filters: dict = {}
    nl_query: Optional[str] = None


@router.post("")
def create_segment(data: SegmentCreate, db: Session = Depends(get_db)):
    filters = data.filters

    if data.nl_query:
        try:
            filters = nl_to_filters(data.nl_query)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"AI filter generation failed: {e}")

    count = count_segment_customers(filters, db)

    segment = Segment(
        name=data.name,
        description=data.description or data.nl_query,
        filters=filters,
        customer_count=count,
    )
    db.add(segment)
    db.commit()
    db.refresh(segment)
    return segment_to_dict(segment, count)


@router.get("")
def list_segments(db: Session = Depends(get_db)):
    segments = db.query(Segment).order_by(Segment.created_at.desc()).all()
    return [segment_to_dict(s, count_segment_customers(s.filters or {}, db)) for s in segments]


@router.get("/{segment_id}/preview")
def preview_segment(segment_id: int, db: Session = Depends(get_db)):
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    customers = build_customer_query(segment.filters or {}, db).limit(5).all()
    count = count_segment_customers(segment.filters or {}, db)

    return {
        "count": count,
        "sample": [
            {"id": c.id, "name": c.name, "city": c.city, "total_spend": c.total_spend}
            for c in customers
        ],
    }


@router.delete("/{segment_id}")
def delete_segment(segment_id: int, db: Session = Depends(get_db)):
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")
    db.delete(segment)
    db.commit()
    return {"ok": True}
