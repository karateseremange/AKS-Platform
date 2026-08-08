function AKS_audit001Headers_() {
  return AKS.Core.AuditCatalogs.headers.slice();
}

function AKS_audit001Config_(overrides) {
  var values = {
    "audit.environment": "RECETTE",
    "audit.spreadsheetId": "audit-recipe-001",
    "audit.schemaVersion": "aks-audit/1.0"
  };
  Object.keys(overrides || {}).forEach(function (key) { values[key] = overrides[key]; });
  return {
    resolve: function (key) {
      if (!Object.prototype.hasOwnProperty.call(values, key)) {
        var error = new Error("missing");
        error.code = "CONFIG001_REQUIRED_PARAMETER_MISSING";
        throw error;
      }
      return Object.freeze({
        key: key,
        value: values[key],
        source: "explicit",
        explicit: true
      });
    }
  };
}

function AKS_audit001Event_(overrides) {
  var event = {
    actorType: "ADMIN",
    actorId: "untrusted@example.com",
    createdBy: "untrusted-system@example.com",
    action: "DOSSIER_UPDATE",
    module: "INSCRIPTIONS",
    targetType: "DOSSIER",
    targetId: "INS-2026-000001",
    result: "REUSSI",
    reasonCode: "",
    correlationId: "corr-audit-001",
    criticality: "CRITICAL",
    metadata: { status: "CONFIRMEE", attemptCount: 1 }
  };
  Object.keys(overrides || {}).forEach(function (key) { event[key] = overrides[key]; });
  return event;
}

function AKS_audit001Fixture_(overrides) {
  overrides = overrides || {};
  var rows = [];
  var releases = 0;
  var lockAttempts = 0;
  var logged = [];
  var idIndex = 0;
  var dates = [
    new Date("2026-09-01T10:00:00.000Z"),
    new Date("2026-09-01T10:00:00.001Z"),
    new Date("2026-09-01T10:00:00.002Z"),
    new Date("2026-09-01T10:00:00.003Z")
  ];
  var gateway = overrides.gateway || {
    getResourceId: function () { return overrides.resourceId || "audit-recipe-001"; },
    getResourceName: function () { return overrides.resourceName || "AKS Audit RECETTE"; },
    getHeaders: function () {
      return (overrides.headers || AKS_audit001Headers_()).slice();
    },
    findRowsByAuditId: function (auditId) {
      return rows.filter(function (row) { return row[1] === auditId; })
        .map(function (row) { return row.slice(); });
    },
    appendRow: function (row) {
      if (overrides.failAppend) throw new Error("append failed");
      var persisted = row.slice();
      if (typeof overrides.mutatePersistedRow === "function") {
        persisted = overrides.mutatePersistedRow(persisted) || persisted;
      }
      rows.push(persisted);
    }
  };
  var service = AKS_createAuditService_({
    config: overrides.config || AKS_audit001Config_(overrides.configValues),
    gateway: gateway,
    lock: overrides.lock || {
      tryLock: function () { lockAttempts += 1; return overrides.lockAvailable !== false; },
      releaseLock: function () { releases += 1; }
    },
    resolveActor: overrides.resolveActor || function () { return "admin@example.com"; },
    authorizeActor: overrides.authorizeActor || function () { return true; },
    resolveTechnicalActor: overrides.resolveTechnicalActor || function () {
      return "system.audit@example.com";
    },
    clock: overrides.clock || function () { return dates.shift(); },
    idProvider: overrides.idProvider || function () {
      idIndex += 1;
      return "00000000-0000-4000-8000-" + ("00000000000" + idIndex).slice(-12);
    },
    lockTimeoutMs: 5000,
    technicalLogger: function (event) { logged.push(event); }
  });
  return {
    service: service,
    rows: rows,
    releases: function () { return releases; },
    lockAttempts: function () { return lockAttempts; },
    logged: logged
  };
}

function AKS_testAudit001_exposesFrozenCatalogs_() {
  var catalogs = AKS.Core.AuditCatalogs;
  assertEquals_("aks-audit/1.0", catalogs.schemaVersion);
  assertEquals_(16, catalogs.headers.length);
  assertTrue_(catalogs.actions.DOSSIER_CREATE);
  assertTrue_(Object.isFrozen(catalogs));
  assertTrue_(Object.isFrozen(catalogs.headers));
  assertTrue_(Object.isFrozen(catalogs.reasonCodes));
}

function AKS_testAudit001_registersTechnicalConfiguration_() {
  var definitions = AKS_createPlatformParameterRegistry_().list();
  var audit = definitions.filter(function (definition) {
    return definition.key.indexOf("audit.") === 0;
  });
  var environment = audit.filter(function (definition) {
    return definition.key === "audit.environment";
  })[0];
  var spreadsheet = audit.filter(function (definition) {
    return definition.key === "audit.spreadsheetId";
  })[0];
  assertEquals_(3, audit.length);
  assertEquals_("enum", environment.type);
  assertEquals_(false, environment.administrable);
  assertEquals_(true, spreadsheet.sensitive);
  assertEquals_(false, spreadsheet.hasDefault);
}

function AKS_testAudit001_persistsAndRereadsCompleteProof_() {
  var fixture = AKS_audit001Fixture_();
  var proof = fixture.service.record(AKS_audit001Event_());
  assertEquals_(1, fixture.rows.length);
  assertEquals_(16, fixture.rows[0].length);
  assertEquals_("aks-audit/1.0", proof.schema_version);
  assertEquals_("RECETTE", proof.environment);
  assertEquals_("corr-audit-001", proof.correlation_id);
  assertEquals_(1, fixture.releases());
}

function AKS_testAudit001_resolvesServerIdentities_() {
  var proof = AKS_audit001Fixture_().service.record(AKS_audit001Event_({
    actorId: "attacker@example.com",
    createdBy: "attacker-system@example.com"
  }));
  assertEquals_("admin@example.com", proof.actor_id);
  assertEquals_("system.audit@example.com", proof.created_by);
}

function AKS_testAudit001_usesServerTimestamps_() {
  var proof = AKS_audit001Fixture_().service.record(AKS_audit001Event_({
    occurredAt: "2000-01-01T00:00:00.000Z",
    createdAt: "2000-01-01T00:00:00.000Z"
  }));
  assertEquals_("2026-09-01T10:00:00.000Z", proof.occurred_at);
  assertEquals_("2026-09-01T10:00:00.001Z", proof.created_at);
}

function AKS_testAudit001_serializesMetadataDeterministically_() {
  var proof = AKS_audit001Fixture_().service.record(AKS_audit001Event_({
    metadata: { status: "confirmee", attemptCount: 2 }
  }));
  assertEquals_('{"attemptCount":2,"status":"CONFIRMEE"}', proof.metadata_json);
}

function AKS_testAudit001_rejectsMetadataOutsideClosedSchema_() {
  var fixture = AKS_audit001Fixture_();
  assertThrows_(function () {
    fixture.service.record(AKS_audit001Event_({
      metadata: {
        note: "jean@example.com",
        comment: "questionnaire médical positif"
      }
    }));
  }, "AUDIT_EVENT_INVALID");
  assertEquals_(0, fixture.rows.length);
}

function AKS_testAudit001_rejectsInvalidMetadataValue_() {
  var fixture = AKS_audit001Fixture_();
  assertThrows_(function () {
    fixture.service.record(AKS_audit001Event_({ metadata: { attemptCount: Infinity } }));
  }, "AUDIT_EVENT_INVALID");
}

function AKS_testAudit001_rejectsUnknownCatalogValue_() {
  var fixture = AKS_audit001Fixture_();
  assertThrows_(function () {
    fixture.service.record(AKS_audit001Event_({ action: "DOSSIER_DELETE" }));
  }, "AUDIT_EVENT_INVALID");
  assertEquals_(0, fixture.lockAttempts());
}

function AKS_testAudit001_reducesUnknownReason_() {
  var proof = AKS_audit001Fixture_().service.record(AKS_audit001Event_({
    result: "ECHEC",
    reasonCode: "database exploded with private detail"
  }));
  assertEquals_("UNEXPECTED_ERROR", proof.reason_code);
}

function AKS_testAudit001_rejectsNonRecipeBeforeLock_() {
  var fixture = AKS_audit001Fixture_({
    configValues: { "audit.environment": "PRODUCTION" }
  });
  assertThrows_(function () { fixture.service.record(AKS_audit001Event_()); },
    "AUDIT_RECIPE_REQUIRED");
  assertEquals_(0, fixture.lockAttempts());
}

function AKS_testAudit001_rejectsResourceMismatch_() {
  var fixture = AKS_audit001Fixture_({ resourceId: "other-resource" });
  assertThrows_(function () { fixture.service.record(AKS_audit001Event_()); },
    "AUDIT_RECIPE_REQUIRED");
}

function AKS_testAudit001_rejectsAmbiguousRecipeNames_() {
  ["AKS Audit NON-RECETTE", "PRODUCTION_RECETTE_ARCHIVE"].forEach(function (name) {
    var fixture = AKS_audit001Fixture_({ resourceName: name });
    assertThrows_(function () { fixture.service.record(AKS_audit001Event_()); },
      "AUDIT_RECIPE_REQUIRED");
    assertEquals_(0, fixture.lockAttempts());
  });
}

function AKS_testAudit001_rejectsUnauthorizedAdminActor_() {
  var fixture = AKS_audit001Fixture_({
    authorizeActor: function (actorType, actorId) {
      return actorType !== "ADMIN" || actorId === "authorized@example.com";
    }
  });
  assertThrows_(function () { fixture.service.record(AKS_audit001Event_()); },
    "AUDIT_EVENT_INVALID");
  assertEquals_(0, fixture.rows.length);
}

function AKS_testAudit001_persistsCorrelatedCompleteCycle_() {
  var fixture = AKS_audit001Fixture_();
  var intention = fixture.service.record(AKS_audit001Event_({
    result: "INTENTION",
    metadata: { status: "INTENTION", attemptCount: 1 }
  }));
  var success = fixture.service.record(AKS_audit001Event_({
    result: "REUSSI",
    metadata: { status: "CONFIRMEE", attemptCount: 1 }
  }));
  assertEquals_(2, fixture.rows.length);
  assertEquals_(intention.correlation_id, success.correlation_id);
  assertEquals_(intention.target_id, success.target_id);
  assertEquals_("INTENTION", intention.result);
  assertEquals_("REUSSI", success.result);
}

function AKS_testAudit001_rejectsHeaderMismatch_() {
  var headers = AKS_audit001Headers_();
  headers[0] = "schema";
  var fixture = AKS_audit001Fixture_({ headers: headers });
  assertThrows_(function () { fixture.service.record(AKS_audit001Event_()); },
    "AUDIT_SCHEMA_MISMATCH");
}

function AKS_testAudit001_rejectsMissingConfiguration_() {
  var fixture = AKS_audit001Fixture_({
    config: AKS_audit001Config_({ "audit.schemaVersion": undefined })
  });
  assertThrows_(function () { fixture.service.record(AKS_audit001Event_()); },
    "AUDIT_SCHEMA_MISMATCH");
}

function AKS_testAudit001_rejectsNonExplicitConfiguration_() {
  var fixture = AKS_audit001Fixture_({
    config: {
      resolve: function (key) {
        return { value: key === "audit.environment" ? "RECETTE" : "x", source: "default", explicit: false };
      }
    }
  });
  assertThrows_(function () { fixture.service.record(AKS_audit001Event_()); },
    "AUDIT_RECIPE_REQUIRED");
}

function AKS_testAudit001_persistsStandardWithoutDegradation_() {
  var fixture = AKS_audit001Fixture_();
  var proof = fixture.service.record(AKS_audit001Event_({ criticality: "STANDARD" }));
  assertEquals_("REUSSI", proof.result);
  assertEquals_(1, fixture.rows.length);
}

function AKS_testAudit001_rejectsUnavailableLock_() {
  var fixture = AKS_audit001Fixture_({ lockAvailable: false });
  assertThrows_(function () { fixture.service.record(AKS_audit001Event_()); },
    "AUDIT_LOCK_TIMEOUT");
  assertEquals_(0, fixture.releases());
}

function AKS_testAudit001_releasesLockAfterPersistenceFailure_() {
  var fixture = AKS_audit001Fixture_({ failAppend: true });
  assertThrows_(function () { fixture.service.record(AKS_audit001Event_()); },
    "AUDIT_PERSISTENCE_FAILED");
  assertEquals_(1, fixture.releases());
  assertEquals_(1, fixture.logged.length);
}

function AKS_testAudit001_rejectsDuplicateIdentifier_() {
  var fixture = AKS_audit001Fixture_({
    idProvider: function () { return "fixed-audit-id"; },
    clock: function () { return new Date("2026-09-01T10:00:00.000Z"); }
  });
  fixture.service.record(AKS_audit001Event_());
  assertThrows_(function () { fixture.service.record(AKS_audit001Event_()); },
    "AUDIT_DUPLICATE");
  assertEquals_(1, fixture.rows.length);
}

function AKS_testAudit001_rejectsAlteredPersistedProof_() {
  var fixture = AKS_audit001Fixture_({
    mutatePersistedRow: function (row) { row[10] = "ECHEC"; return row; }
  });
  assertThrows_(function () { fixture.service.record(AKS_audit001Event_()); },
    "AUDIT_PROOF_MISMATCH");
}

function AKS_testAudit001_returnsDeeplyImmutableProof_() {
  var proof = AKS_audit001Fixture_().service.record(AKS_audit001Event_());
  assertTrue_(Object.isFrozen(proof));
  assertEquals_("DOSSIER_UPDATE", proof.action);
}

function AKS_testAudit001_exposesPersistentCommonPort_() {
  assertTrue_(AKS.Core.Audit && typeof AKS.Core.Audit.record === "function");
  assertEquals_(true, AKS.Core.Audit.isPersistentRecipeAudit());
  assertEquals_(16, AKS.Core.Audit.getSchema().headers.length);
}

function AKS_testAudit001_sheetsGatewayAppendsAndReadsExactTexts_() {
  var rows = [AKS_audit001Headers_()];
  var range = {
    getDisplayValues: function () { return rows.slice(1).map(function (row) { return row.slice(); }); }
  };
  var sheet = {
    getLastColumn: function () { return rows[0].length; },
    getLastRow: function () { return rows.length; },
    getRange: function (row) {
      if (row === 1) return { getDisplayValues: function () { return [rows[0].slice()]; } };
      return range;
    },
    appendRow: function (row) { rows.push(row.slice()); }
  };
  var gateway = AKS_createAuditSheetsGateway_({
    getId: function () { return "audit-recipe-001"; },
    getName: function () { return "AKS Audit RECETTE"; },
    getSheetByName: function () { return sheet; }
  });
  var candidate = AKS_audit001Headers_().map(function (header) { return header; });
  candidate[1] = "aud-gateway-001";
  gateway.appendRow(candidate);
  var found = gateway.findRowsByAuditId("aud-gateway-001");
  assertEquals_(1, found.length);
  assertEquals_(JSON.stringify(candidate), JSON.stringify(found[0]));
}

function AKS_testAudit001_sheetsGatewayRejectsMissingSheet_() {
  var gateway = AKS_createAuditSheetsGateway_({
    getId: function () { return "audit-recipe-001"; },
    getName: function () { return "AKS Audit RECETTE"; },
    getSheetByName: function () { return null; }
  });
  assertThrows_(function () { gateway.getHeaders(); }, "AUDIT_SCHEMA_MISMATCH");
}

function AKS_testAudit001_domainServiceContainsNoGoogleApi_() {
  var source = AKS_createAuditService_.toString();
  ["SpreadsheetApp", "DriveApp", "LockService", "Session", "PropertiesService"]
    .forEach(function (token) {
      assertTrue_(source.indexOf(token) === -1, "API Google interdite dans le service : " + token);
    });
}

function AKS_runAudit001Tests() {
  return AKS_runNamedTestSuite_("AUDIT-001 — audit persistant commun", [
    { name: "catalogues figés", test: AKS_testAudit001_exposesFrozenCatalogs_ },
    { name: "configuration technique", test: AKS_testAudit001_registersTechnicalConfiguration_ },
    { name: "preuve complète relue", test: AKS_testAudit001_persistsAndRereadsCompleteProof_ },
    { name: "identités serveur", test: AKS_testAudit001_resolvesServerIdentities_ },
    { name: "horodatages serveur", test: AKS_testAudit001_usesServerTimestamps_ },
    { name: "JSON canonique", test: AKS_testAudit001_serializesMetadataDeterministically_ },
    { name: "schéma fermé de métadonnées", test: AKS_testAudit001_rejectsMetadataOutsideClosedSchema_ },
    { name: "valeur JSON invalide refusée", test: AKS_testAudit001_rejectsInvalidMetadataValue_ },
    { name: "catalogue inconnu refusé", test: AKS_testAudit001_rejectsUnknownCatalogValue_ },
    { name: "motif inconnu réduit", test: AKS_testAudit001_reducesUnknownReason_ },
    { name: "production refusée avant verrou", test: AKS_testAudit001_rejectsNonRecipeBeforeLock_ },
    { name: "ressource inattendue refusée", test: AKS_testAudit001_rejectsResourceMismatch_ },
    { name: "marqueur recette ambigu refusé", test: AKS_testAudit001_rejectsAmbiguousRecipeNames_ },
    { name: "administrateur non habilité refusé", test: AKS_testAudit001_rejectsUnauthorizedAdminActor_ },
    { name: "cycle corrélé complet", test: AKS_testAudit001_persistsCorrelatedCompleteCycle_ },
    { name: "en-tête incompatible refusé", test: AKS_testAudit001_rejectsHeaderMismatch_ },
    { name: "configuration absente refusée", test: AKS_testAudit001_rejectsMissingConfiguration_ },
    { name: "configuration non explicite refusée", test: AKS_testAudit001_rejectsNonExplicitConfiguration_ },
    { name: "standard sans dégradation", test: AKS_testAudit001_persistsStandardWithoutDegradation_ },
    { name: "verrou indisponible refusé", test: AKS_testAudit001_rejectsUnavailableLock_ },
    { name: "verrou libéré après panne", test: AKS_testAudit001_releasesLockAfterPersistenceFailure_ },
    { name: "identifiant dupliqué refusé", test: AKS_testAudit001_rejectsDuplicateIdentifier_ },
    { name: "preuve altérée refusée", test: AKS_testAudit001_rejectsAlteredPersistedProof_ },
    { name: "preuve immuable", test: AKS_testAudit001_returnsDeeplyImmutableProof_ },
    { name: "port commun persistant", test: AKS_testAudit001_exposesPersistentCommonPort_ },
    { name: "adaptateur Sheets exact", test: AKS_testAudit001_sheetsGatewayAppendsAndReadsExactTexts_ },
    { name: "onglet Sheets obligatoire", test: AKS_testAudit001_sheetsGatewayRejectsMissingSheet_ },
    { name: "service sans API Google", test: AKS_testAudit001_domainServiceContainsNoGoogleApi_ }
  ]);
}
