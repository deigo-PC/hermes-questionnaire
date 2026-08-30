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
| 🔌 Apps Script Web App URL | https://script.google.com/macros/s/AKfycbxBcwrUtSlXiZNkTKhtHu9Pp0Eakh0A4pHruUM3D6SuWwHhNnQ5ibfoH1MLSasXK9Yx/exec |

## How It Works

```
Team member fills the form (GitHub Pages)
        ↓  POST with mode: "no-cors", body: JSON (text/plain)
Google Apps Script Web App (doPost handler)
        ↓  maps each column header → field name, appends a row
Google Sheets — "📋 Respuestas" tab
```

- The form collects all answers into a flat JSON object.
- Apps Script reads the header row (row 2), extracts each column's field name from the `(field_name)` suffix, and writes the matching value into a new row.
- No page reload, no external dependencies, works from any static host.

## Setup

### 1. Deploy Google Apps Script

1. Open the spreadsheet: https://docs.google.com/spreadsheets/d/1IQJrKRx7-ik-nqXWDwpxcr_nP2EFIhfdGIl2dqvWz5I/
2. Go to **Extensions → Apps Script**
3. Delete the placeholder code and paste the contents of `APPS_SCRIPT_CODE.gs`
4. Click **Deploy → New deployment** (always use **New deployment**, not the pencil — the pencil can serve stale cached code)
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