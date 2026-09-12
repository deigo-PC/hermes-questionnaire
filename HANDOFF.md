# Handoff Document: Hermes Agent Questionnaire → Google Sheets Pipeline

## Project Overview

**Repository**: `https://github.com/deigo-PC/hermes-questionnaire`
**Live Form**: `https://deigo-pc.github.io/hermes-questionnaire/`
**Spreadsheet**: `https://docs.google.com/spreadsheets/d/1IQJrKRx7-ik-nqXWDwpxcr_nP2EFIhfdGIl2dqvWz5I/`
**Apps Script Web App URL**: `https://script.google.com/macros/s/AKfycbxBcwrUtSlXiZNkTKhtHu9Pp0Eakh0A4pHruUM3D6SuWwHhNnQ5ibfoH1MLSasXK9Yx/exec`

---

## Purpose

Onboarding/discovery questionnaire for the **Hermes AI Agent** at Coordenadas.co. Each team member fills it out so Diego can build a personal agent tailored to their role, work patterns, technical level, and communication preferences.

The form is:
- **Bilingual** (Spanish/English)
- **Zero-dependency** — single HTML file (inline SVG logo, no external assets)
- **Hosted on GitHub Pages** — static, zero-cost
- **Submits to Google Sheets** via Apps Script Web App

---

## Files in Repo

| File | Purpose |
|------|---------|
| `index.html` | Standalone form with 8-step wizard, 35 fields, i18n (ES/EN), validation, inline SVG logo |
| `APPS_SCRIPT_CODE.gs` | Apps Script `doPost` handler + `extractKey` field-name lookup |
| `README.md` | Purpose, quick links, how-it-works, setup, spreadsheet structure |

---

## How It Works (Data Flow)

```
User submits form (GitHub Pages)
    ↓ fetch(mode: 'no-cors', body: JSON.stringify(data)) — text/plain
Google Apps Script Web App (doPost)
    ↓ JSON.parse → read header row → extractKey() → build row → appendRow()
Google Sheets — "📋 Respuestas" tab
```

---

## Critical Bugs Fixed (Must-Know for Next LLM)

| Bug | Root Cause | Fix |
|-----|------------|-----|
| **CORS error** — submit showed "Error — try again" | Apps Script doesn't return `Access-Control-Allow-Origin`; browser blocked reading response | `fetch(..., {mode: 'no-cors'})` — request goes through (text/plain is CORS-safe), opaque response ignored, success shown on no network error |
| **`crypto.randomUUID()` crash** | `crypto` not available in all contexts (file://, older browsers) | Fallback: `typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"id-"+Date.now()+"-"+Math.random()...` |
| **`extractKey` matched `(s)` not `(area_trabajo)`** | Regex `\(([^)]+)\)` found FIRST paren group. Header `Área(s) de trabajo principal\n(area_trabajo)` matched `(s)` | Final fix: **field-name lookup** — `cleaned.indexOf("(" + fields[i] + ")")` checks if `"(area_trabajo)"` appears anywhere. Zero regex ambiguity. |
| **Merged cells (X1:AA1) crashed debug line** | `sheet.getRange("Z1").setValue(...)` crashed silently because Z1 was merged with X/Y/AA | Unmerge cells; merge text overwritten by debug line |
| **Stale deployment** | **Manage → pencil → Deploy** sometimes serves old cached code | **Always use "Deploy → New deployment"** (big blue button) for clean compile |

---

## Current State (What Works)

- ✅ Form submits successfully (no-cors)
- ✅ All 35 fields captured (text, radio, checkbox grids, textareas)
- ✅ Checkbox grids stored as comma-separated; "Other" merged as `Otro: <text>`
- ✅ Multilingual ES/EN with random success messages
- ✅ Apps Script maps headers dynamically via `(field_name)` suffix
- ✅ Form live at `https://deigo-pc.github.io/hermes-questionnaire/`
- ✅ Spreadsheet receives submissions correctly (column G = `area_trabajo`)

---

## Files in Repo (Key Sections)

### `index.html` — Form
- `collectFormData()` builds flat object from all inputs
- Checkbox grids collected via `querySelectorAll('[name="..."]:checked')`
- "Other" text inputs merged into same cell: `Otro: <text>`
- `mode: 'no-cors'` fetch to Apps Script URL
- Multilingual via `T[lang]` object with 35+ keys per language

### `APPS_SCRIPT_CODE.gs` — Backend
```javascript
function extractKey(header) {
  const cleaned = header.toString().replace(/[\r\n]+/g, " ").toLowerCase();
  var fields = ["nombre","_replyto","rol","area_trabajo","area_otro",...]; // 43 fields
  for (var i = 0; i < fields.length; i++) {
    if (cleaned.indexOf("(" + fields[i] + ")") !== -1) return fields[i];
  }
  var lower = cleaned.toLowerCase();
  if (lower.indexOf("timestamp") !== -1) return "timestamp";
  return lower;
}
```

### Spreadsheet Structure
- **Row 2** = headers, must contain `(field_name)` suffix (e.g. `Área(s) de trabajo principal (area_trabajo)`)
- **Row 3+** = submissions
- Columns A–AS (45 cols); headers must match form field names exactly

---

## Deployment Commands

```bash
# Push form URL change
git add index.html && git commit -m "Update Apps Script URL" && git push

# gh CLI handles auth (token embedded in remote URL expires; gh auth setup-git configures git to use gh's valid token)
```

---

## Known Gotchas for Next LLM

1. **Always use "Deploy → New deployment"** — never pencil-redeploy
2. **Never trust `getLastColumn()` blindly** — stray text in far-right cells inflates it. If columns A–AS (45), hardcode `45` or clean the sheet
3. **Z1 merged with X:AA** — unmerged now, but any merged cells in row 1 can crash `getRange("Z1")`
4. **No-cors hides responses** — form always shows success even if Apps Script returns error. Add `console.log` or debug line for diagnosis
5. **Token auth** — GitHub remote had embedded PAT that expired; `gh auth setup-git` configures git to use gh CLI's valid token

---

## Next Steps / Future Work

- [ ] Add column `Razón del nombre (agente_nombre_razon)` to spreadsheet header
- [ ] If adding new fields: update form, spreadsheet header, and `fields` array in `extractKey`
- [ ] Consider removing `no-cors` and adding CORS headers to Apps Script (requires `ContentService` with custom headers — not natively supported, needs workaround)

---

## Session Summary

**Problem**: Connect standalone HTML form to Google Sheets via Apps Script
**Solution**: Built complete pipeline — form (GitHub Pages) → Apps Script (no-cors) → Sheets
**Critical Fixes**: CORS via no-cors, extractKey via field-name lookup, deployment via New deployment
**Status**: ✅ Working end-to-end