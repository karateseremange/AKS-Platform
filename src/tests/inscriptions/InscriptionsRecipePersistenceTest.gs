function AKS_inscriptions010Clone_(value) {
  return JSON.parse(JSON.stringify(value));
}

function AKS_inscriptions010Headers_() {
  return {
    Metadata: ["key", "value"],
    Sequences: ["sequence_type", "scope_key", "last_value", "row_version", "updated_at", "updated_by"],
    Commandes: [
      "schema_version", "command_id", "idempotency_key", "payload_fingerprint", "actor",
      "action", "target_type", "target_id", "module", "season", "section", "course_code",
      "correlation_id", "status", "attempt_count", "created_at", "created_by", "updated_at",
      "updated_by", "row_version", "failure_code"
    ]
  };
}

function AKS_inscriptions010Metadata_(overrides) {
  var values = {
    schema_version: "inscriptions-recipe-tech/1.0",
    environment: "RECETTE",
    timezone: "Europe/Paris",
    resource_kind: "AKS_INSCRIPTIONS_RECIPE",
    resource_id: "recipe-sheet-010",
    created_at: "2026-09-01T10:00:00.000Z",
    validated_at: "2026-09-01T10:05:00.000Z"
  };
  Object.keys(overrides || {}).forEach(function (key) { values[key] = overrides[key]; });
  return [["key", "value"]].concat(Object.keys(values).map(function (key) {
    return [key, values[key]];
  }));
}

function AKS_inscriptions010Fixture_(overrides) {
  overrides = overrides || {};
  var headers = AKS_inscriptions010Headers_();
  var tables = overrides.tables || {
    Metadata: AKS_inscriptions010Metadata_(overrides.metadata),
    Sequences: [headers.Sequences.slice()],
    Commandes: [headers.Commandes.slice()]
  };
  var resourceId = overrides.resourceId || "recipe-sheet-010";
  var released = 0;
  var lockAttempts = 0;
  var reads = 0;
  var mutations = [];
  function persistedRow_(operation, name, row) {
    var persisted = AKS_inscriptions010Clone_(row);
    if (typeof overrides.mutatePersistedRow === "function") {
      persisted = overrides.mutatePersistedRow(operation, name, persisted) || persisted;
    }
    return AKS_inscriptions010Clone_(persisted);
  }
  var gateway = {
    getResourceId: function () { return resourceId; },
    getTimezone: function () { return overrides.timezone || "Europe/Paris"; },
    getSheetNames: function () { return Object.keys(tables); },
    readRows: function (name) { reads += 1; return AKS_inscriptions010Clone_(tables[name] || []); },
    appendRow: function (name, row) {
      if (overrides.failMutation) throw new Error("mutation failed");
      mutations.push({ type: "append", name: name });
      tables[name].push(persistedRow_("append", name, row));
    },
    updateRow: function (name, rowNumber, row) {
      if (overrides.failMutation) throw new Error("mutation failed");
      mutations.push({ type: "update", name: name, rowNumber: rowNumber });
      tables[name][rowNumber - 1] = persistedRow_("update", name, row);
    }
  };
  var audit = overrides.audit || {
    record: function () { return true; },
    isPersistentRecipeAudit: function () { return true; }
  };
  var service = AKS.Inscriptions.createRecipePersistenceService({
    gateway: gateway,
    lock: overrides.lock || {
      tryLock: function () { lockAttempts += 1; return overrides.lockAvailable !== false; },
      releaseLock: function () { released += 1; }
    },
    audit: audit,
    technicalActor: overrides.technicalActor || function () { return "system.recipe@example.com"; },
    config: overrides.config || { environment: "RECETTE", spreadsheetId: "recipe-sheet-010" },
    lockTimeoutMs: Object.prototype.hasOwnProperty.call(overrides, "lockTimeoutMs")
      ? overrides.lockTimeoutMs : 5000,
    clock: overrides.clock || function () { return new Date("2026-09-01T10:15:00.000Z"); }
  });
  return {
    service: service,
    tables: tables,
    mutations: mutations,
    reads: function () { return reads; },
    lockAttempts: function () { return lockAttempts; },
    releases: function () { return released; }
  };
}

function AKS_inscriptions010Record_(overrides) {
  var record = {
    schemaVersion: "inscriptions-command/1.0",
    commandId: "CMD-corr-010",
    idempotencyKey: "idem-010",
    payloadFingerprint: "fp-010",
    actor: "operator@example.com",
    action: "DOSSIER_UPDATE",
    target: { type: "DOSSIER", id: "INS-2026-000010" },
    scope: { module: "INSCRIPTIONS", season: "2026-2027", section: "KARATE", courseCode: "" },
    correlationId: "corr-010",
    status: "INTENTION",
    attemptCount: 0,
    createdAt: "2026-09-01T10:10:00.000Z",
    updatedAt: "2026-09-01T10:10:00.000Z",
    version: 1
  };
  Object.keys(overrides || {}).forEach(function (key) { record[key] = overrides[key]; });
  return record;
}

function AKS_testInscriptions010_exposesExactSchema_() {
  var schema = AKS_inscriptions010Fixture_().service.getSchema();
  assertEquals_("inscriptions-recipe-tech/1.0", schema.version);
  assertEquals_("Europe/Paris", schema.timezone);
  assertEquals_("AKS_INSCRIPTIONS_RECIPE", schema.resourceKind);
  assertEquals_(JSON.stringify(["Metadata", "Sequences", "Commandes"]), JSON.stringify(schema.sheets));
  assertEquals_(21, schema.headers.Commandes.length);
}

function AKS_testInscriptions010_acceptsExactRecipe_() {
  var fixture = AKS_inscriptions010Fixture_();
  var metadata = fixture.service.assertRecipe();
  assertEquals_("RECETTE", metadata.environment);
  assertEquals_(0, fixture.mutations.length);
}

function AKS_testInscriptions010_rejectsNonRecipeBeforeMutation_() {
  var fixture = AKS_inscriptions010Fixture_({
    config: { environment: "PRODUCTION", spreadsheetId: "recipe-sheet-010" }
  });
  assertThrows_(function () { fixture.service.journal.reserve(AKS_inscriptions010Record_()); },
    "INSCRIPTIONS_RECIPE_REQUIRED");
  assertEquals_(0, fixture.mutations.length);
  assertEquals_(0, fixture.lockAttempts());
}

function AKS_testInscriptions010_rejectsResourceMismatch_() {
  var fixture = AKS_inscriptions010Fixture_({ resourceId: "other-sheet" });
  assertThrows_(function () { fixture.service.assertRecipe(); },
    "INSCRIPTIONS_RECIPE_RESOURCE_MISMATCH");
}

function AKS_testInscriptions010_rejectsUnexpectedSheet_() {
  var fixture = AKS_inscriptions010Fixture_();
  fixture.tables.Licencies = [["forbidden"]];
  assertThrows_(function () { fixture.service.assertRecipe(); }, "INSCRIPTIONS_SCHEMA_MISMATCH");
}

function AKS_testInscriptions010_rejectsHeaderDrift_() {
  var fixture = AKS_inscriptions010Fixture_();
  fixture.tables.Commandes[0][0] = "schema";
  assertThrows_(function () { fixture.service.assertRecipe(); }, "INSCRIPTIONS_SCHEMA_MISMATCH");
}

function AKS_testInscriptions010_rejectsSpreadsheetTimezoneDrift_() {
  var fixture = AKS_inscriptions010Fixture_({ timezone: "UTC" });
  assertThrows_(function () { fixture.service.assertRecipe(); }, "INSCRIPTIONS_SCHEMA_MISMATCH");
}

function AKS_testInscriptions010_rejectsUnknownMetadata_() {
  var tables = {
    Metadata: AKS_inscriptions010Metadata_().concat([["unexpected", "value"]]),
    Sequences: [AKS_inscriptions010Headers_().Sequences],
    Commandes: [AKS_inscriptions010Headers_().Commandes]
  };
  assertThrows_(function () { AKS_inscriptions010Fixture_({ tables: tables }).service.assertRecipe(); },
    "INSCRIPTIONS_SCHEMA_MISMATCH");
}

function AKS_testInscriptions010_rejectsDuplicateMetadata_() {
  var tables = {
    Metadata: AKS_inscriptions010Metadata_().concat([["environment", "RECETTE"]]),
    Sequences: [AKS_inscriptions010Headers_().Sequences],
    Commandes: [AKS_inscriptions010Headers_().Commandes]
  };
  assertThrows_(function () { AKS_inscriptions010Fixture_({ tables: tables }).service.assertRecipe(); },
    "INSCRIPTIONS_SCHEMA_MISMATCH");
}

function AKS_testInscriptions010_requiresPersistentCommonAudit_() {
  assertThrows_(function () {
    AKS_inscriptions010Fixture_({
      audit: { record: function () { return true; }, isPersistentRecipeAudit: function () { return false; } }
    });
  }, "INSCRIPTIONS_AUDIT_REQUIRED");
}

function AKS_testInscriptions010_loadsProjectedJournal_() {
  var fixture = AKS_inscriptions010Fixture_();
  fixture.service.journal.reserve(AKS_inscriptions010Record_());
  var record = fixture.service.journal.load("idem-010");
  assertEquals_("DOSSIER", record.target.type);
  assertEquals_("INSCRIPTIONS", record.scope.module);
  assertEquals_(21, fixture.tables.Commandes[1].length);
  assertTrue_(JSON.stringify(fixture.tables.Commandes).indexOf("privateValue") === -1);
}

function AKS_testInscriptions010_reservesOnceUnderLock_() {
  var fixture = AKS_inscriptions010Fixture_();
  fixture.service.journal.reserve(AKS_inscriptions010Record_());
  assertThrows_(function () { fixture.service.journal.reserve(AKS_inscriptions010Record_()); },
    "INSCRIPTIONS_IDEMPOTENCY_CONFLICT");
  assertEquals_(2, fixture.lockAttempts());
  assertEquals_(2, fixture.releases());
  assertEquals_(2, fixture.tables.Commandes.length);
}

function AKS_testInscriptions010_rejectsAlteredJournalReservation_() {
  var fixture = AKS_inscriptions010Fixture_({
    mutatePersistedRow: function (operation, name, row) {
      if (operation === "append" && name === "Commandes") row[13] = "EN_COURS";
      return row;
    }
  });
  assertThrows_(function () {
    fixture.service.journal.reserve(AKS_inscriptions010Record_());
  }, "INSCRIPTIONS_JOURNAL_INVALID");
}

function AKS_testInscriptions010_rejectsDuplicateJournalRows_() {
  var fixture = AKS_inscriptions010Fixture_();
  fixture.service.journal.reserve(AKS_inscriptions010Record_());
  fixture.tables.Commandes.push(AKS_inscriptions010Clone_(fixture.tables.Commandes[1]));
  assertThrows_(function () { fixture.service.journal.load("idem-010"); },
    "INSCRIPTIONS_JOURNAL_DUPLICATE");
}

function AKS_testInscriptions010_updatesExpectedJournalVersion_() {
  var fixture = AKS_inscriptions010Fixture_();
  fixture.service.journal.reserve(AKS_inscriptions010Record_());
  var updated = AKS_inscriptions010Record_({
    status: "EN_COURS", attemptCount: 1, version: 2,
    updatedAt: "2026-09-01T10:11:00.000Z"
  });
  var saved = fixture.service.journal.save(updated, 1);
  assertEquals_(2, saved.version);
  assertEquals_("system.recipe@example.com", fixture.tables.Commandes[1][18]);
  assertEquals_("system.recipe@example.com", fixture.tables.Commandes[1][16]);
}

function AKS_testInscriptions010_rejectsAlteredJournalUpdate_() {
  var alterUpdates = false;
  var fixture = AKS_inscriptions010Fixture_({
    mutatePersistedRow: function (operation, name, row) {
      if (alterUpdates && operation === "update" && name === "Commandes") row[18] = "other@example.com";
      return row;
    }
  });
  fixture.service.journal.reserve(AKS_inscriptions010Record_());
  alterUpdates = true;
  assertThrows_(function () {
    fixture.service.journal.save(AKS_inscriptions010Record_({
      status: "EN_COURS", attemptCount: 1, version: 2,
      updatedAt: "2026-09-01T10:11:00.000Z"
    }), 1);
  }, "INSCRIPTIONS_JOURNAL_INVALID");
}

function AKS_testInscriptions010_preservesCreatedByOnUpdate_() {
  var actor = "creator@example.com";
  var fixture = AKS_inscriptions010Fixture_({ technicalActor: function () { return actor; } });
  fixture.service.journal.reserve(AKS_inscriptions010Record_());
  actor = "updater@example.com";
  fixture.service.journal.save(AKS_inscriptions010Record_({
    status: "EN_COURS", attemptCount: 1, version: 2,
    updatedAt: "2026-09-01T10:11:00.000Z"
  }), 1);
  assertEquals_("creator@example.com", fixture.tables.Commandes[1][16]);
  assertEquals_("updater@example.com", fixture.tables.Commandes[1][18]);
  assertEquals_("operator@example.com", fixture.tables.Commandes[1][4]);
}

function AKS_testInscriptions010_rejectsStaleJournalVersion_() {
  var fixture = AKS_inscriptions010Fixture_();
  fixture.service.journal.reserve(AKS_inscriptions010Record_());
  assertThrows_(function () {
    fixture.service.journal.save(AKS_inscriptions010Record_({ version: 3 }), 2);
  }, "INSCRIPTIONS_JOURNAL_VERSION_CONFLICT");
  assertEquals_(1, fixture.tables.Commandes[1][19]);
}

function AKS_testInscriptions010_rejectsJournalIdentityChange_() {
  var fixture = AKS_inscriptions010Fixture_();
  fixture.service.journal.reserve(AKS_inscriptions010Record_());
  assertThrows_(function () {
    fixture.service.journal.save(AKS_inscriptions010Record_({
      commandId: "CMD-other", status: "EN_COURS", attemptCount: 1, version: 2,
      updatedAt: "2026-09-01T10:11:00.000Z"
    }), 1);
  }, "INSCRIPTIONS_IDEMPOTENCY_CONFLICT");
  assertEquals_("CMD-corr-010", fixture.tables.Commandes[1][1]);
}

function AKS_testInscriptions010_rejectsInvalidJournalState_() {
  var fixture = AKS_inscriptions010Fixture_();
  assertThrows_(function () {
    fixture.service.journal.reserve(AKS_inscriptions010Record_({ status: "INCONNU" }));
  }, "INSCRIPTIONS_JOURNAL_INVALID");
  assertEquals_(1, fixture.tables.Commandes.length);
}

function AKS_testInscriptions010_allocatesMonotoneGlobalSequence_() {
  var fixture = AKS_inscriptions010Fixture_();
  var first = fixture.service.sequences.allocate("LICENCIE", "GLOBAL", "system@example.com");
  var second = fixture.service.sequences.allocate("LICENCIE", "GLOBAL", "system@example.com");
  assertEquals_("LIC-000001", first.id);
  assertEquals_("LIC-000002", second.id);
  assertEquals_(2, second.version);
}

function AKS_testInscriptions010_usesInjectedSequenceActor_() {
  var fixture = AKS_inscriptions010Fixture_({
    technicalActor: function () { return "trusted.recipe@example.com"; }
  });
  fixture.service.sequences.allocate("LICENCIE", "GLOBAL", "forged@example.com");
  assertEquals_("trusted.recipe@example.com", fixture.tables.Sequences[1][5]);
}

function AKS_testInscriptions010_rejectsAlteredSequenceWrite_() {
  var fixture = AKS_inscriptions010Fixture_({
    mutatePersistedRow: function (operation, name, row) {
      if (name === "Sequences") row[5] = "other@example.com";
      return row;
    }
  });
  assertThrows_(function () {
    fixture.service.sequences.allocate("LICENCIE", "GLOBAL", "forged@example.com");
  }, "INSCRIPTIONS_SEQUENCE_CONFLICT");
}

function AKS_testInscriptions010_formatsSeasonSequence_() {
  var result = AKS_inscriptions010Fixture_().service.sequences.allocate(
    "DOSSIER", "2026", "system@example.com");
  assertEquals_("INS-2026-000001", result.id);
}

function AKS_testInscriptions010_formatsTypedImportSequence_() {
  var result = AKS_inscriptions010Fixture_().service.sequences.allocate(
    "IMPORT", "2026:FORM_PREINSCRIPTION", "system@example.com");
  assertEquals_("IMP-2026-000001", result.id);
}

function AKS_testInscriptions010_rejectsInvalidSequenceScope_() {
  var fixture = AKS_inscriptions010Fixture_();
  assertThrows_(function () {
    fixture.service.sequences.allocate("DOSSIER", "GLOBAL", "system@example.com");
  }, "INSCRIPTIONS_SEQUENCE_CONFLICT");
  assertEquals_(1, fixture.tables.Sequences.length);
}

function AKS_testInscriptions010_rejectsDuplicateSequence_() {
  var fixture = AKS_inscriptions010Fixture_();
  fixture.tables.Sequences.push(["LICENCIE", "GLOBAL", 1, 1, "2026-09-01T10:00:00.000Z", "a"]);
  fixture.tables.Sequences.push(["LICENCIE", "GLOBAL", 2, 2, "2026-09-01T10:01:00.000Z", "b"]);
  assertThrows_(function () {
    fixture.service.sequences.allocate("LICENCIE", "GLOBAL", "system@example.com");
  }, "INSCRIPTIONS_SEQUENCE_CONFLICT");
}

function AKS_testInscriptions010_rejectsLockTimeoutWithoutMutation_() {
  var fixture = AKS_inscriptions010Fixture_({ lockAvailable: false });
  assertThrows_(function () {
    fixture.service.sequences.allocate("LICENCIE", "GLOBAL", "system@example.com");
  }, "INSCRIPTIONS_LOCK_TIMEOUT");
  assertEquals_(0, fixture.mutations.length);
  assertEquals_(0, fixture.releases());
}

function AKS_testInscriptions010_releasesLockAfterWriteFailure_() {
  var fixture = AKS_inscriptions010Fixture_({ failMutation: true });
  assertThrows_(function () {
    fixture.service.sequences.allocate("LICENCIE", "GLOBAL", "system@example.com");
  }, undefined);
  assertEquals_(1, fixture.releases());
}

function AKS_testInscriptions010_automaticCoreContainsNoGoogleApi_() {
  var source = String(AKS.Inscriptions.createRecipePersistenceService);
  ["SpreadsheetApp", "DriveApp", "PropertiesService", "LockService", "Session"].forEach(function (name) {
    assertTrue_(source.indexOf(name) === -1, "API Google interdite dans le noyau automatique : " + name);
  });
}

function AKS_testInscriptions010_recipeFunctionsStayOutOfAutomaticSuite_() {
  var source = String(AKS_runValidationSuiteV11);
  assertTrue_(source.indexOf("AKS_recipeInscriptions010_") === -1);
}

function AKS_testInscriptions010_registersControlledConfiguration_() {
  var registry = AKS_createInscriptions010ParameterRegistry_();
  assertEquals_("inscriptions-recipe-tech/1.0", registry.get("inscriptions.schemaVersion").defaultValue);
  assertEquals_("Europe/Paris", registry.get("inscriptions.timezone").defaultValue);
  assertEquals_(5000, registry.get("inscriptions.lockTimeoutMs").defaultValue);
  assertTrue_(registry.get("inscriptions.environment").required);
  assertTrue_(registry.get("inscriptions.spreadsheetId").required);
  assertTrue_(!registry.get("inscriptions.environment").administrable);
  assertTrue_(!registry.get("inscriptions.spreadsheetId").administrable);
}

function AKS_runInscriptions010Suite() {
  return AKS_runNamedTestSuite_("INSCRIPTIONS-010", [
    { name: "schéma exact", test: AKS_testInscriptions010_exposesExactSchema_ },
    { name: "recette exacte", test: AKS_testInscriptions010_acceptsExactRecipe_ },
    { name: "production refusée avant mutation", test: AKS_testInscriptions010_rejectsNonRecipeBeforeMutation_ },
    { name: "ressource incohérente", test: AKS_testInscriptions010_rejectsResourceMismatch_ },
    { name: "onglet inattendu", test: AKS_testInscriptions010_rejectsUnexpectedSheet_ },
    { name: "en-têtes figés", test: AKS_testInscriptions010_rejectsHeaderDrift_ },
    { name: "fuseau physique figé", test: AKS_testInscriptions010_rejectsSpreadsheetTimezoneDrift_ },
    { name: "métadonnée inconnue", test: AKS_testInscriptions010_rejectsUnknownMetadata_ },
    { name: "métadonnée dupliquée", test: AKS_testInscriptions010_rejectsDuplicateMetadata_ },
    { name: "audit commun persistant", test: AKS_testInscriptions010_requiresPersistentCommonAudit_ },
    { name: "journal projeté", test: AKS_testInscriptions010_loadsProjectedJournal_ },
    { name: "réservation unique verrouillée", test: AKS_testInscriptions010_reservesOnceUnderLock_ },
    { name: "réservation altérée détectée", test: AKS_testInscriptions010_rejectsAlteredJournalReservation_ },
    { name: "doublon de journal", test: AKS_testInscriptions010_rejectsDuplicateJournalRows_ },
    { name: "mise à jour versionnée", test: AKS_testInscriptions010_updatesExpectedJournalVersion_ },
    { name: "mise à jour altérée détectée", test: AKS_testInscriptions010_rejectsAlteredJournalUpdate_ },
    { name: "auteurs techniques distincts", test: AKS_testInscriptions010_preservesCreatedByOnUpdate_ },
    { name: "version périmée", test: AKS_testInscriptions010_rejectsStaleJournalVersion_ },
    { name: "identité de journal immuable", test: AKS_testInscriptions010_rejectsJournalIdentityChange_ },
    { name: "état inconnu", test: AKS_testInscriptions010_rejectsInvalidJournalState_ },
    { name: "séquence globale monotone", test: AKS_testInscriptions010_allocatesMonotoneGlobalSequence_ },
    { name: "acteur de séquence injecté", test: AKS_testInscriptions010_usesInjectedSequenceActor_ },
    { name: "écriture de séquence altérée", test: AKS_testInscriptions010_rejectsAlteredSequenceWrite_ },
    { name: "séquence saisonnière", test: AKS_testInscriptions010_formatsSeasonSequence_ },
    { name: "séquence import typée", test: AKS_testInscriptions010_formatsTypedImportSequence_ },
    { name: "portée de séquence invalide", test: AKS_testInscriptions010_rejectsInvalidSequenceScope_ },
    { name: "séquence dupliquée", test: AKS_testInscriptions010_rejectsDuplicateSequence_ },
    { name: "verrou indisponible", test: AKS_testInscriptions010_rejectsLockTimeoutWithoutMutation_ },
    { name: "échec avant verrou", test: AKS_testInscriptions010_releasesLockAfterWriteFailure_ },
    { name: "noyau sans API Google", test: AKS_testInscriptions010_automaticCoreContainsNoGoogleApi_ },
    { name: "recette hors suite automatique", test: AKS_testInscriptions010_recipeFunctionsStayOutOfAutomaticSuite_ },
    { name: "configuration contrôlée", test: AKS_testInscriptions010_registersControlledConfiguration_ }
  ]);
}
