"""Tests for the NLP extraction service."""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestHealthEndpoint:
    def test_health_returns_ok(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestExtractEndpoint:
    def test_empty_text_returns_empty(self):
        resp = client.post("/extract", json={"text": "", "post_id": "test1"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["events"] == []
        assert data["photos"] == []

    def test_extracts_date_from_simple_post(self):
        resp = client.post("/extract", json={
            "text": "Picture day is this Friday at 8:30am! Please bring your forms.",
            "post_id": "test2",
        })
        data = resp.json()
        assert len(data["events"]) >= 1
        event = data["events"][0]
        assert event["category"] == "special"
        assert event["iso_date"] is not None

    def test_detects_early_dismissal(self):
        resp = client.post("/extract", json={
            "text": "Reminder: early dismissal next Wednesday at 1:30pm due to staff development.",
            "post_id": "test3",
        })
        data = resp.json()
        assert len(data["events"]) >= 1
        assert data["events"][0]["category"] == "dismissal"

    def test_detects_school_closure(self):
        resp = client.post("/extract", json={
            "text": "Due to the weather forecast, there will be no school tomorrow.",
            "post_id": "test4",
        })
        data = resp.json()
        assert len(data["events"]) >= 1
        assert data["events"][0]["category"] == "closure"

    def test_detects_all_day_event(self):
        resp = client.post("/extract", json={
            "text": "Spirit week starts next Monday! Monday is pajama day.",
            "post_id": "test5",
        })
        data = resp.json()
        assert len(data["events"]) >= 1
        event = data["events"][0]
        assert event["is_all_day"] is True

    def test_detects_timed_event(self):
        resp = client.post("/extract", json={
            "text": "The assembly will be on Thursday at 2:00pm in the gym.",
            "post_id": "test6",
        })
        data = resp.json()
        assert len(data["events"]) >= 1
        event = data["events"][0]
        assert event["is_all_day"] is False

    def test_detects_admin_event(self):
        resp = client.post("/extract", json={
            "text": "Parent conference sign-ups are open! Conferences will be held next Tuesday.",
            "post_id": "test7",
        })
        data = resp.json()
        assert len(data["events"]) >= 1
        assert data["events"][0]["category"] == "admin"

    def test_no_date_still_creates_event_for_school_terms(self):
        resp = client.post("/extract", json={
            "text": "Don't forget about spirit week! More details coming soon.",
            "post_id": "test8",
        })
        data = resp.json()
        assert len(data["events"]) >= 1
        assert data["events"][0]["iso_date"] is None
        assert data["events"][0]["category"] == "special"

    def test_general_post_without_school_terms_returns_no_events(self):
        resp = client.post("/extract", json={
            "text": "Great job today, class! Keep up the wonderful work!",
            "post_id": "test9",
        })
        data = resp.json()
        assert data["events"] == []

    def test_multiple_dates_in_one_post(self):
        resp = client.post("/extract", json={
            "text": "Field trip on Friday. Permission slips due by Wednesday.",
            "post_id": "test10",
        })
        data = resp.json()
        assert len(data["events"]) >= 1
