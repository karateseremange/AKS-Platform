var AKS = AKS || {};
AKS.Core = AKS.Core || {};

function AKS_createDefaultAuditService_() {
  var registry = AKS_createPlatformParameterRegistry_();
  var configuration = AKS_createConfigurationService_(
    registry,
    AKS_createScriptParameterValueStore_()
  );
  var sheetsGateway = null;

  function gateway_() {
    if (!sheetsGateway) {
      sheetsGateway = AKS_createConfiguredAuditSheetsGateway_(
        configuration.resolve("audit.spreadsheetId").value
      );
    }
    return sheetsGateway;
  }

  function activeIdentity_() {
    return Session.getActiveUser().getEmail();
  }

  function technicalIdentity_() {
    return Session.getEffectiveUser().getEmail();
  }

  var authorizeActor_ = AKS_createDefaultAuditActorAuthorizer_(
    AKS.Admin && AKS.Admin.Access,
    technicalIdentity_,
    function () {
      return typeof AKS_createAccessService_ === "function"
        ? AKS_createAccessService_()
        : null;
    }
  );

  return AKS_createAuditService_({
    config: configuration,
    gateway: Object.freeze({
      getResourceId: function () { return gateway_().getResourceId(); },
      getResourceName: function () { return gateway_().getResourceName(); },
      getHeaders: function () { return gateway_().getHeaders(); },
      getRowCount: function () { return gateway_().getRowCount(); },
      getPermissionSnapshot: function () {
        return gateway_().getPermissionSnapshot();
      },
      findRowsByAuditId: function (auditId) {
        return gateway_().findRowsByAuditId(auditId);
      },
      appendRow: function (row) { return gateway_().appendRow(row); }
    }),
    lock: LockService.getScriptLock(),
    resolveActor: activeIdentity_,
    authorizeActor: authorizeActor_,
    resolveTechnicalActor: technicalIdentity_,
    resolveScriptId: function () { return ScriptApp.getScriptId(); },
    idProvider: function () { return Utilities.getUuid(); },
    technicalLogger: function (event) {
      if (AKS.Logging && typeof AKS.Logging.emit === "function") AKS.Logging.emit(event);
    }
  });
}

/**
 * Creates the two deliberately separate production-support operations.
 * The write/read operation cannot run without its explicit call-time phrase.
 *
 * @param {Object} ports
 * @returns {Object}
 */
function AKS_createAudit001ProductionOperations_(ports) {
  "use strict";

  ports = ports || {};
  var createAuditService = ports.createAuditService;
  var idProvider = ports.idProvider;
  var resolveOperator = ports.resolveOperator;
  var authorizeOperator = ports.authorizeOperator;
  var confirmationPhrase = "CONFIRMER_TEST_ECRITURE_AUDIT_PRODUCTION";

  function failure_(code, message) {
    var failure = new Error(message);
    failure.code = code;
    return failure;
  }

  function service_() {
    if (typeof createAuditService !== "function" || typeof idProvider !== "function" ||
        typeof resolveOperator !== "function" || typeof authorizeOperator !== "function") {
      throw failure_("AUDIT_PRODUCTION_TEST_UNAVAILABLE",
        "Les opérations de contrôle AUDIT de production sont indisponibles.");
    }
    return createAuditService();
  }

  function authorizedOperator_() {
    var operator = String(resolveOperator() || "").trim().toLowerCase();
    if (!operator || authorizeOperator(operator) !== true) {
      throw failure_("AUDIT_PRODUCTION_ACCESS_DENIED",
        "L'identité active n'est pas autorisée pour ce contrôle AUDIT.");
    }
    return operator;
  }

  function productionPreflight_(service) {
    if (!service || typeof service.preflight !== "function") {
      throw failure_("AUDIT_PRODUCTION_TEST_UNAVAILABLE",
        "Le précontrôle AUDIT de production est indisponible.");
    }
    var result = service.preflight();
    if (!result || result.environment !== "PRODUCTION" ||
        result.writePerformed !== false) {
      throw failure_("AUDIT_PRODUCTION_REQUIRED",
        "Un support AUDIT de production conforme est obligatoire.");
    }
    return result;
  }

  function preflight() {
    authorizedOperator_();
    return productionPreflight_(service_());
  }

  function runControlledWriteRead(confirmation) {
    if (String(confirmation || "") !== confirmationPhrase) {
      throw failure_("AUDIT_PRODUCTION_WRITE_CONFIRMATION_REQUIRED",
        "Une confirmation distincte est obligatoire pour le test d'écriture AUDIT.");
    }
    authorizedOperator_();
    var service = service_();
    productionPreflight_(service);
    if (typeof service.record !== "function") {
      throw failure_("AUDIT_PRODUCTION_TEST_UNAVAILABLE",
        "Le test d'écriture AUDIT de production est indisponible.");
    }
    var correlationId = "corr-audit-production-test-" +
      String(idProvider()).replace(/[^A-Za-z0-9._:-]/g, "-");
    var proof = service.record({
      actorType: "SYSTEM",
      action: "AUDIT_SUPPORT_TEST",
      module: "AUDIT",
      targetType: "AUDIT_SUPPORT",
      targetId: "AKS_AUDIT_SUPPORT",
      result: "REUSSI",
      reasonCode: "",
      correlationId: correlationId,
      criticality: "CRITICAL",
      metadata: { attemptCount: 1, status: "CONFIRMEE" }
    });
    if (!proof || proof.environment !== "PRODUCTION" ||
        proof.action !== "AUDIT_SUPPORT_TEST" ||
        proof.correlation_id !== correlationId) {
      throw failure_("AUDIT_PRODUCTION_READBACK_FAILED",
        "La preuve contrôlée AUDIT n'a pas été relue exactement.");
    }
    return Object.freeze({
      ok: true,
      phase: "WRITE_READ_VERIFIED",
      environment: "PRODUCTION",
      controlledProof: true,
      businessOperation: false,
      auditIdSuffix: String(proof.audit_id || "").slice(-6),
      correlationIdSuffix: correlationId.slice(-6)
    });
  }

  return Object.freeze({
    preflight: preflight,
    runControlledWriteRead: runControlledWriteRead
  });
}

function AKS_createDefaultAudit001ProductionOperations_() {
  function activeIdentity_() {
    return Session.getActiveUser().getEmail();
  }
  var authorize_ = AKS_createDefaultAuditActorAuthorizer_(
    AKS.Admin && AKS.Admin.Access,
    function () { return Session.getEffectiveUser().getEmail(); },
    function () {
      return typeof AKS_createAccessService_ === "function"
        ? AKS_createAccessService_()
        : null;
    }
  );
  return AKS_createAudit001ProductionOperations_({
    createAuditService: AKS_createDefaultAuditService_,
    idProvider: function () { return Utilities.getUuid(); },
    resolveOperator: activeIdentity_,
    authorizeOperator: function (operator) {
      return authorize_("ADMIN", operator, {
        action: "AUDIT_SUPPORT_TEST", result: "INTENTION"
      }) === true;
    }
  });
}

/** Editor-only and strictly read-only. */
function AKS_preflightAudit001Production() {
  var result = AKS_createDefaultAudit001ProductionOperations_().preflight();
  console.log("PRÉCONTRÔLE AUDIT-001 PRODUCTION: " + JSON.stringify(result));
  return result;
}

/**
 * Editor-only controlled proof. A no-argument editor execution always fails.
 * A real call requires a separately authorized explicit confirmation argument.
 */
function AKS_runAudit001ProductionControlledWriteRead(confirmation) {
  var result = AKS_createDefaultAudit001ProductionOperations_()
    .runControlledWriteRead(confirmation);
  console.log("TEST ÉCRITURE/RELECTURE AUDIT-001 PRODUCTION: " + JSON.stringify(result));
  return result;
}

function AKS_createDefaultAccessAccountHistoryService_() {
  var registry = AKS_createPlatformParameterRegistry_();
  var configuration = AKS_createConfigurationService_(
    registry, AKS_createScriptParameterValueStore_());
  var spreadsheetId = configuration.resolve("audit.spreadsheetId").value;
  return AKS.Core.AccessAccountHistory.create({
    accessService: AKS_createAccessService_(),
    gateway: AKS_createConfiguredAuditSheetsGateway_(spreadsheetId),
    catalogs: AKS_getAuditCatalogs_()
  });
}

function AKS_createDefaultAuditActorAuthorizer_(
    adminAccess, resolveTechnicalIdentity, createAccessService) {
  function normalized_(value) {
    return String(value || "").trim().toLowerCase();
  }

  function historicalAdministrator_(actorId) {
    if (!adminAccess || typeof adminAccess.assertAuthorized !== "function") return false;
    try {
      return normalized_(adminAccess.assertAuthorized(actorId)) === actorId;
    } catch (failure) {
      return false;
    }
  }

  function accessManager_(actorId) {
    if (typeof createAccessService !== "function") return false;
    try {
      var access = createAccessService();
      return access && typeof access.getCurrentIdentity === "function" &&
        normalized_(access.getCurrentIdentity()) === actorId &&
        typeof access.assertAdministrativeCapability === "function" &&
        access.assertAdministrativeCapability("ACCESS_MANAGE") === true;
    } catch (failure) {
      return false;
    }
  }

  return function (actorType, actorId, event) {
    actorId = normalized_(actorId);
    if (!actorId) return false;
    if (actorType === "ADMIN") {
      return historicalAdministrator_(actorId) || accessManager_(actorId);
    }
    if (actorType === "USER") {
      return !!event && event.action === "ACCESS_REGISTRY_UPDATE" &&
        event.result === "REFUSE";
    }
    if (actorType === "SERVICE" || actorType === "SYSTEM") {
      return typeof resolveTechnicalIdentity === "function" &&
        normalized_(resolveTechnicalIdentity()) === actorId;
    }
    return false;
  };
}

var AKS_AUDIT_CATALOGS_ = AKS_getAuditCatalogs_();

AKS.Core.Audit = Object.freeze({
  Catalogs: AKS_AUDIT_CATALOGS_,
  record: function (event) { return AKS_createDefaultAuditService_().record(event); },
  recordUnderExistingLock: function (event) {
    return AKS_createDefaultAuditService_().recordUnderExistingLock(event);
  },
  isPersistentRecipeAudit: function () {
    return AKS_createDefaultAuditService_().isPersistentRecipeAudit();
  },
  isPersistentAuditAvailable: function () {
    return AKS_createDefaultAuditService_().isPersistentAuditAvailable();
  },
  preflight: function () { return AKS_createDefaultAuditService_().preflight(); },
  getSchema: function () {
    return Object.freeze({
      version: AKS_AUDIT_CATALOGS_.schemaVersion,
      sheetName: AKS_AUDIT_CATALOGS_.sheetName,
      headers: AKS_AUDIT_CATALOGS_.headers.slice()
    });
  }
});
