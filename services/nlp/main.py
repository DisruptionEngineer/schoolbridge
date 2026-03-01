"""
SchoolBridge NLP Microservice

Extracts school events, dates, and photo references from ClassDojo post text.
Uses regex-based keyword matching and dateparser for date normalization.
Lightweight version optimized for serverless deployment.
"""

import re
from typing import Optional

import dateparser
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="SchoolBridge NLP Service", version="0.2.0")

SCHOOL_TERMS: dict[str, list[str]] = {
    "dismissal": ["early dismissal", "early release", "half day"],
    "closure": ["school closed", "snow day", "weather closure", "no school"],
    "special": [
        "spirit week", "field trip", "field day", "picture day",
        "class photo", "pajama day", "hat day", "assembly", "pep rally",
    ],
    "admin": [
        "parent conference", "parent-teacher conference", "ptc",
        "parent night", "open house", "back to school night",
    ],
}

# Pre-compile patterns for each category
_CATEGORY_PATTERNS: dict[str, re.Pattern] = {
    label: re.compile("|".join(re.escape(t) for t in terms), re.IGNORECASE)
    for label, terms in SCHOOL_TERMS.items()
}

DAY_PATTERN = re.compile(
    r"\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday"
    r"|saturday|sunday|today|tomorrow|tonight|\d{1,2}[/-]\d{1,2})\b",
    re.IGNORECASE,
)

TIME_INDICATORS = {"am", "pm", ":", "o'clock", "noon", "midnight"}

# Date-like expressions to extract from text
DATE_EXPR = re.compile(
    r"(?:"
    r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)"
    r"\s+\d{1,2}(?:\s*,?\s*\d{4})?"
    r"|"
    r"\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*\b(?:\s*,?\s*"
    r"(?:January|February|March|April|May|June|July|August|September|October|November|December)"
    r"\s+\d{1,2})?"
    r"|"
    r"\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b"
    r"|"
    r"\b(?:today|tomorrow|tonight|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday"
    r"|week|month))\b"
    r"|"
    r"\b(?:this|next)\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b"
    r")",
    re.IGNORECASE,
)


class ExtractRequest(BaseModel):
    text: str
    post_id: str


class ExtractedEvent(BaseModel):
    title: str
    raw_date_text: str
    iso_date: Optional[str]
    is_all_day: bool
    category: str


class ExtractedPhoto(BaseModel):
    url: str
    timestamp: Optional[str]


class ExtractResponse(BaseModel):
    events: list[ExtractedEvent]
    photos: list[ExtractedPhoto]


def classify_category(text: str) -> str:
    """Determine the school event category from keyword matching."""
    for priority in ["closure", "dismissal", "admin", "special"]:
        if _CATEGORY_PATTERNS[priority].search(text):
            return priority
    return "general"


def extract_title(text: str) -> str:
    """Extract a reasonable event title from the text."""
    first_sentence = text.split(".")[0].strip()
    title = first_sentence[:60] if first_sentence else text[:60]
    return title.strip().title() if len(title) > 3 else title.strip()


def is_valid_date_text(text: str) -> bool:
    """Filter out weak date matches."""
    return len(text) >= 3 and bool(DAY_PATTERN.search(text))


def has_time_component(text: str) -> bool:
    """Check if the date text includes a time specification."""
    lower = text.lower()
    return any(indicator in lower for indicator in TIME_INDICATORS)


@app.post("/extract", response_model=ExtractResponse)
async def extract_events(req: ExtractRequest) -> ExtractResponse:
    """Extract school events and dates from ClassDojo post text."""
    if not req.text.strip():
        return ExtractResponse(events=[], photos=[])

    category = classify_category(req.text)
    title = extract_title(req.text)

    # Extract date candidates via regex
    date_texts: list[str] = [
        m.group() for m in DATE_EXPR.finditer(req.text)
        if is_valid_date_text(m.group())
    ]

    # Fallback: use dateparser's search_dates
    if not date_texts:
        try:
            from dateparser.search import search_dates
            found = search_dates(
                req.text, settings={"PREFER_DATES_FROM": "future"}
            ) or []
            date_texts = [
                text for text, _ in found if is_valid_date_text(text)
            ]
        except Exception:
            pass

    events: list[ExtractedEvent] = []
    seen_dates: set[str] = set()

    for raw_date in date_texts:
        if raw_date.lower() in seen_dates:
            continue
        seen_dates.add(raw_date.lower())

        parsed = dateparser.parse(
            raw_date,
            settings={
                "PREFER_DATES_FROM": "future",
                "RETURN_AS_TIMEZONE_AWARE": False,
            },
        )

        iso_date: Optional[str] = None
        is_all_day = True

        if parsed:
            if has_time_component(raw_date):
                is_all_day = False
                iso_date = parsed.isoformat()
            else:
                iso_date = parsed.date().isoformat()

        events.append(ExtractedEvent(
            title=title,
            raw_date_text=raw_date,
            iso_date=iso_date,
            is_all_day=is_all_day,
            category=category,
        ))

    # If we found school terms but no dates, still create an event with no date
    if not events and category != "general":
        events.append(ExtractedEvent(
            title=title,
            raw_date_text="(no date detected)",
            iso_date=None,
            is_all_day=True,
            category=category,
        ))

    return ExtractResponse(events=events, photos=[])


@app.get("/health")
async def health():
    return {"status": "ok", "engine": "regex+dateparser"}
