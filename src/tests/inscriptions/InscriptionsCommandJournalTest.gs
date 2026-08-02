function AKS_inscriptions009MemoryJournal_(seed) {
  var entries = {};
  (seed || []).forEach(function (entry) { entries[entry.idempotencyKey] = JSON.parse(JSON.stringify(entry)); });
  return {
    load: function (key) {
      return entries[key] ? JSON.parse(JSON.stringify(entries[key])) : null;
    },
    reserve: function (entry) {
      if (entries[entry.idempotencyKey]) {
        var conflict = new Error("Réservation concurrente.");
        conflict.code = "INSCRIPTIONS_IDEMPOTENCY_CONFLICT";
        throw conflict;
      }
      entries[entry.idempotencyKey] = JSON.parse(JSON.stringify(entry));
      return this.load(entry.idempotencyKey);
    },
    save: function (entry, expectedVersion) {
      var current = entries[entry.idempotencyKey];
      if (!current || current.version !== expectedVersion) {
        var conflict = new Error("Version concurrente.");
        conflict.code = "INSCRIPTIONS_JOURNAL_VERSION_CONFLICT";
        throw conflict;
      }
      entries[entry.idempotencyKey] = JSON.parse(JSON.stringify(entry));
      return this.load(entry.idempotencyKey);
    },
    snapshot: function (key) { return this.load(key); }
  };
}

function AKS_inscriptions009Fixture_(overrides) {
  overrides = overrides || {};
  var events = [];
  var commits = 0;
  var applied = !!overrides.applied;
  var authorizations = 0;
  var journal = overrides.journal || AKS_inscriptions009MemoryJournal_();
  var access = overrides.access || {
    assertInscriptionsCapability: function () {
      authorizations += 1;
      if (overrides.deny) {
        var denied = new Error("Refusé."); denied.code = "ACCESS_CAPABILITY_DENIED"; throw denied;
      }
      return true;
    },
    getCurrentIdentity: function () { return overrides.actor || "operator@example.com"; }
  };
  var repository = overrides.repository || {
    reconcile: function () { return overrides.reconcile || (applied ? "APPLIED" : "ABSENT"); },
    prepare: function (command) { return command; },
    commit: function () {
      commits += 1;
      if (overrides.commitFailure) {
        if (overrides.applyBeforeFailure) applied = true;
        var failure = new Error("Commit interrompu.");
        failure.code = overrides.commitFailure;
        throw failure;
      }
      applied = true;
    },
    readBack: function (prepared) { return { commandId: prepared.commandId, applied: applied }; },
    verify: function () { return overrides.verify !== false; }
  };
  var audit = overrides.audit || { record: function (event) {
    events.push(event);
    if (overrides.failAuditResult === event.result) return false;
    return true;
  }};
  var service = AKS.Inscriptions.createCommandJournalService({
    access: access,
    journal: journal,
    repository: repository,
    audit: audit,
    clock: function () { return new Date("2026-09-01T10:15:00Z"); }
  });
  return {
    service: service,
    journal: journal,
    events: events,
    commits: function () { return commits; },
    authorizations: function () { return authorizations; },
    isApplied: function () { return applied; }
  };
}

function AKS_inscriptions009Command_(overrides) {
  var command = {
    capability: "INSCRIPTIONS_WRITE",
    action: "DOSSIER_UPDATE",
    target: { type: "DOSSIER", id: "INS-2026-000001" },
    scope: { module: "INSCRIPTIONS", season: "2026-2027", section: "KARATE", courseCode: "" },
    payloadFingerprint: "fp-001",
    idempotencyKey: "cmd-001",
    correlationId: "corr-001",
    payload: { privateValue: "NON_JOURNALISEE" }
  };
  Object.keys(overrides || {}).forEach(function (key) { command[key] = overrides[key]; });
  return command;
}

function AKS_testInscriptions009_minimizesVersionedRecord_() {
  var fixture = AKS_inscriptions009Fixture_();
  fixture.service.execute(AKS_inscriptions009Command_());
  var record = fixture.journal.snapshot("cmd-001");
  assertEquals_("inscriptions-command/1.0", record.schemaVersion);
  assertEquals_("CONFIRMEE", record.status);
  assertEquals_(1, record.attemptCount);
  assertEquals_(3, record.version);
  assertTrue_(JSON.stringify(record).indexOf("NON_JOURNALISEE") === -1);
  assertTrue_(!Object.prototype.hasOwnProperty.call(record, "failureCode"));
  assertEquals_(JSON.stringify(["id", "type"]), JSON.stringify(Object.keys(record.target).sort()));
}

function AKS_testInscriptions009_runsNominalCycleOnce_() {
  var fixture = AKS_inscriptions009Fixture_();
  var result = fixture.service.execute(AKS_inscriptions009Command_());
  assertEquals_("CONFIRMEE", result.status);
  assertEquals_(1, fixture.commits());
  assertEquals_(JSON.stringify(["INTENTION", "REUSSI"]),
    JSON.stringify(fixture.events.map(function (event) { return event.result; })));
}

function AKS_testInscriptions009_replaysConfirmedWithoutCommit_() {
  var fixture = AKS_inscriptions009Fixture_();
  fixture.service.execute(AKS_inscriptions009Command_());
  var replay = fixture.service.execute(AKS_inscriptions009Command_({ correlationId: "ignored-replay" }));
  assertEquals_("corr-001", replay.correlationId);
  assertEquals_(1, fixture.commits());
  assertEquals_(2, fixture.authorizations());
}

function AKS_testInscriptions009_rejectsEveryIdentityConflict_() {
  var changes = [
    { action: "DOSSIER_CREATE" },
    { target: { type: "DOSSIER", id: "INS-2026-999999" } },
    { scope: { module: "INSCRIPTIONS", season: "2026-2027", section: "BODY_KARATE", courseCode: "" } },
    { payloadFingerprint: "fp-different" }
  ];
  changes.forEach(function (change) {
    var fixture = AKS_inscriptions009Fixture_();
    fixture.service.execute(AKS_inscriptions009Command_());
    assertThrows_(function () {
      fixture.service.execute(AKS_inscriptions009Command_(change));
    }, "INSCRIPTIONS_IDEMPOTENCY_CONFLICT");
    assertEquals_(1, fixture.commits());
  });
}

function AKS_testInscriptions009_deniesBeforeJournalRead_() {
  var reads = 0;
  var journal = AKS_inscriptions009MemoryJournal_();
  var originalLoad = journal.load;
  journal.load = function (key) { reads += 1; return originalLoad.call(journal, key); };
  var fixture = AKS_inscriptions009Fixture_({ deny: true, journal: journal });
  assertThrows_(function () { fixture.service.execute(AKS_inscriptions009Command_()); },
    "ACCESS_CAPABILITY_DENIED");
  assertEquals_(0, reads);
}

function AKS_testInscriptions009_authorizesBeforeDetailedValidation_() {
  var fixture = AKS_inscriptions009Fixture_({ deny: true });
  assertThrows_(function () {
    fixture.service.execute(AKS_inscriptions009Command_({ idempotencyKey: "" }));
  }, "ACCESS_CAPABILITY_DENIED");
}

function AKS_testInscriptions009_resumesIntentionAfterReconstruction_() {
  var journal = AKS_inscriptions009MemoryJournal_();
  var first = AKS_inscriptions009Fixture_({ journal: journal, failAuditResult: "INTENTION" });
  assertThrows_(function () { first.service.execute(AKS_inscriptions009Command_()); },
    "INSCRIPTIONS_AUDIT_REQUIRED");
  assertEquals_("INTENTION", journal.snapshot("cmd-001").status);
  var second = AKS_inscriptions009Fixture_({ journal: journal });
  assertEquals_("CONFIRMEE", second.service.execute(AKS_inscriptions009Command_()).status);
  assertEquals_(1, second.commits());
}

function AKS_testInscriptions009_reconcilesAppliedBeforeRetry_() {
  var journal = AKS_inscriptions009MemoryJournal_();
  var first = AKS_inscriptions009Fixture_({
    journal: journal, commitFailure: "INTERRUPTED_AFTER_COMMIT", applyBeforeFailure: true
  });
  assertThrows_(function () { first.service.execute(AKS_inscriptions009Command_()); },
    "INTERRUPTED_AFTER_COMMIT");
  assertEquals_("ECHEC_RECUPERABLE", journal.snapshot("cmd-001").status);
  var second = AKS_inscriptions009Fixture_({ journal: journal, applied: true });
  var result = second.service.execute(AKS_inscriptions009Command_());
  assertEquals_("CONFIRMEE", result.status);
  assertEquals_(0, second.commits());
  assertEquals_(1, result.attemptCount);
}

function AKS_testInscriptions009_retriesAbsentAfterReconstruction_() {
  var journal = AKS_inscriptions009MemoryJournal_();
  var first = AKS_inscriptions009Fixture_({ journal: journal, commitFailure: "TEMPORARY_FAILURE" });
  assertThrows_(function () { first.service.execute(AKS_inscriptions009Command_()); },
    "TEMPORARY_FAILURE");
  var second = AKS_inscriptions009Fixture_({ journal: journal, reconcile: "ABSENT" });
  var result = second.service.execute(AKS_inscriptions009Command_());
  assertEquals_("CONFIRMEE", result.status);
  assertEquals_(1, second.commits());
  assertEquals_(2, result.attemptCount);
}

function AKS_testInscriptions009_rejectsAmbiguousReconciliation_() {
  var journal = AKS_inscriptions009MemoryJournal_();
  var first = AKS_inscriptions009Fixture_({ journal: journal, commitFailure: "TEMPORARY_FAILURE" });
  assertThrows_(function () { first.service.execute(AKS_inscriptions009Command_()); },
    "TEMPORARY_FAILURE");
  var second = AKS_inscriptions009Fixture_({ journal: journal, reconcile: "AMBIGUOUS" });
  assertThrows_(function () { second.service.execute(AKS_inscriptions009Command_()); },
    "INSCRIPTIONS_RECONCILIATION_AMBIGUOUS");
  assertEquals_(0, second.commits());
  assertEquals_("ECHEC", second.events[0].result);
  assertEquals_("corr-001", second.events[0].correlationId);
}

function AKS_testInscriptions009_stopsAfterThirdMutationFailure_() {
  var journal = AKS_inscriptions009MemoryJournal_();
  for (var attempt = 1; attempt <= 3; attempt += 1) {
    var fixture = AKS_inscriptions009Fixture_({
      journal: journal, reconcile: "ABSENT", commitFailure: "TEMPORARY_FAILURE"
    });
    assertThrows_(function () { fixture.service.execute(AKS_inscriptions009Command_()); },
      "TEMPORARY_FAILURE");
  }
  var record = journal.snapshot("cmd-001");
  assertEquals_(3, record.attemptCount);
  assertEquals_("ECHEC_FINAL", record.status);
  var blocked = AKS_inscriptions009Fixture_({ journal: journal });
  assertThrows_(function () { blocked.service.execute(AKS_inscriptions009Command_()); },
    "INSCRIPTIONS_COMMAND_FINAL");
  assertEquals_(0, blocked.commits());
}

function AKS_testInscriptions009_doesNotConfirmFailedControlOrAudit_() {
  var control = AKS_inscriptions009Fixture_({ verify: false });
  assertThrows_(function () { control.service.execute(AKS_inscriptions009Command_()); },
    "INSCRIPTIONS_CONTROL_FAILED");
  assertEquals_("ECHEC_RECUPERABLE", control.journal.snapshot("cmd-001").status);
  var audit = AKS_inscriptions009Fixture_({ failAuditResult: "REUSSI" });
  assertThrows_(function () { audit.service.execute(AKS_inscriptions009Command_()); },
    "INSCRIPTIONS_AUDIT_REQUIRED");
  assertEquals_("ECHEC_RECUPERABLE", audit.journal.snapshot("cmd-001").status);
}

function AKS_testInscriptions009_preservesCorrelationEverywhere_() {
  var fixture = AKS_inscriptions009Fixture_();
  var result = fixture.service.execute(AKS_inscriptions009Command_());
  var record = fixture.journal.snapshot("cmd-001");
  assertEquals_("corr-001", result.correlationId);
  assertEquals_("corr-001", record.correlationId);
  fixture.events.forEach(function (event) { assertEquals_("corr-001", event.correlationId); });
}

function AKS_testInscriptions009_rejectsOptimisticConflict_() {
  var journal = AKS_inscriptions009MemoryJournal_();
  var originalSave = journal.save;
  journal.save = function (entry, expectedVersion) {
    return originalSave.call(journal, entry, expectedVersion - 1);
  };
  var fixture = AKS_inscriptions009Fixture_({ journal: journal });
  assertThrows_(function () { fixture.service.execute(AKS_inscriptions009Command_()); },
    "INSCRIPTIONS_JOURNAL_VERSION_CONFLICT");
  assertEquals_(0, fixture.commits());
}

function AKS_testInscriptions009_containsNoGoogleApi_() {
  var source = String(AKS.Inscriptions.createCommandJournalService);
  [
    "SpreadsheetApp", "DriveApp", "FormApp", "PropertiesService", "LockService",
    "Session.getActiveUser", "UrlFetchApp"
  ].forEach(function (name) {
    assertTrue_(source.indexOf(name) === -1, name + " ne doit pas être utilisé.");
  });
}

function AKS_runInscriptions009Suite() {
  return AKS_runNamedTestSuite_("INSCRIPTIONS-009 — journal et reprise", [
    { name: "enregistrement versionné minimisé", test: AKS_testInscriptions009_minimizesVersionedRecord_ },
    { name: "cycle nominal unique", test: AKS_testInscriptions009_runsNominalCycleOnce_ },
    { name: "rejeu confirmé sans commit", test: AKS_testInscriptions009_replaysConfirmedWithoutCommit_ },
    { name: "identité idempotente complète", test: AKS_testInscriptions009_rejectsEveryIdentityConflict_ },
    { name: "refus avant lecture du journal", test: AKS_testInscriptions009_deniesBeforeJournalRead_ },
    { name: "autorisation avant validation détaillée", test: AKS_testInscriptions009_authorizesBeforeDetailedValidation_ },
    { name: "reprise INTENTION reconstruite", test: AKS_testInscriptions009_resumesIntentionAfterReconstruction_ },
    { name: "réconciliation appliquée sans rejeu", test: AKS_testInscriptions009_reconcilesAppliedBeforeRetry_ },
    { name: "reprise absente après reconstruction", test: AKS_testInscriptions009_retriesAbsentAfterReconstruction_ },
    { name: "réconciliation ambiguë refusée", test: AKS_testInscriptions009_rejectsAmbiguousReconciliation_ },
    { name: "échec final à trois tentatives", test: AKS_testInscriptions009_stopsAfterThirdMutationFailure_ },
    { name: "contrôle et audit final obligatoires", test: AKS_testInscriptions009_doesNotConfirmFailedControlOrAudit_ },
    { name: "corrélation de bout en bout", test: AKS_testInscriptions009_preservesCorrelationEverywhere_ },
    { name: "conflit de version optimiste", test: AKS_testInscriptions009_rejectsOptimisticConflict_ },
    { name: "aucune API Google", test: AKS_testInscriptions009_containsNoGoogleApi_ }
  ]);
}
