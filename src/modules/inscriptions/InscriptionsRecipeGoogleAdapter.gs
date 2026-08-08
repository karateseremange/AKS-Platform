var AKS = AKS || {};
AKS.Inscriptions = AKS.Inscriptions || {};

/**
 * Apps Script adapter reserved for the explicit INSCRIPTIONS-010 recipe.
 * No ordinary web or administration route calls this file.
 */
function AKS_createInscriptions010GoogleGateway_(spreadsheet) {
  function sheet_(name) {
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      var error = new Error("Onglet Inscriptions absent.");
      error.code = "INSCRIPTIONS_SCHEMA_MISMATCH";
      throw error;
    }
    return sheet;
  }

  return Object.freeze({
    getResourceId: function () { return spreadsheet.getId(); },
    getTimezone: function () { return spreadsheet.getSpreadsheetTimeZone(); },
    getSheetNames: function () {
      return spreadsheet.getSheets().map(function (sheet) { return sheet.getName(); });
    },
    readRows: function (name) {
      var target = sheet_(name);
      var lastRow = target.getLastRow();
      var lastColumn = target.getLastColumn();
      if (lastRow < 1 || lastColumn < 1) return [];
      return target.getRange(1, 1, lastRow, lastColumn).getValues();
    },
    appendRow: function (name, row) {
      sheet_(name).appendRow(row.slice());
    },
    updateRow: function (name, rowNumber, row) {
      sheet_(name).getRange(rowNumber, 1, 1, row.length).setValues([row.slice()]);
    }
  });
}

function AKS_inscriptions010RecipeConfirmation_(confirmation, expectedAction) {
  if (!confirmation || confirmation.confirmed !== true ||
      String(confirmation.action || "") !== expectedAction ||
      String(confirmation.token || "") !== "INSCRIPTIONS-010-RECETTE") {
    var error = new Error("Confirmation technique de recette obligatoire.");
    error.code = "INSCRIPTIONS_RECIPE_REQUIRED";
    throw error;
  }
}

function AKS_createInscriptions010ParameterRegistry_() {
  var registry = AKS_createParameterRegistry_();
  [
    {
      key: "inscriptions.environment",
      label: "Environnement Inscriptions",
      type: "string",
      scope: "environment",
      required: true,
      administrable: false
    },
    {
      key: "inscriptions.spreadsheetId",
      label: "Classeur Inscriptions",
      type: "resourceId",
      scope: "integration",
      required: true,
      administrable: false
    },
    {
      key: "inscriptions.schemaVersion",
      label: "Schéma Inscriptions",
      type: "string",
      scope: "module",
      required: true,
      administrable: false,
      defaultValue: "inscriptions-recipe-tech/1.0"
    },
    {
      key: "inscriptions.timezone",
      label: "Fuseau Inscriptions",
      type: "string",
      scope: "module",
      required: true,
      administrable: false,
      defaultValue: "Europe/Paris"
    },
    {
      key: "inscriptions.lockTimeoutMs",
      label: "Délai du verrou Inscriptions",
      type: "integer",
      scope: "module",
      required: true,
      administrable: false,
      defaultValue: 5000
    }
  ].forEach(registry.register);
  return registry;
}

function AKS_inscriptions010Configuration_() {
  var service = AKS_createConfigurationService_(
    AKS_createInscriptions010ParameterRegistry_(),
    AKS_createScriptParameterValueStore_()
  );
  function value_(key) { return service.resolve(key).value; }
  return Object.freeze({
    environment: value_("inscriptions.environment"),
    spreadsheetId: value_("inscriptions.spreadsheetId"),
    schemaVersion: value_("inscriptions.schemaVersion"),
    timezone: value_("inscriptions.timezone"),
    lockTimeoutMs: value_("inscriptions.lockTimeoutMs")
  });
}

function AKS_createInscriptions010GoogleComposition_(auditPort) {
  var config = AKS_inscriptions010Configuration_();
  if (String(config.environment || "").trim().toUpperCase() !== "RECETTE") {
    var recipeError = new Error("Une recette Inscriptions est obligatoire.");
    recipeError.code = "INSCRIPTIONS_RECIPE_REQUIRED";
    throw recipeError;
  }
  if (config.schemaVersion !== "inscriptions-recipe-tech/1.0" ||
      config.timezone !== "Europe/Paris") {
    var schemaError = new Error("Configuration du schéma Inscriptions incompatible.");
    schemaError.code = "INSCRIPTIONS_SCHEMA_MISMATCH";
    throw schemaError;
  }
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  return AKS.Inscriptions.createRecipePersistenceService({
    gateway: AKS_createInscriptions010GoogleGateway_(spreadsheet),
    lock: LockService.getScriptLock(),
    audit: auditPort,
    technicalActor: function () { return Session.getActiveUser().getEmail(); },
    config: config,
    lockTimeoutMs: config.lockTimeoutMs
  });
}

function AKS_inscriptions010CommonAudit_() {
  var audit = AKS.Core && AKS.Core.Audit;
  if (!audit || typeof audit.record !== "function" ||
      typeof audit.isPersistentRecipeAudit !== "function" ||
      audit.isPersistentRecipeAudit() !== true) {
    var error = new Error("Audit commun persistant indisponible.");
    error.code = "INSCRIPTIONS_AUDIT_REQUIRED";
    throw error;
  }
  return audit;
}

function AKS_recipeInscriptions010_validateSchema(confirmation) {
  AKS_inscriptions010RecipeConfirmation_(confirmation, "VALIDATE_SCHEMA");
  var persistence = AKS_createInscriptions010GoogleComposition_(
    AKS_inscriptions010CommonAudit_()
  );
  var metadata = persistence.assertRecipe();
  return Object.freeze({
    status: "VALIDE",
    schemaVersion: metadata.schema_version,
    environment: metadata.environment,
    resourceId: metadata.resource_id,
    validatedAt: new Date().toISOString()
  });
}

function AKS_recipeInscriptions010_initializeSchema(confirmation) {
  AKS_inscriptions010RecipeConfirmation_(confirmation, "INITIALIZE_SCHEMA");
  var audit = AKS_inscriptions010CommonAudit_();
  var config = AKS_inscriptions010Configuration_();
  if (String(config.environment || "").trim().toUpperCase() !== "RECETTE") {
    var recipeError = new Error("Une recette Inscriptions est obligatoire.");
    recipeError.code = "INSCRIPTIONS_RECIPE_REQUIRED";
    throw recipeError;
  }
  if (!config.spreadsheetId || config.schemaVersion !== "inscriptions-recipe-tech/1.0" ||
      config.timezone !== "Europe/Paris") {
    var configError = new Error("Configuration Inscriptions incomplète.");
    configError.code = "INSCRIPTIONS_SCHEMA_MISMATCH";
    throw configError;
  }
  var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  if (spreadsheet.getId() !== config.spreadsheetId ||
      String(spreadsheet.getName() || "").indexOf("[RECETTE]") !== 0) {
    var resourceError = new Error("Ressource de recette Inscriptions inattendue.");
    resourceError.code = "INSCRIPTIONS_RECIPE_RESOURCE_MISMATCH";
    throw resourceError;
  }
  var sheets = spreadsheet.getSheets();
  if (sheets.length !== 1 || sheets[0].getLastRow() > 0 || sheets[0].getLastColumn() > 0) {
    var proofError = new Error("Le classeur de recette doit être neuf et vide.");
    proofError.code = "INSCRIPTIONS_RECIPE_PROOF_INCOMPLETE";
    throw proofError;
  }
  var now = new Date().toISOString();
  if (audit.record(Object.freeze({
    actor: "recipe-system",
    action: "INITIALIZE_INSCRIPTIONS_RECIPE_SCHEMA",
    target: Object.freeze({ resourceId: spreadsheet.getId() }),
    result: "INTENTION",
    date: now,
    correlationId: "inscriptions-010-schema-" + now
  })) === false) {
    var auditError = new Error("Audit commun persistant indisponible.");
    auditError.code = "INSCRIPTIONS_AUDIT_REQUIRED";
    throw auditError;
  }
  var metadata = sheets[0];
  metadata.setName("Metadata");
  metadata.getRange(1, 1, 8, 2).setValues([
    ["key", "value"],
    ["schema_version", "inscriptions-recipe-tech/1.0"],
    ["environment", "RECETTE"],
    ["timezone", "Europe/Paris"],
    ["resource_kind", "AKS_INSCRIPTIONS_RECIPE"],
    ["resource_id", spreadsheet.getId()],
    ["created_at", now],
    ["validated_at", now]
  ]);
  var sequences = spreadsheet.insertSheet("Sequences");
  sequences.getRange(1, 1, 1, 6).setValues([[
    "sequence_type", "scope_key", "last_value", "row_version", "updated_at", "updated_by"
  ]]);
  var commandes = spreadsheet.insertSheet("Commandes");
  commandes.getRange(1, 1, 1, 21).setValues([[
    "schema_version", "command_id", "idempotency_key", "payload_fingerprint", "actor",
    "action", "target_type", "target_id", "module", "season", "section", "course_code",
    "correlation_id", "status", "attempt_count", "created_at", "created_by", "updated_at",
    "updated_by", "row_version", "failure_code"
  ]]);
  spreadsheet.setSpreadsheetTimeZone("Europe/Paris");
  SpreadsheetApp.flush();
  if (audit.record(Object.freeze({
    actor: "recipe-system",
    action: "INITIALIZE_INSCRIPTIONS_RECIPE_SCHEMA",
    target: Object.freeze({ resourceId: spreadsheet.getId() }),
    result: "REUSSI",
    date: new Date().toISOString(),
    correlationId: "inscriptions-010-schema-" + now
  })) === false) {
    var finalAuditError = new Error("Audit commun persistant indisponible.");
    finalAuditError.code = "INSCRIPTIONS_AUDIT_REQUIRED";
    throw finalAuditError;
  }
  return AKS_recipeInscriptions010_validateSchema({
    confirmed: true,
    action: "VALIDATE_SCHEMA",
    token: "INSCRIPTIONS-010-RECETTE"
  });
}
