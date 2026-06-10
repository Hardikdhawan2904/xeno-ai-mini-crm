from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from ..database import get_db
from ..models import Communication

router = APIRouter(tags=["receipts"])


class Receipt(BaseModel):
    communication_id: int
    status: str  # delivered | failed | opened | clicked
    timestamp: str


@router.post("/api/receipts")
def handle_receipt(receipt: Receipt, db: Session = Depends(get_db)):
    comm = db.query(Communication).filter(Communication.id == receipt.communication_id).first()
    if not comm:
        raise HTTPException(status_code=404, detail="Communication not found")

    ts = datetime.fromisoformat(receipt.timestamp)

    # Status follows a lifecycle: sent → delivered/failed → opened → clicked
    # Only advance, never go backwards
    status_order = ["sent", "delivered", "failed", "opened", "clicked"]
    current_idx = status_order.index(comm.status) if comm.status in status_order else 0
    new_idx = status_order.index(receipt.status) if receipt.status in status_order else 0

    if receipt.status == "failed" or new_idx > current_idx:
        comm.status = receipt.status

    if receipt.status == "delivered" and not comm.delivered_at:
        comm.delivered_at = ts
    elif receipt.status == "opened" and not comm.opened_at:
        comm.opened_at = ts
    elif receipt.status == "clicked" and not comm.clicked_at:
        comm.clicked_at = ts

    db.commit()
    return {"ok": True}
