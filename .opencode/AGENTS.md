# Project: Hermes Questionnaire

## Purpose
Standalone HTML questionnaire form for Hermes AI Agent onboarding/discovery, submitting responses to a Google Sheet via Google Apps Script.

## Tech Stack
- Language/Runtime: HTML, JavaScript, Google Apps Script (.gs)
- Key frameworks: None (vanilla JS)

## Key File Map
- `index.html` — the questionnaire form (requires Apps Script URL injected before use)
- `APPS_SCRIPT_CODE.gs` — Google Apps Script that processes form submissions to Google Sheets

## Conventions
- No framework, no build step
- Deploy: publish Apps Script as web app, paste URL into index.html

## Important Decisions
- Simple single-page form approach — no SPA framework needed
