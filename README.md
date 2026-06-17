# Hermes Agent Questionnaire

Discovery form for Hermes AI Agent onboarding. Submits responses to a Google Sheet via Apps Script.

## Setup

### 1. Deploy Google Apps Script

1. Open the spreadsheet: https://docs.google.com/spreadsheets/d/1IQJrKRx7-ik-nqXWDwpxcr_nP2EFIhfdGIl2dqvWz5I/
2. Go to **Extensions → Apps Script**
3. Delete the placeholder code and paste the contents of `APPS_SCRIPT_CODE.gs`
4. Click **Deploy → New deployment**
5. Select **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy** and copy the Web App URL

### 2. Update the Form

Open `index.html` and replace `YOUR_APPS_SCRIPT_URL_HERE` with the URL from step 1.

### 3. Open in Browser

Open `index.html` in any browser, fill out the form, and submit. Data will appear in the spreadsheet.
