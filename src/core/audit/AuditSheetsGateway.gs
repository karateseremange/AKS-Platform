var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Creates the AUDIT-001 Google Sheets gateway.
 * The gateway never creates, edits or deletes the schema; it only appends a
 * candidate row and exposes exact reads to the common service.
 *
 * @param {Object} spreadsheet
 * @param {string=} sheetName
 * @param {Object=} driveFile
 * @returns {Object}
 */
function AKS_createAuditSheetsGateway_(spreadsheet, sheetName, driveFile) {
  sheetName = sheetName || "AKS_Audit";

  function error_(code, message) {
    var failure = new Error(message);
    failure.code = code;
    return failure;
  }

  if (!spreadsheet || typeof spreadsheet.getId !== "function" ||
      typeof spreadsheet.getName !== "function" ||
      typeof spreadsheet.getSheetByName !== "function") {
    throw error_("AUDIT_PERSISTENCE_FAILED", "Classeur d'audit indisponible.");
  }

  function sheet_() {
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) throw error_("AUDIT_SCHEMA_MISMATCH", "Onglet d'audit absent.");
    return sheet;
  }

  function headers_() {
    var sheet = sheet_();
    var lastColumn = sheet.getLastColumn();
    if (lastColumn < 1) return [];
    return sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(String);
  }

  function findRowsByAuditId_(auditId) {
    var sheet = sheet_();
    var width = headers_().length;
    var lastRow = sheet.getLastRow();
    if (width < 2 || lastRow <= 1) return [];
    return sheet.getRange(2, 1, lastRow - 1, width).getDisplayValues()
      .filter(function (row) { return String(row[1]) === String(auditId); })
      .map(function (row) { return row.map(String); });
  }

  function listRows_() {
    var sheet = sheet_();
    var width = headers_().length;
    var lastRow = sheet.getLastRow();
    if (width < 1 || lastRow <= 1) return [];
    return sheet.getRange(2, 1, lastRow - 1, width).getDisplayValues()
      .map(function (row) { return row.map(String); });
  }

  function email_(principal) {
    return principal && typeof principal.getEmail === "function"
      ? String(principal.getEmail() || "").trim().toLowerCase()
      : "";
  }

  function permissionSnapshot_() {
    if (!driveFile || typeof driveFile.getSharingAccess !== "function" ||
        typeof driveFile.getSharingPermission !== "function" ||
        typeof driveFile.getOwner !== "function" ||
        typeof driveFile.getEditors !== "function") {
      return Object.freeze({ available: false });
    }
    var editors = driveFile.getEditors().map(email_).filter(Boolean).sort();
    return Object.freeze({
      available: true,
      sharingAccess: String(driveFile.getSharingAccess()),
      sharingPermission: String(driveFile.getSharingPermission()),
      ownerEmail: email_(driveFile.getOwner()),
      editorEmails: Object.freeze(editors)
    });
  }

  return Object.freeze({
    getResourceId: function () { return String(spreadsheet.getId()); },
    getResourceName: function () { return String(spreadsheet.getName()); },
    getHeaders: headers_,
    getRowCount: function () { return Math.max(0, sheet_().getLastRow() - 1); },
    getPermissionSnapshot: permissionSnapshot_,
    findRowsByAuditId: findRowsByAuditId_,
    listRows: listRows_,
    appendRow: function (row) {
      sheet_().appendRow(row.map(function (cell) { return String(cell); }));
    }
  });
}

function AKS_createConfiguredAuditSheetsGateway_(spreadsheetId) {
  return AKS_createAuditSheetsGateway_(
    SpreadsheetApp.openById(spreadsheetId),
    "AKS_Audit",
    DriveApp.getFileById(spreadsheetId)
  );
}
