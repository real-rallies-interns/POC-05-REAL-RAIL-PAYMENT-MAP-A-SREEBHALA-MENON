"""
test_poc.py
Automated UAT (User Acceptance Testing) script for the
Real Rails - Global RTP Intelligence PoC.

Runs against the live Azure deployment and verifies:
  1. Visual Load     - background / map container is visible
  2. The Handshake    - clicking a map node opens the Intelligence Panel
  3. The Signature    - clicking the (i) icon shows the developer's name

Produces Test_Report.txt with Pass/Fail for each step.
"""

import time
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

# ─── Configuration ──────────────────────────────────────────────────────────
TARGET_URL = "https://rtp-frontend-app.azurewebsites.net"
WAIT_TIMEOUT = 20  # seconds, generous for cloud cold-starts
HEADLESS = False   # flip to True once the script is verified working

EXPECTED_NAME = "A Sreebhala Menon"

# ─── Set up the browser ─────────────────────────────────────────────────────
def get_driver():
    options = webdriver.EdgeOptions()
    if HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1600,1000")
    driver = webdriver.Edge(options=options)
    return driver


def run_tests():
    results = []  # list of (test_name, passed: bool, detail: str)
    driver = get_driver()
    wait = WebDriverWait(driver, WAIT_TIMEOUT)

    try:
        # ── Navigate ────────────────────────────────────────────────────────
        driver.get(TARGET_URL)

        # ── Test Case 1: Visual Load ────────────────────────────────────────
        try:
            map_container = wait.until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, "svg"))
            )
            is_displayed = map_container.is_displayed()
            results.append((
                "Test Case 1: Visual Load",
                is_displayed,
                "Map/visualization SVG container is visible." if is_displayed
                else "Map/visualization container found but not visible."
            ))
        except TimeoutException:
            results.append((
                "Test Case 1: Visual Load",
                False,
                "Timed out waiting for the map/visualization container to appear."
            ))

        # ── Test Case 2: The Handshake ─────────────────────────────────────
        try:
            node = wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, ".node-circle"))
            )
            node.click()

            panel = wait.until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, ".animate-slide-in"))
            )
            is_displayed = panel.is_displayed()
            results.append((
                "Test Case 2: The Handshake",
                is_displayed,
                "Intelligence Panel slid into view after clicking a node." if is_displayed
                else "Intelligence Panel element found but not visible."
            ))
        except TimeoutException:
            results.append((
                "Test Case 2: The Handshake",
                False,
                "Timed out: could not click a node or the Intelligence Panel never appeared."
            ))

        # ── Test Case 3: The Signature ──────────────────────────────────────
        try:
            info_button = wait.until(
                EC.element_to_be_clickable(
                    (By.CSS_SELECTOR, 'button[title="Developer Info"]')
                )
            )
            info_button.click()

            # Give the modal a brief moment to fade in
            name_present = wait.until(
                lambda d: EXPECTED_NAME in d.find_element(By.TAG_NAME, "body").text
            )
            results.append((
                "Test Case 3: The Signature",
                bool(name_present),
                f"Found '{EXPECTED_NAME}' in the Developer Info modal." if name_present
                else f"'{EXPECTED_NAME}' was not found in the modal."
            ))
        except TimeoutException:
            results.append((
                "Test Case 3: The Signature",
                False,
                "Timed out: could not click the Info icon or the name never appeared."
            ))

    finally:
        driver.quit()

    return results


def write_report(results):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    total = len(results)
    passed = sum(1 for _, ok, _ in results if ok)

    lines = []
    lines.append("=" * 60)
    lines.append("REAL RAILS - GLOBAL RTP INTELLIGENCE")
    lines.append("Automated UAT Report (Selenium)")
    lines.append("=" * 60)
    lines.append(f"Target URL : {TARGET_URL}")
    lines.append(f"Run at     : {timestamp}")
    lines.append("-" * 60)

    for name, ok, detail in results:
        status = "PASS" if ok else "FAIL"
        lines.append(f"[{status}] {name}")
        lines.append(f"        {detail}")
        lines.append("")

    lines.append("-" * 60)
    lines.append(f"RESULT: {passed}/{total} test cases passed.")
    if passed == total:
        lines.append("STATUS: 100% PASS - Automation Certified.")
    else:
        lines.append("STATUS: Incomplete - review failures above.")
    lines.append("=" * 60)

    report_text = "\n".join(lines)
    with open("Test_Report.txt", "w", encoding="utf-8") as f:
        f.write(report_text)

    print(report_text)


if __name__ == "__main__":
    results = run_tests()
    write_report(results)
