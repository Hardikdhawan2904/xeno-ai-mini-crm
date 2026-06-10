from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..database import get_db
from ..models import Customer, Order

router = APIRouter(prefix="/api/customers", tags=["customers"])


class CustomerIn(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    city: Optional[str] = None
    total_spend: float = 0.0
    order_count: int = 0
    last_order_at: Optional[str] = None


class OrderIn(BaseModel):
    customer_id: int
    amount: float
    items: list = []
    created_at: Optional[str] = None


class BulkIngest(BaseModel):
    customers: list[CustomerIn]
    orders: list[OrderIn] = []


@router.post("/bulk")
def bulk_ingest(data: BulkIngest, db: Session = Depends(get_db)):
    created = 0
    for c in data.customers:
        existing = db.query(Customer).filter(Customer.email == c.email).first()
        if existing:
            continue
        last_order = datetime.fromisoformat(c.last_order_at) if c.last_order_at else None
        customer = Customer(
            name=c.name,
            email=c.email,
            phone=c.phone,
            city=c.city,
            total_spend=c.total_spend,
            order_count=c.order_count,
            last_order_at=last_order,
        )
        db.add(customer)
        created += 1

    for o in data.orders:
        order_date = datetime.fromisoformat(o.created_at) if o.created_at else datetime.utcnow()
        order = Order(
            customer_id=o.customer_id,
            amount=o.amount,
            items=o.items,
            created_at=order_date,
        )
        db.add(order)

    db.commit()
    return {"ingested_customers": created, "ingested_orders": len(data.orders)}


@router.get("")
def list_customers(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Customer)
    if search:
        query = query.filter(
            Customer.name.ilike(f"%{search}%") | Customer.email.ilike(f"%{search}%")
        )
    total = query.count()
    customers = query.order_by(Customer.total_spend.desc()).offset(skip).limit(limit).all()
    return {
        "customers": [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "city": c.city,
                "total_spend": c.total_spend,
                "order_count": c.order_count,
                "last_order_at": c.last_order_at.isoformat() if c.last_order_at else None,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in customers
        ],
        "total": total,
    }


@router.get("/stats")
def customer_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func
    total = db.query(Customer).count()
    avg_spend = db.query(func.avg(Customer.total_spend)).scalar() or 0
    avg_orders = db.query(func.avg(Customer.order_count)).scalar() or 0
    cities = db.query(Customer.city).distinct().count()
    return {
        "total": total,
        "avg_spend": round(avg_spend, 2),
        "avg_orders": round(avg_orders, 2),
        "cities": cities,
    }
