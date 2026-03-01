"""
SchoolBridge NLP Microservice

Extracts school events, dates, and photo references from ClassDojo post text.
Uses spaCy for NER + PhraseMatcher and dateparser for date normalization.
"""

import re
from typing import Optional

import dateparser
import spacy
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from spacy.matcher import PhraseMatcher

app = FastAPI(title="SchoolBridge NLP Service", version="0.1.0")

# Load spaCy model and set up matchers
nlp = spacy.load("en_core_web_sm")
phrase_matcher = PhraseMatcher(nlp.vocab, attr="LOWER")

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

for label, terms in SCHOOL_TERMS.items():
    patterns = [nlp.make_doc(t) for t in terms]
    phrase_matcher.add(label.upper(), patterns)

DAY_PATTERN = re.compile(
    r"\b(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday"
    r"|saturday|sunday|today|tomorrow|tonight|\d{1,2}[/-]\d{1,2})\b",
    re.IGNORECASE,
)

TIME_INDICATORS = {"am", "pm", ":", "o'clock", "noon", "midnight"}


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


def classify_category(doc: spacy.tokens.Doc) -> str:
    """Determine the school event category from PhraseMatcher results."""
    matches = phrase_matcher(doc)
    if not matches:
        return "general"
    categories = {nlp.vocab.strings[match_id] for match_id, _, _ in matches}
    # Priority order: closure > dismissal > admin > special > general
    for priority in ["CLOSURE", "DISMISSAL", "ADMIN", "SPECIAL"]:
        if priority in categories:
            return priority.lower()
    return "general"


def extract_title(doc: spacy.tokens.Doc, body: str) -> str:
    """Extract a reasonable event title from the text."""
    # Use the first noun chunk as the title
    chunks = list(doc.noun_chunks)
    if chunks:
        title = chunks[0].text.strip()
        if len(title) > 5:
            return title.title()
    # Fall back to first sentence or first 60 chars
    first_sentence = body.split(".")[0].strip()
    return first_sentence[:60] if first_sentence else body[:60]


def is_valid_date_entity(text: str) -> bool:
    """Filter out weak date matches (e.g., 'see you', 'thanks')."""
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

    doc = nlp(req.text)
    category = classify_category(doc)
    title = extract_title(doc, req.text)

    # Collect date candidates from spaCy NER
    date_texts: list[str] = [
        ent.text for ent in doc.ents
        if ent.label_ == "DATE" and is_valid_date_entity(ent.text)
    ]

    # Fallback: use dateparser's search_dates
    if not date_texts:
        try:
            from dateparser.search import search_dates
            found = search_dates(
                req.text, settings={"PREFER_DATES_FROM": "future"}
            ) or []
            date_texts = [
                text for text, _ in found if is_valid_date_entity(text)
            ]
        except Exception:
            pass

    events: list[ExtractedEvent] = []
    seen_dates: set[str] = set()

    for raw_date in date_texts:
        # Deduplicate
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
    return {"status": "ok", "model": "en_core_web_sm"}
