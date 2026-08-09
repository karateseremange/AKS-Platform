function AKS_audit001Headers_() {
  return AKS.Core.AuditCatalogs.headers.slice();
}

function AKS_audit001Config_(overrides) {
  var values = {
    "audit.environment": "RECETTE",
    "audit.spreadsheetId": "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789",
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
  var lockHeld = false;
  var logged = [];
  var idIndex = 0;
  var dates = [
    new Date("2026-09-01T10:00:00.000Z"),
    new Date("2026-09-01T10:00:00.001Z"),
    new Date("2026-09-01T10:00:00.002Z"),
    new Date("2026-09-01T10:00:00.003Z")
  ];
  var gateway = overrides.gateway || {
    getResourceId: function () {
      return overrides.resourceId || "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
    },
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
      tryLock: function () {
        lockAttempts += 1;
        lockHeld = overrides.lockAvailable !== false;
        return lockHeld;
      },
      hasLock: function () { return lockHeld; },
      releaseLock: function () { releases += 1; lockHeld = false; }
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

function AKS_testAudit001_persistsMinimizedAccessRegistryProof_() {
  var proof = AKS_audit001Fixture_().service.record(AKS_audit001Event_({
    action: "ACCESS_REGISTRY_UPDATE",
    module: "ACCESS",
    targetType: "ACCESS_REGISTRY",
    targetId: "AKS_ACCESS_REGISTRY",
    result: "REUSSI",
    correlationId: "corr-access-audit-001",
    metadata: {
      beforeRevision: "access-rev/1-a-b-c",
      proposedRevision: "access-rev/1-d-e-f",
      afterRevision: "access-rev/1-d-e-f",
      changedAccountIds: ["teacher@example.com"],
      changedCount: 1,
      selfModification: false,
      restored: false
    }
  }));
  assertEquals_("ACCESS_REGISTRY_UPDATE", proof.action);
  assertEquals_("ACCESS", proof.module);
  assertEquals_("AKS_ACCESS_REGISTRY", proof.target_id);
  assertEquals_(
    '{"afterRevision":"access-rev/1-d-e-f","beforeRevision":"access-rev/1-a-b-c",' +
    '"changedAccountIds":["teacher@example.com"],"changedCount":1,' +
    '"proposedRevision":"access-rev/1-d-e-f","restored":false,' +
    '"selfModification":false}',
    proof.metadata_json
  );
}

function AKS_testAudit001_rejectsInvalidAccessRegistryMetadata_() {
  var fixture = AKS_audit001Fixture_();
  assertThrows_(function () {
    fixture.service.record(AKS_audit001Event_({
      action: "ACCESS_REGISTRY_UPDATE",
      module: "ACCESS",
      targetType: "ACCESS_REGISTRY",
      targetId: "AKS_ACCESS_REGISTRY",
      metadata: {
        beforeRevision: "access-rev/1-a-b-c",
        proposedRevision: "access-rev/1-d-e-f",
        afterRevision: "access-rev/1-d-e-f",
        changedAccountIds: ["teacher@example.com"],
        changedCount: 2,
        selfModification: false,
        restored: false
      }
    }));
  }, "AUDIT_EVENT_INVALID");
  assertEquals_(0, fixture.rows.length);
}

function AKS_testAudit001_persistsAccessServiceCycleEndToEnd_() {
  var sharedLockHeld = false;
  var sharedLockAttempts = 0;
  var sharedLockReleases = 0;
  var sharedLock = {
    tryLock: function () {
      sharedLockAttempts += 1;
      if (sharedLockHeld) return false;
      sharedLockHeld = true;
      return true;
    },
    hasLock: function () { return sharedLockHeld; },
    releaseLock: function () {
      sharedLockReleases += 1;
      sharedLockHeld = false;
    }
  };
  var auditFixture = AKS_audit001Fixture_({ lock: sharedLock });
  var registry = {
    schemaVersion: "access/1.0",
    accounts: [{
      email: "admin@example.com", displayName: "Gestionnaire",
      status: "ACTIVE", roles: ["ADMINISTRATEUR"], assignments: []
    }, {
      email: "teacher@example.com", displayName: "Professeur",
      status: "ACTIVE", roles: ["PROFESSEUR"], assignments: []
    }]
  };
  var access = AKS_createAccessService_({
    identityProvider: function () { return "admin@example.com"; },
    registryStore: {
      load: function () { return registry; },
      save: function (next) { registry = next; },
      clear: function () { registry = null; }
    },
    courseProvider: { list: function () { return []; } },
    legacyAdminEmails: [],
    clock: function () { return new Date("2026-09-01T10:00:00.000Z"); },
    registryLock: sharedLock,
    correlationIdProvider: function () { return "corr-access-end-to-end"; },
    audit: auditFixture.service
  });
  var view = access.readRegistryForAdministration();
  var next = {
    schemaVersion: view.schemaVersion,
    accounts: JSON.parse(JSON.stringify(view.accounts))
  };
  next.accounts[1].displayName = "Professeur modifié";
  var result = access.updateRegistryForAdministration({
    expectedRevision: view.revision,
    registry: next
  });
  assertEquals_("corr-access-end-to-end", result.correlationId);
  assertEquals_(2, auditFixture.rows.length);
  assertEquals_("INTENTION", auditFixture.rows[0][10]);
  assertEquals_("REUSSI", auditFixture.rows[1][10]);
  assertEquals_("ACCESS", auditFixture.rows[0][7]);
  assertEquals_(auditFixture.rows[0][12], auditFixture.rows[1][12]);
  assertEquals_(1, sharedLockAttempts,
    "Le cycle ACCESS ne doit acquérir le verrou de script qu'une fois.");
  assertEquals_(1, sharedLockReleases,
    "Seul le propriétaire du verrou partagé doit le libérer.");
  assertEquals_(false, sharedLockHeld);
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
  assertThrows_(function () {
    fixture.service.record(AKS_audit001Event_({
      metadata: { constructor: "jean@example.com" }
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
  ["AKS Audit NON-RECETTE", "PRODUCTION_RECETTE_ARCHIVE", "  aks audit recette  "]
    .forEach(function (name) {
    var fixture = AKS_audit001Fixture_({ resourceName: name });
    assertThrows_(function () { fixture.service.record(AKS_audit001Event_()); },
      "AUDIT_RECIPE_REQUIRED");
    assertEquals_(0, fixture.lockAttempts());
    });
}

function AKS_testAudit001_rejectsPaddedExactRecipeName_() {
  var fixture = AKS_audit001Fixture_({ resourceName: "  AKS Audit RECETTE  " });
  assertThrows_(function () { fixture.service.record(AKS_audit001Event_()); },
    "AUDIT_RECIPE_REQUIRED");
  assertEquals_(0, fixture.lockAttempts());
}

function AKS_testAudit001_rejectsNonExactRecipeEnvironment_() {
  ["recette", " RECETTE "].forEach(function (environment) {
    var fixture = AKS_audit001Fixture_({
      configValues: { "audit.environment": environment }
    });
    assertThrows_(function () { fixture.service.record(AKS_audit001Event_()); },
      "AUDIT_RECIPE_REQUIRED");
    assertEquals_(0, fixture.lockAttempts());
  });
}

function AKS_testAudit001_rejectsNonExactSchemaVersion_() {
  ["  aks-audit/1.0  ", "AKS-AUDIT/1.0"].forEach(function (schemaVersion) {
    var fixture = AKS_audit001Fixture_({
      configValues: { "audit.schemaVersion": schemaVersion }
    });
    assertThrows_(function () { fixture.service.record(AKS_audit001Event_()); },
      "AUDIT_SCHEMA_MISMATCH");
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

function AKS_testAudit001_rejectsUncontrolledUserOnDefaultPort_() {
  var accessChecks = 0;
  var authorize = AKS_createDefaultAuditActorAuthorizer_(
    { assertAuthorized: function (actorId) {
      if (actorId !== "admin@example.com") throw new Error("refus historique");
      return actorId;
    } },
    function () { return "system.audit@example.com"; },
    function () {
      return {
        getCurrentIdentity: function () { return "manager@example.com"; },
        assertAdministrativeCapability: function (capability) {
          accessChecks += 1;
          return capability === "ACCESS_MANAGE";
        }
      };
    }
  );
  assertEquals_(false, authorize("USER", "member@example.com"));
  assertEquals_(true, authorize("USER", "member@example.com", {
    action: "ACCESS_REGISTRY_UPDATE", result: "REFUSE"
  }));
  assertEquals_(true, authorize("ADMIN", "admin@example.com"));
  assertEquals_(true, authorize("ADMIN", "manager@example.com"));
  assertEquals_(1, accessChecks);
  assertEquals_(true, authorize("SYSTEM", "system.audit@example.com"));
  assertEquals_(false, authorize("SYSTEM", "other-system@example.com"));
}

function AKS_testAudit001_rejectsPersonalTargetIdentifier_() {
  var fixture = AKS_audit001Fixture_();
  assertThrows_(function () {
    fixture.service.record(AKS_audit001Event_({ targetId: "jean@example.com" }));
  }, "AUDIT_EVENT_INVALID");
  assertEquals_(0, fixture.rows.length);
}

function AKS_testAudit001_rejectsPersonalCorrelationIdentifier_() {
  var fixture = AKS_audit001Fixture_();
  assertThrows_(function () {
    fixture.service.record(AKS_audit001Event_({ correlationId: "jean@example.com" }));
  }, "AUDIT_EVENT_INVALID");
  assertEquals_(0, fixture.rows.length);
  assertEquals_(1, fixture.logged.length);
  assertEquals_("", fixture.logged[0].correlationId);
}

function AKS_testAudit001_rejectsInvalidGoogleSpreadsheetIdentifier_() {
  var registry = AKS_createPlatformParameterRegistry_();
  var configuration = AKS_createConfigurationService_(registry, {
    has: function (key) { return key === "audit.spreadsheetId"; },
    get: function () { return "x"; }
  });
  assertThrows_(function () { configuration.resolve("audit.spreadsheetId"); },
    "CONFIG001_INVALID_VALUE");

  var fixture = AKS_audit001Fixture_({
    configValues: { "audit.spreadsheetId": "x" },
    resourceId: "x"
  });
  assertThrows_(function () { fixture.service.record(AKS_audit001Event_()); },
    "AUDIT_RECIPE_REQUIRED");
  assertEquals_(0, fixture.lockAttempts());
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
  assertTrue_(typeof AKS.Core.Audit.recordUnderExistingLock === "function");
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
    getId: function () { return "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789"; },
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

function AKS_testAudit001_requiresNoInscriptionsAuditService_() {
  var source = AKS_createAuditService_.toString();
  assertTrue_(source.indexOf("AKS.Inscriptions") === -1,
    "Le service commun ne doit dépendre d'aucun audit propre à Inscriptions.");
  assertTrue_(AKS.Core.Audit && typeof AKS.Core.Audit.record === "function");
}

function AKS_audit001RecipeFixture_(overrides) {
  overrides = overrides || {};
  var values = Object.create(null);
  values.AKS_AUDIT001_RECIPE_SPREADSHEET_ID = "1AuditRecipeSpreadsheetId00001";
  if (overrides.initialConfig) {
    Object.keys(overrides.initialConfig).forEach(function (key) {
      values[key] = overrides.initialConfig[key];
    });
  }
  var headers = AKS_getAuditCatalogs_().headers.slice();
  var rows = overrides.rows ? overrides.rows.slice() : [headers.slice()];
  var sheet = {
    getLastRow: function () { return rows.length; },
    getLastColumn: function () { return rows.length ? rows[0].length : 0; },
    getRange: function (row, column, height, width) {
      return {
        getDisplayValues: function () {
          return rows.slice(row - 1, row - 1 + height).map(function (source) {
            return source.slice(column - 1, column - 1 + width).map(String);
          });
        },
        setValues: function (incoming) {
          rows[0] = incoming[0].slice();
        }
      };
    }
  };
  var spreadsheet = {
    getId: function () { return "1AuditRecipeSpreadsheetId00001"; },
    getName: function () { return overrides.name || "AKS Audit RECETTE"; },
    getSheetByName: function () { return overrides.missingSheet ? null : sheet; },
    insertSheet: function () {
      rows.length = 0;
      return sheet;
    }
  };
  var recorded = [];
  var configSnapshots = [];
  var recipe = AKS_createAudit001Recipe_({
    propertyStore: {
      getProperty: function (key) {
        return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
      },
      setProperty: function (key, value) {
        if (overrides.failSetKey === key) {
          var failure = new Error("set failure");
          failure.code = "RECIPE_PROPERTY_SET_FAILED";
          throw failure;
        }
        values[key] = value;
      },
      deleteProperty: function (key) { delete values[key]; }
    },
    openSpreadsheet: function () { return spreadsheet; },
    createAuditService: function () {
      configSnapshots.push({
        environment: JSON.parse(values["AKS_CONFIG_VALUE.audit.environment"]).value,
        spreadsheetId: JSON.parse(values["AKS_CONFIG_VALUE.audit.spreadsheetId"]).value,
        schemaVersion: JSON.parse(values["AKS_CONFIG_VALUE.audit.schemaVersion"]).value
      });
      return {
        record: function (event) {
          recorded.push(event);
          if (overrides.concurrentConfigKey && recorded.length === 1) {
            values[overrides.concurrentConfigKey] = "concurrent-change";
          }
          if (overrides.recordFailure) throw overrides.recordFailure;
          return {
            audit_id: "aud-recipe-" + recorded.length,
            environment: "RECETTE",
            correlation_id: event.correlationId
          };
        }
      };
    },
    resolveActor: function () { return "admin@karate-seremange.fr"; },
    authorizeActor: function (actor) {
      return overrides.denied ? "" : actor;
    },
    clock: function () { return new Date("2026-08-08T15:00:00.000Z"); },
    idProvider: function () { return "recipe-uuid-001"; }
  });
  return {
    recipe: recipe,
    values: values,
    rows: rows,
    recorded: recorded,
    configSnapshots: configSnapshots
  };
}

function AKS_testAudit001Recipe_preparesOnlyExactIsolatedTarget_() {
  var refused = AKS_audit001RecipeFixture_({ name: "AKS Audit RECETTE " });
  assertThrows_(function () { refused.recipe.prepare(); }, "AUDIT_RECIPE_TARGET_REFUSED");
  var accepted = AKS_audit001RecipeFixture_({ missingSheet: true, rows: [] });
  var result = accepted.recipe.prepare();
  assertTrue_(result.ok && result.sheetCreated);
  assertEquals_(16, result.headerCount);
  assertEquals_(JSON.stringify(AKS_getAuditCatalogs_().headers), JSON.stringify(accepted.rows[0]));
}

function AKS_testAudit001Recipe_rejectsUnauthorizedActorBeforeMutation_() {
  var fixture = AKS_audit001RecipeFixture_({ denied: true });
  assertThrows_(function () { fixture.recipe.run(); }, "AUDIT_RECIPE_ACCESS_DENIED");
  assertEquals_(0, fixture.recorded.length);
  assertTrue_(!Object.prototype.hasOwnProperty.call(
    fixture.values, "AKS_CONFIG_VALUE.audit.environment"));
}

function AKS_testAudit001Recipe_persistsCorrelatedProofsAndRestoresConfig_() {
  var oldEnvironment = "{\"legacy\":\"environment\"}";
  var fixture = AKS_audit001RecipeFixture_({
    initialConfig: { "AKS_CONFIG_VALUE.audit.environment": oldEnvironment }
  });
  var result = fixture.recipe.run();
  assertTrue_(result.ok && result.configurationRestored);
  assertEquals_(2, result.persistedProofCount);
  assertEquals_(2, fixture.recorded.length);
  assertEquals_(fixture.recorded[0].correlationId, fixture.recorded[1].correlationId);
  assertEquals_("INTENTION", fixture.recorded[0].result);
  assertEquals_("REUSSI", fixture.recorded[1].result);
  assertEquals_("RECETTE", fixture.configSnapshots[0].environment);
  assertEquals_("1AuditRecipeSpreadsheetId00001", fixture.configSnapshots[0].spreadsheetId);
  assertEquals_("aks-audit/1.0", fixture.configSnapshots[0].schemaVersion);
  assertEquals_(oldEnvironment, fixture.values["AKS_CONFIG_VALUE.audit.environment"]);
  assertTrue_(!Object.prototype.hasOwnProperty.call(
    fixture.values, "AKS_CONFIG_VALUE.audit.spreadsheetId"));
  assertTrue_(!Object.prototype.hasOwnProperty.call(
    fixture.values, "AKS_CONFIG_VALUE.audit.schemaVersion"));
}

function AKS_testAudit001Recipe_restoresConfigAfterPersistenceFailure_() {
  var failure = new Error("failure");
  failure.code = "AUDIT_PERSISTENCE_FAILED";
  var previous = "{\"previous\":true}";
  var fixture = AKS_audit001RecipeFixture_({
    recordFailure: failure,
    initialConfig: { "AKS_CONFIG_VALUE.audit.schemaVersion": previous }
  });
  assertThrows_(function () { fixture.recipe.run(); }, "AUDIT_PERSISTENCE_FAILED");
  assertEquals_(previous, fixture.values["AKS_CONFIG_VALUE.audit.schemaVersion"]);
  assertTrue_(!Object.prototype.hasOwnProperty.call(
    fixture.values, "AKS_CONFIG_VALUE.audit.environment"));
  assertTrue_(!Object.prototype.hasOwnProperty.call(
    fixture.values, "AKS_CONFIG_VALUE.audit.spreadsheetId"));
}

function AKS_testAudit001Recipe_restoresConfigAfterPartialInstallationFailure_() {
  var environmentKey = "AKS_CONFIG_VALUE.audit.environment";
  var schemaKey = "AKS_CONFIG_VALUE.audit.schemaVersion";
  var previous = "{\"previous\":\"environment\"}";
  var fixture = AKS_audit001RecipeFixture_({
    failSetKey: schemaKey,
    initialConfig: { "AKS_CONFIG_VALUE.audit.environment": previous }
  });
  assertThrows_(function () { fixture.recipe.run(); }, "RECIPE_PROPERTY_SET_FAILED");
  assertEquals_(previous, fixture.values[environmentKey]);
  assertEquals_(0, fixture.recorded.length);
}

function AKS_testAudit001Recipe_refusesToOverwriteConcurrentConfig_() {
  var key = "AKS_CONFIG_VALUE.audit.environment";
  var fixture = AKS_audit001RecipeFixture_({
    concurrentConfigKey: key
  });
  assertThrows_(function () { fixture.recipe.run(); }, "AUDIT_RECIPE_CONFIG_CONFLICT");
  assertEquals_("concurrent-change", fixture.values[key]);
}

function AKS_testAudit001Recipe_restoresNonConflictingConfigOnConflict_() {
  var keys = [
    "AKS_CONFIG_VALUE.audit.environment",
    "AKS_CONFIG_VALUE.audit.spreadsheetId",
    "AKS_CONFIG_VALUE.audit.schemaVersion"
  ];
  var previous = {};
  keys.forEach(function (key, index) {
    previous[key] = "{\"previous\":" + (index + 1) + "}";
  });
  keys.forEach(function (conflictKey) {
    var fixture = AKS_audit001RecipeFixture_({
      concurrentConfigKey: conflictKey,
      initialConfig: previous
    });
    assertThrows_(function () { fixture.recipe.run(); }, "AUDIT_RECIPE_CONFIG_CONFLICT");
    keys.forEach(function (key) {
      assertEquals_(
        key === conflictKey ? "concurrent-change" : previous[key],
        fixture.values[key]
      );
    });
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
    { name: "preuve ACCESS minimisée", test: AKS_testAudit001_persistsMinimizedAccessRegistryProof_ },
    { name: "métadonnées ACCESS invalides refusées", test: AKS_testAudit001_rejectsInvalidAccessRegistryMetadata_ },
    { name: "cycle ACCESS persistant de bout en bout", test: AKS_testAudit001_persistsAccessServiceCycleEndToEnd_ },
    { name: "schéma fermé de métadonnées", test: AKS_testAudit001_rejectsMetadataOutsideClosedSchema_ },
    { name: "valeur JSON invalide refusée", test: AKS_testAudit001_rejectsInvalidMetadataValue_ },
    { name: "catalogue inconnu refusé", test: AKS_testAudit001_rejectsUnknownCatalogValue_ },
    { name: "motif inconnu réduit", test: AKS_testAudit001_reducesUnknownReason_ },
    { name: "production refusée avant verrou", test: AKS_testAudit001_rejectsNonRecipeBeforeLock_ },
    { name: "ressource inattendue refusée", test: AKS_testAudit001_rejectsResourceMismatch_ },
    { name: "marqueur recette ambigu refusé", test: AKS_testAudit001_rejectsAmbiguousRecipeNames_ },
    { name: "nom recette avec espaces refusé", test: AKS_testAudit001_rejectsPaddedExactRecipeName_ },
    { name: "environnement recette non exact refusé", test: AKS_testAudit001_rejectsNonExactRecipeEnvironment_ },
    { name: "version de schéma non exacte refusée", test: AKS_testAudit001_rejectsNonExactSchemaVersion_ },
    { name: "administrateur non habilité refusé", test: AKS_testAudit001_rejectsUnauthorizedAdminActor_ },
    { name: "utilisateur sans autorité refusé", test: AKS_testAudit001_rejectsUncontrolledUserOnDefaultPort_ },
    { name: "cible personnelle refusée", test: AKS_testAudit001_rejectsPersonalTargetIdentifier_ },
    { name: "corrélation personnelle refusée", test: AKS_testAudit001_rejectsPersonalCorrelationIdentifier_ },
    { name: "identifiant Google invalide refusé", test: AKS_testAudit001_rejectsInvalidGoogleSpreadsheetIdentifier_ },
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
    { name: "service sans API Google", test: AKS_testAudit001_domainServiceContainsNoGoogleApi_ },
    { name: "aucun audit propre à Inscriptions", test: AKS_testAudit001_requiresNoInscriptionsAuditService_ }
    ,{ name: "recette cible isolée exacte", test: AKS_testAudit001Recipe_preparesOnlyExactIsolatedTarget_ }
    ,{ name: "recette administrateur requis", test: AKS_testAudit001Recipe_rejectsUnauthorizedActorBeforeMutation_ }
    ,{ name: "recette preuves corrélées et configuration restaurée", test: AKS_testAudit001Recipe_persistsCorrelatedProofsAndRestoresConfig_ }
    ,{ name: "recette restauration après panne", test: AKS_testAudit001Recipe_restoresConfigAfterPersistenceFailure_ }
    ,{ name: "recette restauration après installation partielle", test: AKS_testAudit001Recipe_restoresConfigAfterPartialInstallationFailure_ }
    ,{ name: "recette conflit de configuration refusé", test: AKS_testAudit001Recipe_refusesToOverwriteConcurrentConfig_ }
    ,{ name: "recette restauration partielle après conflit", test: AKS_testAudit001Recipe_restoresNonConflictingConfigOnConflict_ }
  ]);
}
