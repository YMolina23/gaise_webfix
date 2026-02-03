import importlib
from fastapi.testclient import TestClient
import pytest

import src.app as app_module

@pytest.fixture(autouse=True)
def reset_app_module():
    # Reload module before each test to reset in-memory activities
    importlib.reload(app_module)


def test_root_redirect():
    client = TestClient(app_module.app)
    resp = client.get("/", follow_redirects=False)
    assert resp.status_code in (302, 307)
    assert resp.headers["location"] == "/static/index.html"


def test_get_activities():
    client = TestClient(app_module.app)
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert "Chess Club" in data


def test_signup_success_and_duplicate():
    client = TestClient(app_module.app)
    activity = "Chess Club"
    email = "test_student@mergington.edu"

    # Ensure student not already in participants
    assert email not in app_module.activities[activity]["participants"]

    # Sign up successfully
    resp = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 200
    assert email in resp.json()["message"]
    assert email in app_module.activities[activity]["participants"]

    # Duplicate signup returns 400
    resp = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Student already signed up for this activity"


def test_signup_nonexistent_activity():
    client = TestClient(app_module.app)
    resp = client.post("/activities/NoSuchActivity/signup", params={"email": "a@b.com"})
    assert resp.status_code == 404


def test_remove_participant_success_and_errors():
    client = TestClient(app_module.app)
    activity = "Chess Club"
    email = "michael@mergington.edu"  # existing participant in fixtures

    # Remove existing participant
    assert email in app_module.activities[activity]["participants"]
    resp = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert resp.status_code == 200
    assert email not in app_module.activities[activity]["participants"]

    # Removing non-existent participant returns 404
    resp = client.delete(f"/activities/{activity}/participants", params={"email": "noone@nowhere.com"})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Student not found in activity"

    # Removing from non-existent activity
    resp = client.delete("/activities/NoSuchActivity/participants", params={"email": "a@b.com"})
    assert resp.status_code == 404
