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

    // Best-effort: generate SOUL.md / Agent-Design.md in Drive. Must never break
    // the response above — the row is already safely written at this point.
    try {
      generateAgentDocs(data);
    } catch (genErr) {
      console.error("SOUL.md/Agent-Design.md generation failed:", genErr);
    }

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
  var fields = ["formspree_id","fuente","nombre","_replyto","rol","area_trabajo","area_otro","edad","trayectoria","tiempo_coord","tenure_otro","clientes","proyectos","proyectos_personales","semana_tipica","herramientas","tools_otro","sistema_op","sistema_op_otro","nivel_tech","exp_ai","usa_terminal","tareas_diarias","tareas_semanales","tareas_mensuales","proc_repetitivos","automatizar","info_repetitiva","se_pierde","directividad","idioma","proactividad","nunca","agente_nombre","agente_nombre_razon","agente_genero","agente_arquetipo","agente_humor","agente_trato","apodo","agente_reslen","habilidades","aprendizaje","apoyo","plataforma_chat","zona_horaria","zona_horaria_otro","pref_modelo_ia","pref_modelo_ia_otro"];
  for (var i = 0; i < fields.length; i++) {
    if (cleaned.indexOf("(" + fields[i] + ")") !== -1) return fields[i];
  }
  var lower = cleaned.toLowerCase();
  if (lower.indexOf("timestamp") !== -1) return "timestamp";
  return lower;
}

const OUTPUT_FOLDER_NAME = "Hermes Agent — SOUL Files";

// Writes <agent>-SOUL.md and <agent>-Agent-Design.md to Drive for one submission.
// Section structure follows the spreadsheet's own "🗺️ Mapeo SOUL.md" tab:
// SOUL.md stays the tight, always-loaded persona/behavior file; Agent-Design.md
// is the one-time build/ops brief (work context, recurring tasks, automation
// targets, growth goals, deployment prefs) — reference material, not something
// reloaded every turn.
function generateAgentDocs(data) {
  const folder = getOrCreateOutputFolder();
  const person = data.nombre || "Sin nombre";
  const agentName = data.agente_nombre || person;
  const safeAgentName = agentName.toString().replace(/[\\\/:*?"<>|]/g, "").trim() || "agente";

  const soul = buildSoulMd(data, person, agentName);
  const design = buildAgentDesignMd(data, person, agentName);

  folder.createFile(safeAgentName + "-SOUL.md", soul, MimeType.PLAIN_TEXT);
  folder.createFile(safeAgentName + "-Agent-Design.md", design, MimeType.PLAIN_TEXT);
}

function getOrCreateOutputFolder() {
  const ss = DriveApp.getFileById(SPREADSHEET_ID);
  const parents = ss.getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const existing = parent.getFoldersByName(OUTPUT_FOLDER_NAME);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(OUTPUT_FOLDER_NAME);
}

function field(data, key, fallback) {
  const v = data[key];
  return (v === undefined || v === null || v === "") ? (fallback || "_(sin respuesta)_") : v;
}

function buildSoulMd(data, person, agentName) {
  return [
    "# " + agentName + " — SOUL.md",
    "",
    "## Identity",
    "You are " + agentName + ", the personal AI agent for " + person + " at Coordenadas.co.",
    "- Voice / gender: " + field(data, "agente_genero"),
    "- Personality archetype: " + field(data, "agente_arquetipo"),
    "",
    "## Who " + person + " is",
    "- Role: " + field(data, "rol"),
    "- Work domain: " + field(data, "area_trabajo"),
    "- Background: " + field(data, "trayectoria"),
    "- Tenure at Coordenadas: " + field(data, "tiempo_coord"),
    "- Active clients: " + field(data, "clientes"),
    "- Active projects: " + field(data, "proyectos"),
    "- Personal projects: " + field(data, "proyectos_personales"),
    "- Tools used daily: " + field(data, "herramientas"),
    "",
    "## Technical Advisor",
    "- Operating system: " + field(data, "sistema_op"),
    "- Comfort with technology: " + field(data, "nivel_tech"),
    "- Experience with AI tools: " + field(data, "exp_ai"),
    "- Terminal / command line: " + field(data, "usa_terminal"),
    "",
    "## Communication Rules",
    "- Directness: " + field(data, "directividad"),
    "- Language: " + field(data, "idioma"),
    "- Proactivity: " + field(data, "proactividad"),
    "- Humor: " + field(data, "agente_humor"),
    "- How to address " + person + ": " + field(data, "agente_trato") + (data.apodo ? " (\"" + data.apodo + "\")" : ""),
    "- Default response length: " + field(data, "agente_reslen"),
    "- Never do: " + field(data, "nunca"),
    ""
  ].join("\n");
}

function buildAgentDesignMd(data, person, agentName) {
  return [
    "# " + agentName + " — Agent-Design.md",
    "",
    "Build/ops brief for " + person + "'s agent. Reference material for scaffolding — not reloaded every turn.",
    "",
    "## Recurring Processes",
    "- Daily: " + field(data, "tareas_diarias"),
    "- Weekly: " + field(data, "tareas_semanales"),
    "- Monthly: " + field(data, "tareas_mensuales"),
    "- Repetitive-but-necessary patterns: " + field(data, "proc_repetitivos"),
    "",
    "## Automation Targets",
    "- Priority list (first Skills to build): " + field(data, "automatizar"),
    "",
    "## Chief of Staff",
    "- Quick-access knowledge " + person + " searches for repeatedly: " + field(data, "info_repetitiva"),
    "- What tends to fall through the cracks (proactive monitoring): " + field(data, "se_pierde"),
    "",
    "## Learning Coach",
    "- Current skills being developed: " + field(data, "habilidades"),
    "- 6-month learning targets: " + field(data, "aprendizaje"),
    "- How the agent should support growth: " + field(data, "apoyo"),
    "",
    "## Deployment Preferences",
    "- Preferred chat platform: " + field(data, "plataforma_chat"),
    "- Timezone: " + field(data, "zona_horaria"),
    "- AI model/provider preference: " + field(data, "pref_modelo_ia") + " (requires an OpenCode Go subscription, $10 USD/month)",
    ""
  ].join("\n");
}
