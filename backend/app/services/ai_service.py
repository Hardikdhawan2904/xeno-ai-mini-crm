import os
import json
import re
from groq import Groq

MODEL = "llama-3.3-70b-versatile"
_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _client


_SEGMENT_SYSTEM = """You convert natural language audience descriptions into JSON filter objects.

Available filter keys:
- min_spend (float): minimum total spend in INR
- max_spend (float): maximum total spend in INR
- min_orders (int): minimum number of orders placed
- inactive_days (int): hasn't ordered in the last X days
- active_days (int): ordered within the last X days
- city (string): specific city name

Return ONLY valid JSON. No explanation, no markdown, no extra text.
Example: {"min_spend": 5000, "inactive_days": 30}"""


def _extract_json(text: str, array: bool = False):
    """Extract the first JSON object or array from a model response string."""
    pattern = r"\[.*?\]" if array else r"\{.*?\}"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(text.strip())


def nl_to_filters(query: str) -> dict:
    """
    Convert a natural language audience description into a structured
    filter dict that can be applied as SQL WHERE clauses.

    Example: "inactive customers who spent over 5000" →
             {"min_spend": 5000, "inactive_days": 30}
    """
    resp = _get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": _SEGMENT_SYSTEM},
            {"role": "user", "content": query},
        ],
        temperature=0.1,
    )
    return _extract_json(resp.choices[0].message.content)


def generate_messages(segment_description: str, campaign_goal: str) -> list[str]:
    """
    Generate three short, personalized marketing message variants for a campaign.

    Returns a list of exactly 3 strings, each under 160 characters,
    with {name} as a placeholder for the recipient's first name.
    """
    prompt = f"""Generate exactly 3 short marketing messages.

Audience: {segment_description}
Campaign goal: {campaign_goal}

Rules:
- Each message must be under 160 characters
- Warm, personal tone
- Include a clear call to action
- Use {{name}} as a placeholder for the customer's first name
- Return ONLY a JSON array of exactly 3 strings

Example format: ["Hey {{name}}, ...", "Hi {{name}}, ...", "{{name}}, ..."]"""

    resp = _get_client().chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    return _extract_json(resp.choices[0].message.content, array=True)


def generate_insights(stats: dict, segment_name: str, channel: str) -> str:
    """
    Generate a natural-language summary of campaign performance
    using delivery and engagement metrics.

    Highlights delivery rate, open rate, and CTR, and surfaces
    one actionable suggestion for the next campaign.
    """
    sent = stats.get("sent", 0)
    delivered = stats.get("delivered", 0)
    opened = stats.get("opened", 0)
    clicked = stats.get("clicked", 0)

    delivery_rate = round(delivered / sent * 100, 1) if sent > 0 else 0
    open_rate = round(opened / delivered * 100, 1) if delivered > 0 else 0
    ctr = round(clicked / opened * 100, 1) if opened > 0 else 0

    prompt = f"""Summarize this campaign performance in 2 concise sentences.

Segment: {segment_name}
Channel: {channel.upper()}
Sent: {sent} | Delivered: {delivered} ({delivery_rate}%) | Opened: {opened} ({open_rate}%) | Clicked: {clicked} ({ctr}% CTR)

Be specific with numbers. Highlight what worked and one actionable suggestion."""

    resp = _get_client().chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    return resp.choices[0].message.content.strip()
