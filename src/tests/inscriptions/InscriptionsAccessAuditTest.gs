function AKS_inscriptions008Scope_(overrides) {
  var scope = {
    module: "INSCRIPTIONS",
    season: "2026-2027",
    section: "KARATE",
    courseCode: ""
  };
  Object.keys(overrides || {}).forEach(function (key) { scope[key] = overrides[key]; });
  return scope;
}

function AKS_inscriptions008Registry_(assignments) {
  return {
    schemaVersion: "access/1.0",
    accounts: [{
      email: "operator@example.com",
      status: "ACTIVE",
      roles: ["PROFESSEUR"],
      assignments: assignments || []
    }, {
      email: "admin@example.com",
      status: "ACTIVE",
      roles: ["ADMINISTRATEUR"],
      assignments: []
    }]
  };
}

function AKS_inscriptions008Assignment_(capabilities, overrides) {
  var assignment = {
    module: "INSCRIPTIONS",
    season: "2026-2027",
    section: "KARATE",
    courseCode: "",
    status: "ACTIVE",
    roles: ["PROFESSEUR"],
    extraCapabilities: capabilities
  };
  Object.keys(overrides || {}).forEach(function (key) { assignment[key] = overrides[key]; });
  return assignment;
}

function AKS_inscriptions008Access_(overrides) {
  overrides = overrides || {};
  return AKS_createAccessService_({
    identityProvider: function () { return overrides.identity || "operator@example.com"; },
    registryStore: { load: function () {
      return overrides.registry || AKS_inscriptions008Registry_([]);
    }},
    courseProvider: { list: function () {
      return [{ code: "BABY", season: "2026-2027", active: true }];
    }},
    inscriptionsCatalogueProvider: { list: function () {
      return overrides.catalogue || [{
        season: "2026-2027",
        section: "KARATE",
        courseCodes: ["BABY", "ENFANT1"],
        active: true
      }];
    }},
    legacyAdminEmails: [],
    clock: function () { return new Date("2026-09-01T10:00:00Z"); }
  });
}

function AKS_inscriptions008ServiceFixture_(overrides) {
  overrides = overrides || {};
  var events = [];
  var order = [];
  var reads = [];
  var confirmations = 0;
  var access = overrides.access || AKS_inscriptions008Access_({
    registry: AKS_inscriptions008Registry_([
      AKS_inscriptions008Assignment_([
        "INSCRIPTIONS_READ", "INSCRIPTIONS_WRITE", "INSCRIPTIONS_CONTROL"
      ])
    ])
  });
  var repository = {
    read: function (scope) { reads.push(scope); return { count: 2 }; },
    prepare: function (command) { order.push("prepare"); return command; },
    discard: function () { order.push("discard"); },
    commit: function () { order.push("commit"); },
    readBack: function () { order.push("control"); return { version: 2 }; },
    verify: function () { return overrides.verify !== false; },
    confirm: function () { order.push("confirm"); confirmations += 1; }
  };
  var audit = { record: function (event) {
    order.push("audit:" + event.result);
    events.push(event);
    if (overrides.failAuditResult === event.result) return false;
    return true;
  }};
  var service = AKS.Inscriptions.createAccessAuditService({
    access: access,
    repository: repository,
    audit: audit,
    clock: function () { return new Date("2026-09-01T10:15:00Z"); }
  });
  return {
    service: service,
    events: events,
    order: order,
    reads: reads,
    confirmations: function () { return confirmations; }
  };
}

function AKS_inscriptions008Command_(overrides) {
  var command = {
    capability: "INSCRIPTIONS_WRITE",
    action: "DOSSIER_UPDATE",
    idempotencyKey: "cmd-001",
    correlationId: "corr-001",
    scope: AKS_inscriptions008Scope_(),
    payload: { dossierId: "INS-2026-000001", privateValue: "NON_AUDITEE" }
  };
  Object.keys(overrides || {}).forEach(function (key) { command[key] = overrides[key]; });
  return command;
}

function AKS_testInscriptions008_exposesExactCapabilityCatalogue_() {
  var capabilities = AKS_inscriptions008Access_().getCapabilityCatalogue()
    .filter(function (capability) { return capability.indexOf("INSCRIPTIONS_") === 0; })
    .sort();
  assertEquals_(JSON.stringify([
    "INSCRIPTIONS_ACTIVATE", "INSCRIPTIONS_ANALYZE_IMPORT",
    "INSCRIPTIONS_APPLY_IMPORT", "INSCRIPTIONS_CONTROL",
    "INSCRIPTIONS_READ", "INSCRIPTIONS_WRITE"
  ]), JSON.stringify(capabilities));
}

function AKS_testInscriptions008_preservesAttendanceAssignments_() {
  var registry = AKS_inscriptions008Registry_([{
    courseCode: "BABY", season: "2026-2027", status: "ACTIVE",
    roles: ["PROFESSEUR"]
  }]);
  var access = AKS_inscriptions008Access_({ registry: registry });
  assertTrue_(access.hasCapability("ATTENDANCE_READ", "BABY", "2026-2027"));
}

function AKS_testInscriptions008_grantsNoImplicitRoleCapability_() {
  var access = AKS_inscriptions008Access_();
  assertThrows_(function () {
    access.assertInscriptionsCapability("INSCRIPTIONS_READ", AKS_inscriptions008Scope_());
  }, "ACCESS_CAPABILITY_DENIED");
}

function AKS_testInscriptions008_separatesExplicitCapabilities_() {
  var access = AKS_inscriptions008Access_({
    registry: AKS_inscriptions008Registry_([
      AKS_inscriptions008Assignment_(["INSCRIPTIONS_ANALYZE_IMPORT"])
    ])
  });
  assertTrue_(access.assertInscriptionsCapability(
    "INSCRIPTIONS_ANALYZE_IMPORT", AKS_inscriptions008Scope_()));
  assertThrows_(function () {
    access.assertInscriptionsCapability("INSCRIPTIONS_APPLY_IMPORT", AKS_inscriptions008Scope_());
  }, "ACCESS_CAPABILITY_DENIED");
}

function AKS_testInscriptions008_requiresAssignmentRoleOnAccount_() {
  var registry = AKS_inscriptions008Registry_([
    AKS_inscriptions008Assignment_(["INSCRIPTIONS_READ"])
  ]);
  registry.accounts[0].roles = ["CONSULTATION"];
  var access = AKS_inscriptions008Access_({ registry: registry });
  assertThrows_(function () {
    access.assertInscriptionsCapability("INSCRIPTIONS_READ", AKS_inscriptions008Scope_());
  }, "ACCESS_CAPABILITY_DENIED");
}

function AKS_testInscriptions008_authorizesSixCapabilitiesWithTheirScopes_() {
  var access = AKS_inscriptions008Access_({
    registry: AKS_inscriptions008Registry_([
      AKS_inscriptions008Assignment_([
        "INSCRIPTIONS_READ", "INSCRIPTIONS_ANALYZE_IMPORT",
        "INSCRIPTIONS_CONTROL", "INSCRIPTIONS_WRITE",
        "INSCRIPTIONS_APPLY_IMPORT"
      ]),
      AKS_inscriptions008Assignment_(["INSCRIPTIONS_ACTIVATE"], {
        courseCode: "BABY"
      })
    ])
  });
  [
    ["INSCRIPTIONS_READ", AKS_inscriptions008Scope_()],
    ["INSCRIPTIONS_ANALYZE_IMPORT", AKS_inscriptions008Scope_()],
    ["INSCRIPTIONS_CONTROL", AKS_inscriptions008Scope_({ courseCode: "BABY" })],
    ["INSCRIPTIONS_WRITE", AKS_inscriptions008Scope_()],
    ["INSCRIPTIONS_APPLY_IMPORT", AKS_inscriptions008Scope_()],
    ["INSCRIPTIONS_ACTIVATE", AKS_inscriptions008Scope_({ courseCode: "BABY" })]
  ].forEach(function (testCase) {
    assertTrue_(access.assertInscriptionsCapability(testCase[0], testCase[1]));
  });
}

function AKS_testInscriptions008_validatesClosedScopeMatrix_() {
  var access = AKS_inscriptions008Access_({ identity: "admin@example.com" });
  [
    ["INSCRIPTIONS_READ", AKS_inscriptions008Scope_({ module: "ANALYTICS" })],
    ["INSCRIPTIONS_READ", AKS_inscriptions008Scope_({ season: "*" })],
    ["INSCRIPTIONS_READ", AKS_inscriptions008Scope_({ section: "INCONNUE" })],
    ["INSCRIPTIONS_ANALYZE_IMPORT", AKS_inscriptions008Scope_({ courseCode: "BABY" })],
    ["INSCRIPTIONS_ACTIVATE", AKS_inscriptions008Scope_()],
    ["INSCRIPTIONS_ACTIVATE", AKS_inscriptions008Scope_({ courseCode: "FAUX" })]
  ].forEach(function (testCase) {
    assertThrows_(function () {
      access.assertInscriptionsCapability(testCase[0], testCase[1]);
    }, "ACCESS_SCOPE_INVALID");
  });
}

function AKS_testInscriptions008_honorsSeasonSectionAndCourse_() {
  var access = AKS_inscriptions008Access_({
    registry: AKS_inscriptions008Registry_([
      AKS_inscriptions008Assignment_(["INSCRIPTIONS_READ"], {
        season: "*", courseCode: "BABY"
      })
    ])
  });
  assertTrue_(access.assertInscriptionsCapability(
    "INSCRIPTIONS_READ", AKS_inscriptions008Scope_({ courseCode: "BABY" })));
  assertThrows_(function () {
    access.assertInscriptionsCapability(
      "INSCRIPTIONS_READ", AKS_inscriptions008Scope_({ courseCode: "ENFANT1" }));
  }, "ACCESS_CAPABILITY_DENIED");
  assertThrows_(function () {
    access.assertInscriptionsCapability("INSCRIPTIONS_READ", AKS_inscriptions008Scope_());
  }, "ACCESS_CAPABILITY_DENIED");
}

function AKS_testInscriptions008_rejectsExpiredAndAmbiguousScopes_() {
  var expired = AKS_inscriptions008Access_({
    registry: AKS_inscriptions008Registry_([
      AKS_inscriptions008Assignment_(["INSCRIPTIONS_READ"], {
        validUntil: "2026-08-31"
      })
    ])
  });
  assertThrows_(function () {
    expired.assertInscriptionsCapability("INSCRIPTIONS_READ", AKS_inscriptions008Scope_());
  }, "ACCESS_CAPABILITY_DENIED");

  var duplicated = {
    season: "2026-2027", section: "KARATE", courseCodes: ["BABY"], active: true
  };
  var ambiguous = AKS_inscriptions008Access_({
    identity: "admin@example.com",
    catalogue: [duplicated, duplicated]
  });
  assertThrows_(function () {
    ambiguous.assertInscriptionsCapability("INSCRIPTIONS_READ", AKS_inscriptions008Scope_());
  }, "ACCESS_SCOPE_INVALID");
}

function AKS_testInscriptions008_deniesBeforeRepositoryRead_() {
  var fixture = AKS_inscriptions008ServiceFixture_({ access: AKS_inscriptions008Access_() });
  assertThrows_(function () {
    fixture.service.read({}, AKS_inscriptions008Scope_());
  }, "ACCESS_CAPABILITY_DENIED");
  assertEquals_(0, fixture.reads.length);
}

function AKS_testInscriptions008_readsTrustedScopeOnly_() {
  var fixture = AKS_inscriptions008ServiceFixture_();
  var result = fixture.service.read({
    scope: AKS_inscriptions008Scope_({ section: "FAUSSE" })
  }, AKS_inscriptions008Scope_());
  assertEquals_(2, result.count);
  assertEquals_(1, fixture.reads.length);
  assertEquals_("KARATE", fixture.reads[0].section);
}

function AKS_testInscriptions008_requiresIntentionBeforeCommit_() {
  var fixture = AKS_inscriptions008ServiceFixture_({ failAuditResult: "INTENTION" });
  assertThrows_(function () {
    fixture.service.execute(AKS_inscriptions008Command_());
  }, "INSCRIPTIONS_AUDIT_REQUIRED");
  assertEquals_(JSON.stringify(["prepare", "audit:INTENTION", "discard"]),
    JSON.stringify(fixture.order));
  assertEquals_(0, fixture.confirmations());
}

function AKS_testInscriptions008_requiresCourseForAssignmentWrite_() {
  var fixture = AKS_inscriptions008ServiceFixture_();
  assertThrows_(function () {
    fixture.service.execute(AKS_inscriptions008Command_({
      targetType: "COURSE_ASSIGNMENT"
    }));
  }, "INSCRIPTIONS_COMMAND_INVALID");
  assertEquals_(0, fixture.order.length);
}

function AKS_testInscriptions008_ordersSuccessfulCommand_() {
  var fixture = AKS_inscriptions008ServiceFixture_();
  var result = fixture.service.execute(AKS_inscriptions008Command_());
  assertEquals_("CONFIRMEE", result.status);
  assertEquals_(JSON.stringify([
    "prepare", "audit:INTENTION", "commit", "control", "audit:REUSSI", "confirm"
  ]), JSON.stringify(fixture.order));
  assertEquals_(1, fixture.confirmations());
}

function AKS_testInscriptions008_doesNotConfirmWithoutFinalAudit_() {
  var fixture = AKS_inscriptions008ServiceFixture_({ failAuditResult: "REUSSI" });
  assertThrows_(function () {
    fixture.service.execute(AKS_inscriptions008Command_());
  }, "INSCRIPTIONS_AUDIT_REQUIRED");
  assertEquals_(0, fixture.confirmations());
  assertEquals_("ECHEC", fixture.events[fixture.events.length - 1].result);
}

function AKS_testInscriptions008_recordsRecoverableControlFailure_() {
  var fixture = AKS_inscriptions008ServiceFixture_({ verify: false });
  assertThrows_(function () {
    fixture.service.execute(AKS_inscriptions008Command_());
  }, "INSCRIPTIONS_CONTROL_FAILED");
  assertEquals_(0, fixture.confirmations());
  assertEquals_("ECHEC", fixture.events[1].result);
  assertEquals_("INSCRIPTIONS_CONTROL_FAILED", fixture.events[1].reason);
}

function AKS_testInscriptions008_minimizesAuditEvents_() {
  var fixture = AKS_inscriptions008ServiceFixture_();
  fixture.service.execute(AKS_inscriptions008Command_());
  var serialized = JSON.stringify(fixture.events);
  assertTrue_(serialized.indexOf("NON_AUDITEE") === -1);
  assertTrue_(serialized.indexOf("dossierId") === -1);
  assertEquals_(JSON.stringify([
    "action", "actor", "correlationId", "date", "result", "target"
  ]), JSON.stringify(Object.keys(fixture.events[0]).sort()));
}

function AKS_testInscriptions008_containsNoGoogleApi_() {
  var source = String(AKS.Inscriptions.createAccessAuditService);
  [
    "SpreadsheetApp", "DriveApp", "FormApp", "PropertiesService",
    "LockService", "Session.getActiveUser", "UrlFetchApp"
  ].forEach(function (name) {
    assertTrue_(source.indexOf(name) === -1, name + " ne doit pas être utilisé.");
  });
}

function AKS_testInscriptions008_promotesGold011AfterProof_() {
  var dataset = AKS.Tests.InscriptionsGoldDatasets.filter(function (candidate) {
    return candidate.id === "INS-GOLD-011";
  })[0];
  assertEquals_("REUSSI", dataset.expected.status);
  assertEquals_("REUSSI", AKS.Inscriptions.ReadOnlyEngine.execute(dataset).status);
}

function AKS_runInscriptions008Suite() {
  return AKS_runNamedTestSuite_("INSCRIPTIONS-008 — accès et audit", [
    { name: "catalogue exact", test: AKS_testInscriptions008_exposesExactCapabilityCatalogue_ },
    { name: "compatibilité Présences", test: AKS_testInscriptions008_preservesAttendanceAssignments_ },
    { name: "aucun octroi implicite", test: AKS_testInscriptions008_grantsNoImplicitRoleCapability_ },
    { name: "capacités séparées", test: AKS_testInscriptions008_separatesExplicitCapabilities_ },
    { name: "rôle d'affectation porté par le compte", test: AKS_testInscriptions008_requiresAssignmentRoleOnAccount_ },
    { name: "six capacités et leurs portées", test: AKS_testInscriptions008_authorizesSixCapabilitiesWithTheirScopes_ },
    { name: "matrice de portée fermée", test: AKS_testInscriptions008_validatesClosedScopeMatrix_ },
    { name: "limites saison section cours", test: AKS_testInscriptions008_honorsSeasonSectionAndCourse_ },
    { name: "périmètres expiré et ambigu", test: AKS_testInscriptions008_rejectsExpiredAndAmbiguousScopes_ },
    { name: "refus avant lecture", test: AKS_testInscriptions008_deniesBeforeRepositoryRead_ },
    { name: "périmètre serveur", test: AKS_testInscriptions008_readsTrustedScopeOnly_ },
    { name: "intention avant commit", test: AKS_testInscriptions008_requiresIntentionBeforeCommit_ },
    { name: "cours obligatoire pour affectation", test: AKS_testInscriptions008_requiresCourseForAssignmentWrite_ },
    { name: "cycle réussi ordonné", test: AKS_testInscriptions008_ordersSuccessfulCommand_ },
    { name: "audit final obligatoire", test: AKS_testInscriptions008_doesNotConfirmWithoutFinalAudit_ },
    { name: "échec de contrôle récupérable", test: AKS_testInscriptions008_recordsRecoverableControlFailure_ },
    { name: "audit minimisé", test: AKS_testInscriptions008_minimizesAuditEvents_ },
    { name: "aucune API Google", test: AKS_testInscriptions008_containsNoGoogleApi_ },
    { name: "INS-GOLD-011 réussi", test: AKS_testInscriptions008_promotesGold011AfterProof_ }
  ]);
}
