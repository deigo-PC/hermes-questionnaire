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
| 🔌 Apps Script Web App URL | https://script.google.com/macros/s/AKfycbxtMKN5_JW2TCkP2XZ8JcRnekOwPlD1NQ7RSuv2-OhPGD-IUQd27NFRcz66bTIotJCc/exec |

## How It Works

```
Team member fills the form (GitHub Pages, 10 steps)
        ↓  POST with mode: "no-cors", body: JSON (text/plain)
Google Apps Script Web App (doPost handler)
        ↓  maps each column header → field name, appends a row
Google Sheets — "📋 Respuestas" tab
        ↓  best-effort, wrapped so it can never break the row write above
Google Drive — "Hermes Agent — Respuestas del Equipo/<agent>/" subfolder
        ↓  SOUL.md + Agent-Design.md + Full-Profile.md + a zip of all three
        ↓  client fetches the links back via a JSONP GET (doGet?action=links)
Thank-you screen — one download button (zip of all three files)
```

- The form collects all answers into a flat JSON object.
- Apps Script reads the header row (row 2), extracts each column's field name from the `(field_name)` suffix, and writes the matching value into a new row.
- After the row is written, Apps Script also generates three files into a per-agent subfolder under `Hermes Agent — Respuestas del Equipo/` in Drive (created automatically at the top level of "My Drive" on first run — always the same predictable place, regardless of where the spreadsheet itself lives):
  - `SOUL.md` — identity, who the user is, a **Voice Sample** (the user's own writing quoted verbatim from a few of their free-text answers, so the agent can infer their natural tone/register rather than being told about it secondhand), technical profile, communication rules. The tight, always-loaded persona/behavior file.
  - `Agent-Design.md` — recurring processes, automation targets, growth goals, deployment preferences. A one-time build/ops brief, not reloaded every turn.
  - `Full-Profile.md` — the complete, unfiltered record of every answer, organized by the form's own 10 sections. Exists so nothing is ever lost regardless of how the other two files' curation evolves.
  
  Re-submitting under the same agent name replaces all three files (plus the zip) rather than piling up duplicates. This replaces the previously manual step of hand-writing those files from the sheet's "🗺️ Mapeo SOUL.md" tab.
- If you hand-edit a row directly in the sheet after the fact, the files don't update automatically — use the **🔮 Hermes → Regenerar archivos (fila seleccionada)** menu (click any cell in that row first) to regenerate from the edited values. Manual on purpose, not an auto-trigger on every keystroke — see the comment above `onOpen()` in `APPS_SCRIPT_CODE.gs` for why.
- Because the POST is `no-cors` (required for Apps Script — the browser can never read that response), the client can't get file links back from the POST itself. Instead, right after the POST resolves, the page loads a `<script>` tag pointed at `doGet(...)?action=links&agent=<name>&callback=...` (JSONP — not subject to CORS) to fetch the zip's download link, then reveals it as a button on the thank-you screen. If that lookup fails for any reason, the form still shows the normal thank-you message — the download button is best-effort, never a blocker.
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
- Step 9 adds `plataforma_chat`, `zona_horaria`, `zona_horaria_otro`, `pref_modelo_ia`, `pref_modelo_ia_otro` to the payload, and Q11b adds `dispositivos`. `extractKey` already recognizes all of them; add matching columns to the sheet whenever convenient — none of this is required for the generated `.md` files, which read straight from the submitted payload, not from the sheet.
- Q11b ("¿Qué dispositivos tienes?", `dispositivos`) is a repeatable device list, not a fixed option grid — each row picks a device type and an OS from a dropdown (with "Otro" free text), and submits as a single comma-joined string like `Laptop (macOS), PC (Torre) (Windows)`. Handled separately from `buildGrid()` in `index.html`'s `renderDeviceRows()`/`serializeDevices()`, since it needs add/remove rows rather than a fixed set of checkboxes.