# Hermes Agent Questionnaire

Onboarding/discovery questionnaire for the **Hermes AI Agent** at Coordenadas.co. Each team member fills it out so Diego can build a personal agent tailored to their role, work patterns, technical level, and communication preferences.

The form is **bilingual (Spanish / English)**, **zero-dependency** (a single HTML file — the logo is an inline SVG), and hosted on **GitHub Pages**. Responses are stored automatically in a Google Sheet via an Apps Script Web App.

## Quick Links

| What | Link |
|------|------|
| 🔗 **Live form** | https://deigo-pc.github.io/hermes-questionnaire/ |
| 📂 GitHub repo | https://github.com/deigo-PC/hermes-questionnaire |
| 📊 Responses spreadsheet | https://docs.google.com/spreadsheets/d/1IQJrKRx7-ik-nqXWDwpxcr_nP2EFIhfdGIl2dqvWz5I/ |
| ⚙️ Apps Script editor | Spreadsheet → **Extensions → Apps Script** |
| 🔌 Apps Script Web App URL | https://script.google.com/macros/s/AKfycbzM_x4a8tDUI9zvMDxLyvoSctmzhlt13gZk8r5FDvrV8hE2j0FYCEAbQ1t-2dTV_ky6/exec |

## How It Works

```
Team member fills the form (GitHub Pages, 9 steps)
        ↓  POST with mode: "no-cors", body: JSON (text/plain)
Google Apps Script Web App (doPost handler)
        ↓  maps each column header → field name, appends a row
Google Sheets — "📋 Respuestas" tab
        ↓  best-effort, wrapped so it can never break the row write above
Google Drive — "Hermes Agent — SOUL Files/<agent>/" subfolder
        ↓  SOUL.md + Agent-Design.md, auto-generated per submission
        ↓  client fetches the links back via a JSONP GET (doGet?action=links)
Thank-you screen — download buttons for both files
```

- The form collects all answers into a flat JSON object.
- Apps Script reads the header row (row 2), extracts each column's field name from the `(field_name)` suffix, and writes the matching value into a new row.
- After the row is written, Apps Script also generates `SOUL.md` (identity, who the user is, technical profile, communication rules — the tight persona file meant to be loaded every turn) and `Agent-Design.md` (recurring processes, automation targets, growth goals, deployment preferences — a one-time build/ops brief) into a per-agent subfolder under `Hermes Agent — SOUL Files/` in Drive (created automatically next to the spreadsheet on first run). Re-submitting under the same agent name replaces the previous two files rather than piling up duplicates. This replaces the previously manual step of hand-writing those files from the sheet's "🗺️ Mapeo SOUL.md" tab.
- Because the POST is `no-cors` (required for Apps Script — the browser can never read that response), the client can't get file links back from the POST itself. Instead, right after the POST resolves, the page loads a `<script>` tag pointed at `doGet(...)?action=links&agent=<name>&callback=...` (JSONP — not subject to CORS) to fetch the two Drive download links, then reveals them as buttons on the thank-you screen. If that lookup fails for any reason, the form still shows the normal thank-you message — the download buttons are best-effort, never a blocker.
- Step 9 ("Config técnica") collects deployment preferences (chat platform, timezone, AI model/provider preference) — every question there has a "No sé / no entiendo" opt-out, since these can be genuinely unfamiliar to non-technical team members. It also discloses real costs: WhatsApp bills per conversation via the Business API, and an OpenCode Go subscription ($10 USD/month) is required for any agent to function at all.
- No page reload, no external dependencies, works from any static host.

## Setup

### 1. Deploy Google Apps Script

1. Open the spreadsheet: https://docs.google.com/spreadsheets/d/1IQJrKRx7-ik-nqXWDwpxcr_nP2EFIhfdGIl2dqvWz5I/
2. Go to **Extensions → Apps Script**
3. Delete the placeholder code and paste the contents of `APPS_SCRIPT_CODE.gs`
4. Click **Deploy → New deployment** (always use **New deployment**, not the pencil — the pencil can serve stale cached code). The first run will prompt a one-time Google authorization screen for Drive access (used to write the generated `.md` files) — this is expected.
5. Select **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy** and copy the Web App URL

### 2. Update the Form

Open `index.html` and replace the value of `APPS_SCRIPT_URL` with the URL from step 1.

### 3. Test

Open the live form, fill it out, and submit. The row should appear in the spreadsheet.

## Spreadsheet Structure

- **Row 2** = column headers. Each header must contain the field name in parentheses, e.g. `Área(s) de trabajo principal (area_trabajo)`.
- **Row 3+** = responses (one row per submission).
- The script matches columns dynamically by the `(field_name)` suffix, so columns can be added/reordered as long as the suffix matches the form's field names.
- To add a new field: add the field to the form's `collectFormData()` in `index.html`, add a matching column header in the spreadsheet, and add the name to the `fields` array in `extractKey` in `APPS_SCRIPT_CODE.gs`.
- The `ID (formspree_id)` and `Fuente (fuente)` columns were previously always blank — the form sent them, but `extractKey`'s `fields` allowlist didn't include them. Fixed as of this update.
- Step 9 adds `plataforma_chat`, `zona_horaria`, `zona_horaria_otro`, `pref_modelo_ia`, `pref_modelo_ia_otro` to the payload. `extractKey` already recognizes them; add matching columns to the sheet whenever convenient — they aren't required for `SOUL.md`/`Agent-Design.md` generation, which reads straight from the submitted payload, not from the sheet.