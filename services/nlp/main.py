"""
SchoolBridge NLP Microservice

Extracts school events, dates, and photo references from ClassDojo post text
and uploaded PDF documents (school newsletters, calendars, flyers).
Uses regex-based keyword matching and dateparser for date normalization.
Lightweight version optimized for serverless deployment.
"""

import io
import re
from typing import Optional

import dateparser
from fastapi import FastAPI, File, UploadFile, Form
from pydantic import BaseModel

app = FastAPI(title="SchoolBridge NLP Service", version="0.3.0")

SCHOOL_TERMS: dict[str, list[str]] = {
    "dismissal": ["early dismissal", "early release", "half day", "late start"],
    "closure": ["school closed", "snow day", "weather closure", "no school",
                "spring break", "winter break", "fall break"],
    "special": [
        "spirit week", "field trip", "field day", "picture day",
        "class photo", "pajama day", "hat day", "assembly", "pep rally",
        "program", "concert", "performance", "show", "recital",
        "food drive", "fundraiser", "book fair", "carnival",
        "science fair", "art show", "talent show", "graduation",
    ],
    "admin": [
        "parent conference", "parent-teacher conference", "ptc",
        "parent night", "open house", "back to school night",
        "registration", "enrollment", "orientation",
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

# Month names pattern — used for validating "Month DD" style date matches
MONTH_PATTERN = re.compile(
    r"\b(?:January|February|March|April|May|June|July|August|September"
    r"|October|November|December)\b",
    re.IGNORECASE,
)

TIME_INDICATORS = {"am", "pm", ":", "o'clock", "noon", "midnight"}

# Date-like expressions to extract from text
# Handles: "March 12th", "February 27", "March 12th, 2026", "Mon, March 12",
#           "3/12", "3/12/2026", "today", "tomorrow", "next Monday", "this Friday"
DATE_EXPR = re.compile(
    r"(?:"
    r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December)"
    r"\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?"
    r"|"
    r"\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*\b(?:\s*,?\s*"
    r"(?:January|February|March|April|May|June|July|August|September|October|November|December)"
    r"\s+\d{1,2}(?:st|nd|rd|th)?)?"
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
    """Filter out weak date matches.

    Accepts day names (Monday, Tue), month+day (March 12), numeric (3/12),
    and relative dates (today, tomorrow, next Friday).
    """
    if len(text) < 3:
        return False
    return bool(DAY_PATTERN.search(text)) or bool(MONTH_PATTERN.search(text))


def has_time_component(text: str) -> bool:
    """Check if the date text includes a time specification."""
    lower = text.lower()
    return any(indicator in lower for indicator in TIME_INDICATORS)


@app.post("/extract", response_model=ExtractResponse)
async def extract_events(req: ExtractRequest) -> ExtractResponse:
    """Extract school events and dates from ClassDojo post text."""
    return _extract_from_text(req.text, req.post_id)


def _extract_from_text(text: str, source_id: str) -> ExtractResponse:
    """Shared extraction logic used by both /extract and /extract-pdf."""
    if not text.strip():
        return ExtractResponse(events=[], photos=[])

    # Split text into paragraphs/blocks and process each for events
    all_events: list[ExtractedEvent] = []
    seen_hashes: set[str] = set()

    # Process the full text as one block first
    blocks = [text]
    # Also split by double newlines for paragraph-level extraction
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    if len(paragraphs) > 1:
        blocks = paragraphs

    for block in blocks:
        category = classify_category(block)
        title = extract_title(block)

        date_texts: list[str] = [
            m.group() for m in DATE_EXPR.finditer(block)
            if is_valid_date_text(m.group())
        ]

        if not date_texts:
            try:
                from dateparser.search import search_dates
                found = search_dates(
                    block, settings={"PREFER_DATES_FROM": "future"}
                ) or []
                date_texts = [
                    dt_text for dt_text, _ in found if is_valid_date_text(dt_text)
                ]
            except Exception:
                pass

        for raw_date in date_texts:
            dedup = f"{title.lower()}|{raw_date.lower()}"
            if dedup in seen_hashes:
                continue
            seen_hashes.add(dedup)

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

            all_events.append(ExtractedEvent(
                title=title,
                raw_date_text=raw_date,
                iso_date=iso_date,
                is_all_day=is_all_day,
                category=category,
            ))

        # Category-only event with no date
        if not date_texts and category != "general":
            dedup = f"{title.lower()}|nodate"
            if dedup not in seen_hashes:
                seen_hashes.add(dedup)
                all_events.append(ExtractedEvent(
                    title=title,
                    raw_date_text="(no date detected)",
                    iso_date=None,
                    is_all_day=True,
                    category=category,
                ))

    return ExtractResponse(events=all_events, photos=[])


class PDFExtractResponse(BaseModel):
    """Response for PDF extraction — includes raw text and extracted events."""
    text: str
    page_count: int
    events: list[ExtractedEvent]
    photos: list[ExtractedPhoto]


@app.post("/extract-pdf", response_model=PDFExtractResponse)
async def extract_pdf(
    file: UploadFile = File(...),
    source_id: str = Form(default="pdf-upload"),
):
    """Extract school events from an uploaded PDF document.

    Accepts multipart form upload of a PDF file. Extracts text from all pages,
    then runs the same NLP event extraction pipeline used for ClassDojo posts.
    Designed for school newsletters, calendars, and flyer PDFs.
    """
    from pypdf import PdfReader

    contents = await file.read()
    reader = PdfReader(io.BytesIO(contents))

    pages_text: list[str] = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        if page_text.strip():
            pages_text.append(page_text.strip())

    full_text = "\n\n".join(pages_text)
    page_count = len(reader.pages)

    # Run standard event extraction on the full PDF text
    result = _extract_from_text(full_text, source_id)

    return PDFExtractResponse(
        text=full_text[:5000],  # Cap raw text at 5KB for response
        page_count=page_count,
        events=result.events,
        photos=result.photos,
    )


@app.get("/health")
async def health():
    return {"status": "ok", "engine": "regex+dateparser+pdf"}
