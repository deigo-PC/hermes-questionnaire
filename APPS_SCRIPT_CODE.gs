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
  const cleaned = header.toString().replace(/[\r\n]+/g, " ").toLowerCase();
  var fields = ["nombre","_replyto","rol","area_trabajo","area_otro","edad","trayectoria","tiempo_coord","tenure_otro","clientes","proyectos","proyectos_personales","semana_tipica","herramientas","tools_otro","sistema_op","sistema_op_otro","nivel_tech","exp_ai","usa_terminal","tareas_diarias","tareas_semanales","tareas_mensuales","proc_repetitivos","automatizar","info_repetitiva","se_pierde","directividad","idioma","proactividad","nunca","agente_nombre","agente_nombre_razon","agente_genero","agente_arquetipo","agente_humor","agente_trato","apodo","agente_reslen","habilidades","aprendizaje","apoyo"];
  for (var i = 0; i < fields.length; i++) {
    if (cleaned.indexOf("(" + fields[i] + ")") !== -1) return fields[i];
  }
  var lower = cleaned.toLowerCase();
  if (lower.indexOf("timestamp") !== -1) return "timestamp";
  return lower;
}
