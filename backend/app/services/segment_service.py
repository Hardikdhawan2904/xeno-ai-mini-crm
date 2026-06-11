from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..models import Customer


def build_customer_query(filters: dict, db: Session):
    """
    Translate a segment filter dict into a SQLAlchemy query.

    Supported keys: min_spend, max_spend, min_orders, max_orders,
                    inactive_days, active_days, city.
    """
    query = db.query(Customer)

    if "min_spend" in filters:
        query = query.filter(Customer.total_spend >= filters["min_spend"])
    if "max_spend" in filters:
        query = query.filter(Customer.total_spend <= filters["max_spend"])
    if "min_orders" in filters:
        query = query.filter(Customer.order_count >= filters["min_orders"])
    if "max_orders" in filters:
        query = query.filter(Customer.order_count <= filters["max_orders"])
    if "inactive_days" in filters:
        cutoff = datetime.utcnow() - timedelta(days=filters["inactive_days"])
        query = query.filter(
            (Customer.last_order_at < cutoff) | (Customer.last_order_at.is_(None))
        )
    if "active_days" in filters:
        cutoff = datetime.utcnow() - timedelta(days=filters["active_days"])
        query = query.filter(Customer.last_order_at >= cutoff)
    if "city" in filters:
        query = query.filter(Customer.city.ilike(filters["city"]))

    return query


def get_segment_customers(segment_id: int, db: Session) -> list[Customer]:
    """Return all Customer rows that match a saved segment's filters."""
    from ..models import Segment
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        return []
    return build_customer_query(segment.filters, db).all()


def count_segment_customers(filters: dict, db: Session) -> int:
    """Return the count of customers matching a filter dict."""
    return build_customer_query(filters, db).count()
