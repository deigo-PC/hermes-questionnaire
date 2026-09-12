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

// The form's POST uses mode:"no-cors" (required for Apps Script Web Apps —
// see README), which means the browser can never read that response. To
// still hand the submitter download links for their generated files, the
// client makes a follow-up JSONP GET here (script-tag load, not subject to
// CORS) right after the POST resolves, asking for the links by agent name.
function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.action === "links") {
    const callback = params.callback;
    const result = getAgentDocLinks(params.agent || "");
    const body = JSON.stringify(result);
    if (callback) {
      return ContentService
        .createTextOutput(callback + "(" + body + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: "Use POST" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function extractKey(header) {
  const cleaned = header.toString().replace(/[\r\n]+/g, " ").toLowerCase();
  var fields = ["formspree_id","fuente","nombre","_replyto","rol","area_trabajo","area_otro","edad","trayectoria","tiempo_coord","tenure_otro","clientes","proyectos","proyectos_personales","semana_tipica","herramientas","tools_otro","sistema_op","sistema_op_otro","nivel_tech","exp_ai","usa_terminal","tareas_diarias","tareas_semanales","tareas_mensuales","proc_repetitivos","automatizar","info_repetitiva","se_pierde","directividad","idioma","proactividad","nunca","agente_nombre","agente_nombre_razon","agente_genero","agente_arquetipo","agente_humor","agente_trato","apodo","agente_reslen","habilidades","aprendizaje","apoyo","plataforma_chat","zona_horaria","zona_horaria_otro","pref_modelo_ia","pref_modelo_ia_otro","contexto_adicional"];
  for (var i = 0; i < fields.length; i++) {
    if (cleaned.indexOf("(" + fields[i] + ")") !== -1) return fields[i];
  }
  var lower = cleaned.toLowerCase();
  if (lower.indexOf("timestamp") !== -1) return "timestamp";
  return lower;
}

// Fixed at the top level of "My Drive" (not "wherever the spreadsheet happens
// to live") so it's always in the same predictable place: Drive → My Drive →
// this folder → one subfolder per person who filled out the form.
const OUTPUT_FOLDER_NAME = "Hermes Agent — Respuestas del Equipo";
const SOUL_FILENAME = "SOUL.md";
const DESIGN_FILENAME = "Agent-Design.md";
const ZIP_FILENAME = "Hermes-Agent-Files.zip";

function safeFolderName(name) {
  return (name || "").toString().replace(/[\\\/:*?"<>|]/g, "").trim() || "agente";
}

// Writes SOUL.md, Agent-Design.md, and a zip of both to a per-agent Drive
// subfolder for one submission. Section structure follows the spreadsheet's
// own "🗺️ Mapeo SOUL.md" tab: SOUL.md stays the tight, always-loaded
// persona/behavior file; Agent-Design.md is the one-time build/ops brief
// (work context, recurring tasks, automation targets, growth goals,
// deployment prefs) — reference material, not something reloaded every turn.
// The zip is what the submitter actually downloads — one button, two files.
// Returns {soulUrl, designUrl, zipUrl} — direct-download Drive links.
function generateAgentDocs(data) {
  const person = data.nombre || "Sin nombre";
  const agentName = data.agente_nombre || person;
  const agentFolder = getOrCreateAgentFolder(agentName);

  const soul = buildSoulMd(data, person, agentName);
  const design = buildAgentDesignMd(data, person, agentName);

  const soulFile = replaceFile(agentFolder, SOUL_FILENAME, Utilities.newBlob(soul, MimeType.PLAIN_TEXT, SOUL_FILENAME));
  const designFile = replaceFile(agentFolder, DESIGN_FILENAME, Utilities.newBlob(design, MimeType.PLAIN_TEXT, DESIGN_FILENAME));
  const zipBlob = Utilities.zip([soulFile.getBlob(), designFile.getBlob()], ZIP_FILENAME);
  const zipFile = replaceFile(agentFolder, ZIP_FILENAME, zipBlob);

  return {
    soulUrl: downloadUrl(soulFile),
    designUrl: downloadUrl(designFile),
    zipUrl: downloadUrl(zipFile)
  };
}

// One subfolder per agent, e.g. "Hermes Agent — Respuestas del Equipo/Talan/".
function getOrCreateAgentFolder(agentName) {
  const root = getOrCreateOutputFolder();
  const name = safeFolderName(agentName);
  const existing = root.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return root.createFolder(name);
}

function getOrCreateOutputFolder() {
  const root = DriveApp.getRootFolder();
  const existing = root.getFoldersByName(OUTPUT_FOLDER_NAME);
  if (existing.hasNext()) return existing.next();
  return root.createFolder(OUTPUT_FOLDER_NAME);
}

// Re-submitting the same agent replaces the previous file instead of piling
// up duplicates, and makes the JSONP lookup below unambiguous.
function replaceFile(folder, filename, blob) {
  const old = folder.getFilesByName(filename);
  while (old.hasNext()) old.next().setTrashed(true);
  const file = folder.createFile(blob);
  // These files contain personal onboarding info (background, work patterns,
  // never-do rules, etc.) — share with the coordenadas.co domain only, not
  // the whole internet. Falls back to anyone-with-link only if this Drive
  // isn't actually on a Workspace domain (DOMAIN_WITH_LINK would throw).
  try {
    file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareErr) {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  return file;
}

function downloadUrl(file) {
  return "https://drive.google.com/uc?export=download&id=" + file.getId();
}

// Looks up the (already-generated, in this same execution's very recent
// past) files for an agent name, for the client's follow-up JSONP GET after
// its no-cors POST resolves.
function getAgentDocLinks(agentName) {
  try {
    const name = safeFolderName(agentName);
    const root = getOrCreateOutputFolder();
    const folders = root.getFoldersByName(name);
    if (!folders.hasNext()) return { success: false, error: "not found" };
    const folder = folders.next();
    const soulFiles = folder.getFilesByName(SOUL_FILENAME);
    const designFiles = folder.getFilesByName(DESIGN_FILENAME);
    const zipFiles = folder.getFilesByName(ZIP_FILENAME);
    if (!soulFiles.hasNext() || !designFiles.hasNext() || !zipFiles.hasNext()) {
      return { success: false, error: "not found" };
    }
    return {
      success: true,
      soulUrl: downloadUrl(soulFiles.next()),
      designUrl: downloadUrl(designFiles.next()),
      zipUrl: downloadUrl(zipFiles.next())
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
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
    "",
    "## Additional Context",
    "In their own words, unprompted by any specific question: " + field(data, "contexto_adicional"),
    ""
  ].join("\n");
}

// Test helper — run this to generate docs with sample data
function testGenerateAgentDocs() {
  const sampleData = {
    nombre: "Test User",
    _replyto: "test@coordenadas.co",
    rol: "Designer",
    area_trabajo: "Diseño Gráfico, Motion Graphics / VFX",
    area_otro: "",
    edad: "28",
    trayectoria: "5 años en diseño digital, 2 años en motion graphics",
    tiempo_coord: "1 a 2 años",
    tenure_otro: "",
    clientes: "Coordenadas.co, Cliente Externo",
    proyectos: "Rebranding Coordenadas, Campaign Q1",
    proyectos_personales: "Proyecto de ilustración personal",
    semana_tipica: "Lunes: reuniones, Martes-Jueves: diseño, Viernes: revisión",
    herramientas: "Figma, After Effects, Photoshop, Illustrator",
    tools_otro: "",
    sistema_op: "macOS",
    sistema_op_otro: "",
    nivel_tech: "Intermedio — exploro herramientas cuando me las recomiendan",
    exp_ai: "Las uso ocasionalmente",
    usa_terminal: "Un poco — sé los básicos",
    tareas_diarias: "Revisar Slack, revisar tareas en Notion, trabajar en diseños activos",
    tareas_semanales: "Entregar avances, reunión de equipo, revisar feedback",
    tareas_mensuales: "Reporte de métricas, planificación de sprints",
    proc_repetitivos: "Exportar assets en múltiples tamaños, renombrar capas",
    automatizar: "Exportación de assets, naming conventions",
    info_repetitiva: "Brand guidelines, códigos de color, fuentes",
    se_pierde: "Comentarios de feedback en hilos largos de Slack",
    directividad: "Equilibrado — avísame, pero sin presionar",
    idioma: "Español",
    proactividad: "Intermedio — solo cuando algo es urgente o se está acumulando",
    nunca: "Borrar archivos sin confirmar, cambiar nombres de capas sin avisar",
    agente_nombre: "Talan",
    agente_nombre_razon: "Significa 'guardián' en una lengua antigua, me gusta la idea de un agente que cuida mi trabajo",
    agente_genero: "Neutral / Sin preferencia",
    agente_arquetipo: "El Compañero — colaborativo, conversacional, cálido",
    agente_humor: "Algo de humor cuando el momento lo permite",
    agente_trato: "Mi nombre de pila",
    apodo: "",
    agente_reslen: "Detallado cuando el tema lo requiere",
    habilidades: "Figma avanzado, prototipado, sistemas de diseño",
    aprendizaje: "After Effects avanzado, expresiones, Python para automatización",
    apoyo: "Recordarme practicar After Effects, sugerir tutoriales relevantes",
    plataforma_chat: "Slack",
    zona_horaria: "America/Mexico_City",
    zona_horaria_otro: "",
    pref_modelo_ia: "GPT-4",
    pref_modelo_ia_otro: "",
    contexto_adicional: "Me gustaría que el agente me ayude a no perder feedback importante en los hilos de Slack"
  };

  const result = generateAgentDocs(sampleData);
  console.log("Generated:", JSON.stringify(result, null, 2));
  return result;
}
