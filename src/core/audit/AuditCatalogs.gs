var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * AUDIT-001 closed catalogs for schema aks-audit/1.0.
 */
function AKS_createAuditCatalogs_() {
  function frozenSet_(values) {
    var set = {};
    values.forEach(function (value) { set[value] = true; });
    return Object.freeze(set);
  }

  return Object.freeze({
    schemaVersion: "aks-audit/1.0",
    sheetName: "AKS_Audit",
    headers: Object.freeze([
      "schema_version", "audit_id", "occurred_at", "environment",
      "actor_type", "actor_id", "action", "module", "target_type",
      "target_id", "result", "reason_code", "correlation_id",
      "metadata_json", "created_at", "created_by"
    ]),
    actorTypes: frozenSet_(["USER", "ADMIN", "SERVICE", "SYSTEM"]),
    actions: frozenSet_(["DOSSIER_CREATE", "DOSSIER_UPDATE"]),
    modules: frozenSet_(["INSCRIPTIONS"]),
    targetTypes: frozenSet_(["DOSSIER"]),
    results: frozenSet_(["INTENTION", "REUSSI", "ECHEC", "REFUSE", "ANNULE"]),
    reasonCodes: frozenSet_([
      "", "INSCRIPTIONS_COMMAND_FAILED", "INSCRIPTIONS_CONTROL_FAILED",
      "INSCRIPTIONS_ATTEMPTS_EXHAUSTED", "INSCRIPTIONS_RECOVERY_ABSENT",
      "INSCRIPTIONS_RECONCILIATION_AMBIGUOUS", "UNEXPECTED_ERROR"
    ]),
    criticalities: frozenSet_(["CRITICAL", "STANDARD"]),
    metadataSchemas: Object.freeze({
      DOSSIER_CREATE: frozenSet_(["attemptCount", "status"]),
      DOSSIER_UPDATE: frozenSet_(["attemptCount", "status"])
    }),
    metadataStatuses: frozenSet_([
      "INTENTION", "EN_COURS", "CONFIRMEE", "ECHEC_RECUPERABLE", "ECHEC_FINAL"
    ])
  });
}

function AKS_getAuditCatalogs_() {
  if (!AKS.Core.AuditCatalogs) {
    AKS.Core.AuditCatalogs = AKS_createAuditCatalogs_();
  }
  return AKS.Core.AuditCatalogs;
}

AKS_getAuditCatalogs_();
