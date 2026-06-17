/**
 * Hermes Questionnaire → Google Sheets
 * Paste this into: Extensions → Apps Script in your spreadsheet
 * Deploy as: Web App (Execute as: Me, Access: Anyone)
 */

const SPREADSHEET_ID = "1IQJrKRx7-ik-nqXWDwpxcr_nP2EFIhfdGIl2dqvWz5I";
const SHEET_NAME = "\uD83D\uDCCB Respuestas";
const HEADER_ROW = 2;

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    const headers = sheet.getRange(HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];

    const row = [];
    for (let col = 0; col < headers.length; col++) {
      const key = extractKey(headers[col]);
      if (key === "timestamp") {
        row.push(new Date());
      } else if (data[key] !== undefined) {
        row.push(data[key]);
      } else {
        row.push("");
      }
    }

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: "Use POST" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function extractKey(header) {
  const match = header.match(/.*\(([^)]+)\)/);
  if (match) return match[1].toLowerCase();
  const lower = header.toString().toLowerCase();
  if (lower === "timestamp") return "timestamp";
  return lower;
}
