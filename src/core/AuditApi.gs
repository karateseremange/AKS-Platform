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
    technicalIdentity_
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

function AKS_createDefaultAuditActorAuthorizer_(adminAccess, resolveTechnicalIdentity) {
  function normalized_(value) {
    return String(value || "").trim().toLowerCase();
  }

  return function (actorType, actorId) {
    actorId = normalized_(actorId);
    if (!actorId) return false;
    if (actorType === "ADMIN") {
      if (!adminAccess || typeof adminAccess.assertAuthorized !== "function") return false;
      try {
        return normalized_(adminAccess.assertAuthorized(actorId)) === actorId;
      } catch (failure) {
        return false;
      }
    }
    if (actorType === "USER") return false;
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
  isPersistentRecipeAudit: function () { return true; },
  getSchema: function () {
    return Object.freeze({
      version: AKS_AUDIT_CATALOGS_.schemaVersion,
      sheetName: AKS_AUDIT_CATALOGS_.sheetName,
      headers: AKS_AUDIT_CATALOGS_.headers.slice()
    });
  }
});
