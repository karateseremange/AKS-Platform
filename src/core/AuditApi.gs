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
    resolveTechnicalActor: technicalIdentity_,
    idProvider: function () { return Utilities.getUuid(); },
    technicalLogger: function (event) {
      if (AKS.Logging && typeof AKS.Logging.emit === "function") AKS.Logging.emit(event);
    }
  });
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
