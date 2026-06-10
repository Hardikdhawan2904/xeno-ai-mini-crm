from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.ai_service import nl_to_filters, generate_messages

router = APIRouter(prefix="/api/ai", tags=["ai"])


class NLSegmentRequest(BaseModel):
    query: str


class MessageRequest(BaseModel):
    segment_description: str
    campaign_goal: str


@router.post("/segment")
def ai_segment(data: NLSegmentRequest):
    try:
        filters = nl_to_filters(data.query)
        return {"filters": filters, "query": data.query}
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse query: {e}")


@router.post("/messages")
def ai_messages(data: MessageRequest):
    try:
        messages = generate_messages(data.segment_description, data.campaign_goal)
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not generate messages: {e}")
