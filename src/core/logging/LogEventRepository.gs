/**
 * Creates the durable LOG-001 event repository.
 *
 * The repository stores one immutable event per row and deliberately exposes
 * only append and recent-read operations. Retention and purge are handled by
 * a later LOG-001 increment.
 *
 * @param {Object=} dependencies
 * @returns {Object}
 */
function AKS_createLogEventRepository_(dependencies) {
  dependencies = dependencies || {};
  var sheetName = dependencies.sheetName || "AKS_Logs";
  var getSpreadsheet = dependencies.getSpreadsheet || function () {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      var error = new Error("Le classeur AKS Platform est indisponible.");
      error.code = "LOG001_SPREADSHEET_UNAVAILABLE";
      throw error;
    }
    return spreadsheet;
  };
  var lock = dependencies.lock || LockService.getScriptLock();
  var lockTimeoutMs = dependencies.lockTimeoutMs || 5000;
  var headers = Object.freeze([
    "schemaVersion",
    "eventId",
    "timestamp",
    "environment",
    "correlationId",
    "level",
    "category",
    "source",
    "module",
    "eventType",
    "message",
    "outcome",
    "actorJson",
    "reference",
    "durationMs",
    "contextJson"
  ]);

  function error_(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function ensureSheet_() {
    var spreadsheet = getSpreadsheet();
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers.slice()]);
      sheet.setFrozenRows(1);
      return sheet;
    }

    var lastColumn = sheet.getLastColumn();
    if (lastColumn !== headers.length) {
      throw error_(
        "LOG001_STORAGE_SCHEMA_INVALID",
        "Le schéma de la feuille " + sheetName + " est incompatible."
      );
    }
    var actualHeaders = sheet
      .getRange(1, 1, 1, headers.length)
      .getValues()[0];
    var valid = headers.every(function (header, index) {
      return String(actualHeaders[index]) === header;
    });
    if (!valid) {
      throw error_(
        "LOG001_STORAGE_SCHEMA_INVALID",
        "Le schéma de la feuille " + sheetName + " est incompatible."
      );
    }
    return sheet;
  }

  function withLock_(operation) {
    if (!lock.tryLock(lockTimeoutMs)) {
      throw error_(
        "LOG001_STORAGE_LOCK_TIMEOUT",
        "Le stockage des journaux est momentanément verrouillé."
      );
    }
    try {
      return operation();
    } finally {
      lock.releaseLock();
    }
  }

  function serialize_(value) {
    return value === null || typeof value === "undefined"
      ? ""
      : JSON.stringify(value);
  }

  function append(event) {
    return withLock_(function () {
      ensureSheet_().appendRow([
        event.schemaVersion,
        event.eventId,
        event.timestamp,
        event.environment,
        event.correlationId,
        event.level,
        event.category,
        event.source,
        event.module || "",
        event.eventType,
        event.message,
        event.outcome || "",
        serialize_(event.actor),
        event.reference || "",
        event.durationMs === null ? "" : event.durationMs,
        serialize_(event.context)
      ]);
      return event.eventId;
    });
  }

  function parseJson_(value) {
    if (value === "" || value === null || typeof value === "undefined") {
      return null;
    }
    try {
      return JSON.parse(String(value));
    } catch (parseError) {
      throw error_(
        "LOG001_STORAGE_DATA_INVALID",
        "Une ligne de journal contient un JSON invalide."
      );
    }
  }

  function rowToEvent_(row) {
    return Object.freeze({
      schemaVersion: String(row[0]),
      eventId: String(row[1]),
      timestamp: String(row[2]),
      environment: String(row[3]),
      correlationId: String(row[4]),
      level: String(row[5]),
      category: String(row[6]),
      source: String(row[7]),
      module: row[8] === "" ? null : String(row[8]),
      eventType: String(row[9]),
      message: String(row[10]),
      outcome: row[11] === "" ? null : String(row[11]),
      actor: parseJson_(row[12]),
      reference: row[13] === "" ? null : String(row[13]),
      durationMs: row[14] === "" ? null : Number(row[14]),
      context: parseJson_(row[15]) || {}
    });
  }

  function listRecent(limit) {
    var normalizedLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
    var sheet = ensureSheet_();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return [];
    }
    var count = Math.min(normalizedLimit, lastRow - 1);
    var startRow = lastRow - count + 1;
    return sheet
      .getRange(startRow, 1, count, headers.length)
      .getValues()
      .reverse()
      .map(rowToEvent_);
  }

  return Object.freeze({
    ensureStorage: ensureSheet_,
    append: append,
    listRecent: listRecent,
    getHeaders: function () { return headers.slice(); },
    getSheetName: function () { return sheetName; }
  });
}

function AKS_createDefaultLogEventRepository_() {
  return AKS_createLogEventRepository_();
}
