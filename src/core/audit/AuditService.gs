var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Creates the pure AUDIT-001 persistent service.
 * Google services remain behind injected ports so automatic tests stay pure.
 *
 * @param {Object} options
 * @returns {Object}
 */
function AKS_createAuditService_(options) {
  "use strict";

  options = options || {};
  var catalogs = options.catalogs || AKS_getAuditCatalogs_();
  var config = options.config;
  var gateway = options.gateway;
  var lock = options.lock;
  var resolveActor = options.resolveActor;
  var authorizeActor = options.authorizeActor;
  var resolveTechnicalActor = options.resolveTechnicalActor;
  var clock = options.clock || function () { return new Date(); };
  var idProvider = options.idProvider;
  var technicalLogger = options.technicalLogger || function () {};
  var lockTimeoutMs = Number(options.lockTimeoutMs || 5000);

  function error_(code, message) {
    var failure = new Error(message);
    failure.code = code;
    return failure;
  }

  function assertDependencies_() {
    var methods = [
      "getResourceId", "getResourceName", "getHeaders", "findRowsByAuditId",
      "appendRow"
    ];
    if (!catalogs || !catalogs.headers || !config ||
        typeof config.resolve !== "function" || !gateway ||
        methods.some(function (method) { return typeof gateway[method] !== "function"; }) ||
        !lock || typeof lock.tryLock !== "function" || typeof lock.releaseLock !== "function" ||
        typeof resolveActor !== "function" || typeof authorizeActor !== "function" ||
        typeof resolveTechnicalActor !== "function" ||
        typeof idProvider !== "function" || !isFinite(lockTimeoutMs) ||
        lockTimeoutMs < 1000 || lockTimeoutMs > 30000) {
      throw error_("AUDIT_REQUIRED", "Le service d'audit commun est indisponible.");
    }
  }

  function text_(value) {
    return String(value === null || typeof value === "undefined" ? "" : value).trim();
  }

  function upper_(value) {
    return text_(value).toUpperCase();
  }

  function deepFreeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { deepFreeze_(value[key]); });
    return Object.freeze(value);
  }

  function isoTimestamp_() {
    var instant = clock();
    if (!(instant instanceof Date) || isNaN(instant.getTime())) {
      throw error_("AUDIT_EVENT_INVALID", "Horodatage d'audit invalide.");
    }
    return instant.toISOString();
  }

  function configuredValue_(key) {
    var resolved;
    try {
      resolved = config.resolve(key);
    } catch (failure) {
      throw error_(
        key === "audit.environment" ? "AUDIT_RECIPE_REQUIRED" : "AUDIT_SCHEMA_MISMATCH",
        "Configuration d'audit indisponible."
      );
    }
    if (!resolved || resolved.explicit !== true || resolved.source !== "explicit") {
      throw error_(
        key === "audit.environment" ? "AUDIT_RECIPE_REQUIRED" : "AUDIT_SCHEMA_MISMATCH",
        "Configuration d'audit non explicite."
      );
    }
    return text_(resolved.value);
  }

  function sameTexts_(actual, expected) {
    return Array.isArray(actual) && actual.length === expected.length &&
      expected.every(function (value, index) { return actual[index] === value; });
  }

  function assertSupport_() {
    var environment = upper_(configuredValue_("audit.environment"));
    var resourceId = configuredValue_("audit.spreadsheetId");
    var schemaVersion = configuredValue_("audit.schemaVersion");
    if (environment !== "RECETTE") {
      throw error_("AUDIT_RECIPE_REQUIRED", "Une ressource d'audit de recette est obligatoire.");
    }
    if (!googleResourceId_(resourceId) ||
        text_(gateway.getResourceId()) !== resourceId ||
        upper_(gateway.getResourceName()) !== "AKS AUDIT RECETTE") {
      throw error_("AUDIT_RECIPE_REQUIRED", "La ressource d'audit n'est pas une recette autorisée.");
    }
    if (schemaVersion !== catalogs.schemaVersion ||
        !sameTexts_(gateway.getHeaders(), catalogs.headers)) {
      throw error_("AUDIT_SCHEMA_MISMATCH", "Le schéma du support d'audit est incompatible.");
    }
    return Object.freeze({ environment: environment, resourceId: resourceId });
  }

  function requiredCatalog_(value, catalog) {
    var normalized = upper_(value);
    if (!catalog[normalized]) {
      throw error_("AUDIT_EVENT_INVALID", "Événement d'audit non conforme.");
    }
    return normalized;
  }

  function identifier_(value, required) {
    var normalized = text_(value);
    if ((!normalized && required) ||
        (normalized && !/^[A-Za-z0-9@._:-]{1,160}$/.test(normalized))) {
      throw error_("AUDIT_EVENT_INVALID", "Identifiant d'audit non conforme.");
    }
    return normalized;
  }

  function googleResourceId_(value) {
    return /^[A-Za-z0-9_-]{20,128}$/.test(text_(value));
  }

  function targetId_(targetType, value) {
    var normalized = text_(value);
    if (!normalized) return "";
    if (targetType === "DOSSIER" && /^INS-[0-9]{4}-[0-9]{6}$/.test(normalized)) {
      return normalized;
    }
    throw error_("AUDIT_EVENT_INVALID", "Identifiant de ressource d'audit non conforme.");
  }

  function correlationId_(value, required) {
    var normalized = text_(value);
    if ((!normalized && required) ||
        (normalized && !/^corr-[A-Za-z0-9][A-Za-z0-9._:-]{2,95}$/.test(normalized))) {
      throw error_("AUDIT_EVENT_INVALID", "Identifiant de corrélation d'audit non conforme.");
    }
    return normalized;
  }

  function metadataJson_(action, metadata) {
    if (metadata === null || typeof metadata === "undefined") return "{}";
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      throw error_("AUDIT_EVENT_INVALID", "Les métadonnées d'audit doivent être un objet.");
    }
    var schema = catalogs.metadataSchemas && catalogs.metadataSchemas[action];
    if (!schema) {
      throw error_("AUDIT_EVENT_INVALID", "Schéma de métadonnées d'audit absent.");
    }
    var normalized = {};
    Object.keys(metadata).sort().forEach(function (key) {
      var value = metadata[key];
      if (!schema[key]) {
        throw error_("AUDIT_EVENT_INVALID", "Métadonnée d'audit interdite.");
      }
      if (key === "attemptCount") {
        if (typeof value !== "number" || !isFinite(value) ||
            Math.floor(value) !== value || value < 0 || value > 999) {
          throw error_("AUDIT_EVENT_INVALID", "Nombre de tentatives d'audit invalide.");
        }
        normalized[key] = value;
      } else if (key === "status") {
        value = upper_(value);
        if (!catalogs.metadataStatuses[value]) {
          throw error_("AUDIT_EVENT_INVALID", "Statut de métadonnée d'audit invalide.");
        }
        normalized[key] = value;
      }
    });
    return JSON.stringify(normalized);
  }

  function actorId_(actorType) {
    var candidate = actorType === "USER" || actorType === "ADMIN"
      ? resolveActor(actorType)
      : resolveTechnicalActor(actorType);
    var actorId = identifier_(String(candidate || "").toLowerCase(), true);
    if (authorizeActor(actorType, actorId) !== true) {
      throw error_("AUDIT_EVENT_INVALID", "Acteur d'audit non autorisé.");
    }
    return actorId;
  }

  function technicalActor_() {
    return identifier_(String(resolveTechnicalActor("AUDIT") || "").toLowerCase(), true);
  }

  function reasonCode_(value) {
    var normalized = upper_(value);
    return catalogs.reasonCodes[normalized] ? normalized : "UNEXPECTED_ERROR";
  }

  function normalizeEvent_(event) {
    event = event || {};
    var actorType = requiredCatalog_(event.actorType, catalogs.actorTypes);
    var action = requiredCatalog_(event.action, catalogs.actions);
    requiredCatalog_(event.criticality, catalogs.criticalities);
    var targetType = requiredCatalog_(event.targetType, catalogs.targetTypes);
    return Object.freeze({
      actorType: actorType,
      action: action,
      module: requiredCatalog_(event.module, catalogs.modules),
      targetType: targetType,
      targetId: targetId_(targetType, event.targetId),
      result: requiredCatalog_(event.result, catalogs.results),
      reasonCode: reasonCode_(event.reasonCode),
      correlationId: correlationId_(event.correlationId, true),
      metadataJson: metadataJson_(action, event.metadata)
    });
  }

  function buildRow_(event, support) {
    var auditId = "aud-" + identifier_(idProvider(), true);
    var occurredAt = isoTimestamp_();
    var createdAt = isoTimestamp_();
    var row = [
      catalogs.schemaVersion,
      auditId,
      occurredAt,
      support.environment,
      event.actorType,
      actorId_(event.actorType),
      event.action,
      event.module,
      event.targetType,
      event.targetId,
      event.result,
      event.reasonCode,
      event.correlationId,
      event.metadataJson,
      createdAt,
      technicalActor_()
    ];
    return row.map(function (cell) { return String(cell); });
  }

  function rowToProof_(row) {
    var proof = {};
    catalogs.headers.forEach(function (header, index) { proof[header] = row[index]; });
    return deepFreeze_(proof);
  }

  function logFailure_(failure, correlationId) {
    try {
      technicalLogger({
        level: "ERROR",
        category: "technical",
        source: "AKS.Core.Audit",
        module: "AKS_CORE",
        eventType: "audit.persistence.failure",
        message: "Échec contrôlé de la persistance d'audit.",
        outcome: "failure",
        correlationId: correlationId_(correlationId, false),
        context: { code: failure && failure.code ? failure.code : "AUDIT_PERSISTENCE_FAILED" }
      });
    } catch (ignored) {}
  }

  function record(event) {
    assertDependencies_();
    var correlationId = event && event.correlationId;
    try {
      var normalizedEvent = normalizeEvent_(event);
      var support = assertSupport_();
      if (lock.tryLock(lockTimeoutMs) !== true) {
        throw error_("AUDIT_LOCK_TIMEOUT", "Le verrou d'audit est indisponible.");
      }
      try {
        support = assertSupport_();
        var row = buildRow_(normalizedEvent, support);
        var auditId = row[1];
        if (gateway.findRowsByAuditId(auditId).length !== 0) {
          throw error_("AUDIT_DUPLICATE", "L'identifiant d'audit existe déjà.");
        }
        gateway.appendRow(row.slice());
        var persisted = gateway.findRowsByAuditId(auditId);
        if (persisted.length !== 1) {
          throw error_("AUDIT_PERSISTENCE_FAILED", "La preuve d'audit est introuvable.");
        }
        var persistedRow = persisted[0].map(function (cell) { return String(cell); });
        if (!sameTexts_(persistedRow, row)) {
          throw error_("AUDIT_PROOF_MISMATCH", "La preuve d'audit relue est différente.");
        }
        return rowToProof_(persistedRow);
      } finally {
        lock.releaseLock();
      }
    } catch (failure) {
      if (!failure || !failure.code) {
        failure = error_("AUDIT_PERSISTENCE_FAILED", "La persistance d'audit a échoué.");
      }
      logFailure_(failure, correlationId);
      throw failure;
    }
  }

  assertDependencies_();
  return Object.freeze({
    record: record,
    isPersistentRecipeAudit: function () { return true; },
    getSchema: function () {
      return Object.freeze({
        version: catalogs.schemaVersion,
        sheetName: catalogs.sheetName,
        headers: catalogs.headers.slice()
      });
    }
  });
}
