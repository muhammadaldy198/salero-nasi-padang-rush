#!/usr/bin/env python3
"""shoot.py — SALERO screenshot shooter (Playwright, office venv).

Serves game/ on localhost, visits ?shot=<name>&seed=1 for each shot, waits for
window.__SALERO_READY__, asserts the 5 required elements from the staged
state in code, and writes a JPEG (quality 82) to screenshots/.

Cover rule: the FIRST file by name is the cover, so the play shot is
1-play.jpg — the frame the judge sees largest on the contact sheet.
Fails on ANY request outside localhost (no-network rule) and on any shot
over the 256 KiB cap.

Run: ~/workspace/office/.venv/bin/python scripts/shoot.py
"""
import hashlib
import json
import os
import subprocess
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
GAME = HERE / "game"
SHOTS = HERE / "screenshots"
PORT = 8123

# (shot name, output file) — dossier order: cover first.
PLAN = [
    ("play", "1-play.jpg"),
    ("rush", "2-rush.jpg"),
    ("start", "3-start.jpg"),
    ("end", "4-end.jpg"),
]


def serve():
    os.chdir(GAME)
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), SimpleHTTPRequestHandler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def check_state(name, st):
    """Code-level assertions: the 5 required elements must be present."""
    missing = []
    if name in ("play", "rush"):
        if len(st["orders"]) < 3:
            missing.append("order board <3 tickets")
        plates = [p for p in st["plates"]["onCounter"] if p]
        mid = any(1 <= len(p["items"]) < 3 for p in plates)
        carried_plate = st["chef"]["carrying"] and st["chef"]["carrying"]["kind"] == "plate"
        if not mid and not carried_plate:
            missing.append("no dish mid-assembly on a plate")
        cooking = any(st["stations"][s]["item"] for s in ("wok", "grill"))
        if not cooking:
            missing.append("no food on a heat station")
        if not (0 < st["timeLeft"] <= 180):
            missing.append("timer out of range")
        if name == "rush":
            if not any(o["patience"] / o["maxPatience"] < 0.25 for o in st["orders"]):
                missing.append("no red-patience ticket in rush shot")
            if not carried_plate:
                missing.append("no ready plate carried in rush shot")
    if name == "start" and st["phase"] != "title":
        missing.append("start shot is not the title screen")
    if name == "end" and (st["phase"] != "over" or st["score"] <= 0):
        missing.append("end shot has no final score")
    return missing


def main():
    from playwright.sync_api import sync_playwright

    SHOTS.mkdir(exist_ok=True)
    serve()
    time.sleep(0.5)
    bad_requests = []
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        def on_request(req):
            if "127.0.0.1" not in req.url and "localhost" not in req.url:
                bad_requests.append(req.url)

        page.on("request", on_request)
        page.on("console", lambda m: print("CONSOLE:", m.type, m.text) if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: print("PAGEERROR:", e))

        for name, fname in PLAN:
            page.goto(f"http://127.0.0.1:{PORT}/index.html?shot={name}&seed=1")
            page.wait_for_function("window.__SALERO_READY__ === true", timeout=15000)
            page.wait_for_timeout(300)
            st = page.evaluate("window.__SALERO_STATE__")
            missing = check_state(name, st)
            if missing:
                print(f"FAIL {name}: missing {missing}")
                sys.exit(1)
            path = SHOTS / fname
            # Screenshot the canvas element only — the page hint bar below
            # the canvas must never leak into a dossier image.
            page.locator("#game").screenshot(path=str(path), type="jpeg", quality=82)
            size = path.stat().st_size
            sha = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
            results[fname] = {"size": size, "sha": sha}
            print(f"OK {fname}: {size} bytes sha={sha}")
            if size > 262144:
                print(f"FAIL {fname}: over 256 KiB cap")
                sys.exit(1)
        browser.close()
    if bad_requests:
        print("FAIL: non-local requests:", bad_requests)
        sys.exit(1)
    print("ALL SHOTS OK — no external requests, all under cap")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
