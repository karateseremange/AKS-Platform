var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Creates the isolated AUDIT-001 Apps Script recipe.
 *
 * The recipe is intentionally editor-only: no Web App route calls it. It
 * requires an explicitly configured recipe spreadsheet, installs the three
 * technical audit parameters only for the duration of the run, then restores
 * their exact previous serialized values.
 *
 * @param {Object} ports
 * @returns {Object}
 */
function AKS_createAudit001Recipe_(ports) {
  "use strict";

  ports = ports || {};
  var catalogs = ports.catalogs || AKS_getAuditCatalogs_();
  var propertyStore = ports.propertyStore;
  var openSpreadsheet = ports.openSpreadsheet;
  var createAuditService = ports.createAuditService;
  var resolveActor = ports.resolveActor;
  var authorizeActor = ports.authorizeActor;
  var clock = ports.clock || function () { return new Date(); };
  var idProvider = ports.idProvider;
  var resolveScriptId = ports.resolveScriptId;
  var targetPropertyKey = ports.targetPropertyKey ||
    "AKS_AUDIT001_RECIPE_SPREADSHEET_ID";
  var resourceName = "AKS Audit RECETTE";
  var configPrefix = "AKS_CONFIG_VALUE.";
  var connectionBackupKey = "AKS_AUDIT001_RECIPE_CONNECTION_BACKUP";
  var accessBackupKey = "AKS_ACCESS002_RECIPE_BACKUP";
  var configValues = {
    "audit.environment": "RECETTE",
    "audit.schemaVersion": catalogs.schemaVersion,
    "audit.retentionDays": "1095"
  };

  function failure_(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function assertDependencies_() {
    if (!propertyStore ||
        typeof propertyStore.getProperty !== "function" ||
        typeof propertyStore.setProperty !== "function" ||
        typeof propertyStore.deleteProperty !== "function" ||
        typeof openSpreadsheet !== "function" ||
        typeof createAuditService !== "function" ||
        typeof resolveActor !== "function" ||
        typeof authorizeActor !== "function" ||
        typeof idProvider !== "function" || typeof resolveScriptId !== "function") {
      throw failure_("AUDIT_RECIPE_UNAVAILABLE", "La recette AUDIT-001 est indisponible.");
    }
  }

  function exactTargetId_() {
    var targetId = String(propertyStore.getProperty(targetPropertyKey) || "");
    if (!/^[A-Za-z0-9_-]{20,128}$/.test(targetId)) {
      throw failure_(
        "AUDIT_RECIPE_TARGET_REQUIRED",
        "L'identifiant du classeur AUDIT-001 de recette est absent ou invalide."
      );
    }
    return targetId;
  }

  function authorizedActor_() {
    var actor = String(resolveActor() || "").trim().toLowerCase();
    if (!actor) {
      throw failure_("AUDIT_RECIPE_ACCESS_DENIED", "Le compte Google actif est introuvable.");
    }
    var authorized = "";
    try {
      authorized = String(authorizeActor(actor) || "").trim().toLowerCase();
    } catch (ignored) {}
    if (authorized !== actor) {
      throw failure_(
        "AUDIT_RECIPE_ACCESS_DENIED",
        "Le compte Google actif n'est pas autorisé pour cette recette."
      );
    }
    return actor;
  }

  function target_() {
    var targetId = exactTargetId_();
    var spreadsheet = openSpreadsheet(targetId);
    if (!spreadsheet ||
        typeof spreadsheet.getId !== "function" ||
        typeof spreadsheet.getName !== "function" ||
        spreadsheet.getId() !== targetId ||
        spreadsheet.getName() !== resourceName) {
      throw failure_(
        "AUDIT_RECIPE_TARGET_REFUSED",
        "La cible n'est pas le classeur exact AKS Audit RECETTE."
      );
    }
    return { id: targetId, spreadsheet: spreadsheet };
  }

  function exactHeaders_(sheet) {
    var lastColumn = sheet.getLastColumn();
    if (lastColumn !== catalogs.headers.length || sheet.getLastRow() < 1) return false;
    var actual = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(String);
    return catalogs.headers.every(function (header, index) {
      return actual[index] === header;
    });
  }

  function prepare() {
    assertDependencies_();
    authorizedActor_();
    var target = target_();
    var spreadsheet = target.spreadsheet;
    var sheet = spreadsheet.getSheetByName(catalogs.sheetName);
    var created = false;

    if (!sheet) {
      if (typeof spreadsheet.insertSheet !== "function") {
        throw failure_("AUDIT_RECIPE_SCHEMA_MISMATCH", "L'onglet AKS_Audit est absent.");
      }
      sheet = spreadsheet.insertSheet(catalogs.sheetName);
      created = true;
    }

    if (sheet.getLastRow() === 0 && sheet.getLastColumn() === 0) {
      sheet.getRange(1, 1, 1, catalogs.headers.length)
        .setValues([catalogs.headers.slice()]);
    } else if (!exactHeaders_(sheet)) {
      throw failure_(
        "AUDIT_RECIPE_SCHEMA_MISMATCH",
        "Le schéma existant de l'onglet AKS_Audit est incompatible."
      );
    }

    return Object.freeze({
      ok: true,
      spreadsheetId: target.id,
      spreadsheetTitle: resourceName,
      sheetName: catalogs.sheetName,
      sheetCreated: created,
      headerCount: catalogs.headers.length,
      existingAuditCount: Math.max(0, sheet.getLastRow() - 1)
    });
  }

  function serializedConfig_(value, actor, timestamp) {
    return JSON.stringify({ value: value, updatedAt: timestamp, updatedBy: actor });
  }

  function installTemporaryConfig_(targetId, actor, changed) {
    var instant = clock();
    if (!(instant instanceof Date) || isNaN(instant.getTime())) {
      throw failure_("AUDIT_RECIPE_CLOCK_INVALID", "L'horodatage de recette est invalide.");
    }
    configValues["audit.spreadsheetId"] = targetId;
    configValues["audit.scriptId"] = resolveScriptId();
    Object.keys(configValues).sort().forEach(function (key) {
      var storageKey = configPrefix + key;
      var previous = propertyStore.getProperty(storageKey);
      var temporary = serializedConfig_(configValues[key], actor, instant.toISOString());
      propertyStore.setProperty(storageKey, temporary);
      changed.push({ key: storageKey, previous: previous, temporary: temporary });
    });
  }

  function restoreConfig_(changed) {
    var conflicts = [];
    var restoreFailures = [];
    changed.slice().reverse().forEach(function (entry) {
      if (propertyStore.getProperty(entry.key) !== entry.temporary) {
        conflicts.push(entry.key);
        return;
      }
      try {
        if (entry.previous === null || typeof entry.previous === "undefined") {
          propertyStore.deleteProperty(entry.key);
        } else {
          propertyStore.setProperty(entry.key, entry.previous);
        }
      } catch (restoreFailure) {
        restoreFailures.push(entry.key);
      }
    });
    if (conflicts.length > 0) {
      throw failure_(
        "AUDIT_RECIPE_CONFIG_CONFLICT",
        "La configuration d'audit a changé pendant la recette ; seules les valeurs non conflictuelles ont été restaurées."
      );
    }
    if (restoreFailures.length > 0) {
      throw failure_(
        "AUDIT_RECIPE_CONFIG_RESTORE_FAILED",
        "La restauration de la configuration d'audit a échoué."
      );
    }
  }

  function event_(result, status, correlationId) {
    return {
      actorType: "ADMIN",
      action: "DOSSIER_CREATE",
      module: "INSCRIPTIONS",
      criticality: "CRITICAL",
      targetType: "DOSSIER",
      targetId: "INS-9999-999999",
      result: result,
      reasonCode: "",
      correlationId: correlationId,
      metadata: { attemptCount: 1, status: status }
    };
  }

  function run() {
    assertDependencies_();
    var actor = authorizedActor_();
    var prepared = prepare();
    var changed = [];
    var result;
    var recipeFailure = null;

    try {
      installTemporaryConfig_(prepared.spreadsheetId, actor, changed);
      var service = createAuditService();
      var correlationId = "corr-audit001-recipe-" + String(idProvider()).replace(/[^A-Za-z0-9._:-]/g, "-");
      var intention = service.record(event_("INTENTION", "INTENTION", correlationId));
      var success = service.record(event_("REUSSI", "CONFIRMEE", correlationId));
      if (!intention || !success || intention.audit_id === success.audit_id ||
          intention.correlation_id !== correlationId || success.correlation_id !== correlationId ||
          intention.environment !== "RECETTE" || success.environment !== "RECETTE") {
        throw failure_(
          "AUDIT_RECIPE_READBACK_FAILED",
          "Les preuves persistées et relues ne sont pas conformes."
        );
      }
      result = {
        ok: true,
        spreadsheetId: prepared.spreadsheetId,
        spreadsheetTitle: prepared.spreadsheetTitle,
        sheetName: prepared.sheetName,
        actor: actor,
        correlationId: correlationId,
        intentionAuditId: intention.audit_id,
        successAuditId: success.audit_id,
        persistedProofCount: 2,
        configurationRestored: true
      };
    } catch (failure) {
      recipeFailure = failure;
    }

    try {
      restoreConfig_(changed);
    } catch (restoreFailure) {
      throw restoreFailure;
    }
    if (recipeFailure) throw recipeFailure;
    return Object.freeze(result);
  }

  function connectionValues_(targetId, actor) {
    var instant = clock();
    if (!(instant instanceof Date) || isNaN(instant.getTime())) {
      throw failure_("AUDIT_RECIPE_CLOCK_INVALID", "L'horodatage de recette est invalide.");
    }
    var values = {
      "audit.environment": "RECETTE",
      "audit.retentionDays": "1095",
      "audit.spreadsheetId": targetId,
      "audit.schemaVersion": catalogs.schemaVersion,
      "audit.scriptId": resolveScriptId()
    };
    var serialized = {};
    Object.keys(values).sort().forEach(function (key) {
      serialized[configPrefix + key] =
        serializedConfig_(values[key], actor, instant.toISOString());
    });
    return serialized;
  }

  function connectionKeys_() {
    return [
      configPrefix + "audit.environment",
      configPrefix + "audit.retentionDays",
      configPrefix + "audit.schemaVersion",
      configPrefix + "audit.spreadsheetId",
      configPrefix + "audit.scriptId"
    ].sort();
  }

  function exactKeys_(value) {
    return value && typeof value === "object" && !Array.isArray(value) &&
      JSON.stringify(Object.keys(value).sort()) === JSON.stringify(connectionKeys_());
  }

  function validInstalled_(backup) {
    try {
      var expected = {
        "audit.environment": "RECETTE",
        "audit.retentionDays": "1095",
        "audit.schemaVersion": catalogs.schemaVersion,
        "audit.spreadsheetId": backup.targetId,
        "audit.scriptId": resolveScriptId()
      };
      return connectionKeys_().every(function (storageKey) {
        var record = JSON.parse(backup.installed[storageKey]);
        var key = storageKey.slice(configPrefix.length);
        return record && record.value === expected[key] &&
          typeof record.updatedAt === "string" && typeof record.updatedBy === "string";
      });
    } catch (ignored) {
      return false;
    }
  }

  function readConnectionBackup_() {
    var raw = propertyStore.getProperty(connectionBackupKey);
    if (!raw) return null;
    try {
      var backup = JSON.parse(raw);
      if (!backup || backup.schemaVersion !== "audit-recipe-connection/1.0" ||
          !/^[A-Za-z0-9_-]{20,128}$/.test(String(backup.targetId || "")) ||
          !exactKeys_(backup.previous) || !exactKeys_(backup.installed) ||
          !connectionKeys_().every(function (key) {
            return backup.previous[key] === null ||
              typeof backup.previous[key] === "string";
          }) || !validInstalled_(backup)) {
        throw new Error("invalid");
      }
      return backup;
    } catch (ignored) {
      throw failure_("AUDIT_RECIPE_CONNECTION_BACKUP_INVALID",
        "La sauvegarde de connexion d'audit est invalide.");
    }
  }

  function exactConfiguration_(values) {
    return connectionKeys_().every(function (key) {
      return propertyStore.getProperty(key) === values[key];
    });
  }

  function recoverableConfiguration_(backup) {
    return connectionKeys_().every(function (key) {
      var current = propertyStore.getProperty(key);
      return current === backup.installed[key] || current === backup.previous[key];
    });
  }

  function restorePrevious_(backup) {
    if (!recoverableConfiguration_(backup)) {
      throw failure_("AUDIT_RECIPE_CONNECTION_CONFLICT",
        "La configuration d'audit contient une modification concurrente.");
    }
    connectionKeys_().forEach(function (key) {
      var current = propertyStore.getProperty(key);
      var previous = backup.previous[key];
      if (current === previous) return;
      if (previous === null) propertyStore.deleteProperty(key);
      else propertyStore.setProperty(key, previous);
    });
    if (!exactConfiguration_(backup.previous)) {
      throw failure_("AUDIT_RECIPE_CONNECTION_RESTORE_FAILED",
        "La configuration d'audit antérieure n'a pas été restaurée exactement.");
    }
  }

  function connect() {
    assertDependencies_();
    var actor = authorizedActor_();
    var prepared = prepare();
    var existing = readConnectionBackup_();
    if (existing) {
      if (existing.targetId !== prepared.spreadsheetId ||
          !exactConfiguration_(existing.installed) ||
          createAuditService().isPersistentRecipeAudit() !== true) {
        throw failure_("AUDIT_RECIPE_CONNECTION_RECOVERY_REQUIRED",
          "La connexion d'audit existante exige une récupération contrôlée.");
      }
      return Object.freeze({
        ok: true, phase: "CONNECTED", spreadsheetTitle: resourceName,
        spreadsheetIdSuffix: existing.targetId.slice(-6),
        backupVerified: true, alreadyConnected: true
      });
    }
    var installed = connectionValues_(prepared.spreadsheetId, actor);
    var previous = {};
    Object.keys(installed).forEach(function (key) {
      previous[key] = propertyStore.getProperty(key);
    });
    var backup = {
      schemaVersion: "audit-recipe-connection/1.0",
      targetId: prepared.spreadsheetId,
      actor: actor,
      createdAt: JSON.parse(installed[configPrefix + "audit.environment"]).updatedAt,
      previous: previous,
      installed: installed
    };
    var serializedBackup = JSON.stringify(backup);
    propertyStore.setProperty(connectionBackupKey, serializedBackup);
    if (propertyStore.getProperty(connectionBackupKey) !== serializedBackup) {
      throw failure_("AUDIT_RECIPE_CONNECTION_BACKUP_FAILED",
        "La sauvegarde de connexion d'audit n'a pas été vérifiée.");
    }
    try {
      Object.keys(installed).sort().forEach(function (key) {
        propertyStore.setProperty(key, installed[key]);
      });
      if (!exactConfiguration_(installed) ||
          createAuditService().isPersistentRecipeAudit() !== true) {
        throw failure_("AUDIT_RECIPE_CONNECTION_FAILED",
          "La connexion persistante de l'audit n'a pas été vérifiée.");
      }
    } catch (failure) {
      restorePrevious_(backup);
      propertyStore.deleteProperty(connectionBackupKey);
      throw failure;
    }
    return Object.freeze({
      ok: true, phase: "CONNECTED", spreadsheetTitle: resourceName,
      spreadsheetIdSuffix: prepared.spreadsheetId.slice(-6),
      backupVerified: true, alreadyConnected: false
    });
  }

  function disconnect() {
    assertDependencies_();
    authorizedActor_();
    var backup = readConnectionBackup_();
    if (!backup) {
      throw failure_("AUDIT_RECIPE_CONNECTION_BACKUP_REQUIRED",
        "Aucune connexion d'audit de recette n'est à restaurer.");
    }
    if (propertyStore.getProperty(accessBackupKey)) {
      throw failure_("AUDIT_RECIPE_ACCESS_RESTORE_REQUIRED",
        "La recette ACCESS doit être restaurée avant de déconnecter l'audit.");
    }
    if (!recoverableConfiguration_(backup)) {
      throw failure_("AUDIT_RECIPE_CONNECTION_CONFLICT",
        "La configuration d'audit a changé depuis sa connexion.");
    }
    restorePrevious_(backup);
    propertyStore.deleteProperty(connectionBackupKey);
    if (propertyStore.getProperty(connectionBackupKey)) {
      throw failure_("AUDIT_RECIPE_CONNECTION_BACKUP_REMOVE_FAILED",
        "La sauvegarde de connexion d'audit n'a pas été supprimée.");
    }
    return Object.freeze({
      ok: true, phase: "DISCONNECTED",
      spreadsheetIdSuffix: backup.targetId.slice(-6),
      exactRestore: true, backupRemoved: true
    });
  }

  assertDependencies_();
  return Object.freeze({
    prepare: prepare, run: run, connect: connect, disconnect: disconnect
  });
}

function AKS_createDefaultAudit001Recipe_() {
  return AKS_createAudit001Recipe_({
    propertyStore: PropertiesService.getScriptProperties(),
    openSpreadsheet: function (spreadsheetId) {
      return SpreadsheetApp.openById(spreadsheetId);
    },
    createAuditService: AKS_createDefaultAuditService_,
    resolveActor: function () { return Session.getActiveUser().getEmail(); },
    authorizeActor: function (actor) {
      return AKS.Admin.Access.assertAuthorized(actor);
    },
    resolveScriptId: function () { return ScriptApp.getScriptId(); },
    idProvider: function () { return Utilities.getUuid(); }
  });
}

/** Editor-only setup; no Web App route exposes this function. */
function AKS_prepareAudit001Recipe() {
  var result = AKS_createDefaultAudit001Recipe_().prepare();
  console.log("PRÉPARATION RECETTE AUDIT-001: " + JSON.stringify(result));
  return result;
}

/** Editor-only reversible connection for the ACCESS-002-02 recipe. */
function AKS_connectAudit001Recipe() {
  var result = AKS_createDefaultAudit001Recipe_().connect();
  console.log("CONNEXION RECETTE AUDIT-001: " + JSON.stringify(result));
  return result;
}

/** Editor-only exact restoration after ACCESS-002-02 has been restored. */
function AKS_disconnectAudit001Recipe() {
  var result = AKS_createDefaultAudit001Recipe_().disconnect();
  console.log("DÉCONNEXION RECETTE AUDIT-001: " + JSON.stringify(result));
  return result;
}

/** Editor-only persistent recipe; the two audit proofs are never deleted. */
function AKS_runAudit001Recipe() {
  var result = AKS_createDefaultAudit001Recipe_().run();
  console.log("RÉSULTAT RECETTE AUDIT-001: " + JSON.stringify(result));
  return result;
}
