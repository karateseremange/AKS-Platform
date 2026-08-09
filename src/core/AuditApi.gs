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
      findRowsByAuditId: function (auditId) {
        return gateway_().findRowsByAuditId(auditId);
      },
      appendRow: function (row) { return gateway_().appendRow(row); }
    }),
    lock: LockService.getScriptLock(),
    resolveActor: activeIdentity_,
    authorizeActor: authorizeActor_,
    resolveTechnicalActor: technicalIdentity_,
    idProvider: function () { return Utilities.getUuid(); },
    technicalLogger: function (event) {
      if (AKS.Logging && typeof AKS.Logging.emit === "function") AKS.Logging.emit(event);
    }
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
  isPersistentRecipeAudit: function () { return true; },
  getSchema: function () {
    return Object.freeze({
      version: AKS_AUDIT_CATALOGS_.schemaVersion,
      sheetName: AKS_AUDIT_CATALOGS_.sheetName,
      headers: AKS_AUDIT_CATALOGS_.headers.slice()
    });
  }
});
