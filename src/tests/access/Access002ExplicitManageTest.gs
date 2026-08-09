function AKS_access002ExplicitManagerRegistry_(assignmentOverrides) {
  var assignment = {
    module: "ACCESS",
    season: "*",
    section: "",
    courseCode: "",
    status: "ACTIVE",
    roles: ["CONSULTATION"],
    extraCapabilities: ["ACCESS_MANAGE"]
  };
  Object.keys(assignmentOverrides || {}).forEach(function (key) {
    assignment[key] = assignmentOverrides[key];
  });
  return {
    schemaVersion: "access/1.0",
    accounts: [{
      email: "manager@example.com",
      status: "ACTIVE",
      roles: ["CONSULTATION"],
      assignments: [assignment]
    }]
  };
}

function AKS_access002ExplicitManagerService_(assignmentOverrides) {
  var registry = AKS_access002ExplicitManagerRegistry_(assignmentOverrides);
  return AKS_createAccessService_({
    identityProvider: function () { return "manager@example.com"; },
    registryStore: { load: function () { return registry; } },
    courseProvider: { list: function () { return []; } },
    legacyAdminEmails: [],
    clock: function () { return new Date("2026-09-01T10:00:00Z"); }
  });
}

function AKS_testAccess002ExplicitManage_authorizesTransverseAssignment_() {
  var access = AKS_access002ExplicitManagerService_({
    module: " access ",
    extraCapabilities: [" access_manage "]
  });
  assertTrue_(access.assertAdministrativeCapability("ACCESS_MANAGE"));
  var view = access.readRegistryForAdministration();
  assertEquals_("ACCESS", view.accounts[0].assignments[0].module);
  assertEquals_("ACCESS_MANAGE",
    view.accounts[0].assignments[0].extraCapabilities[0]);
}

function AKS_testAccess002ExplicitManage_rejectsRoleWithoutAssignment_() {
  var registry = AKS_access002ExplicitManagerRegistry_();
  registry.accounts[0].assignments = [];
  var access = AKS_createAccessService_({
    identityProvider: function () { return "manager@example.com"; },
    registryStore: { load: function () { return registry; } },
    courseProvider: { list: function () { return []; } },
    legacyAdminEmails: [],
    clock: function () { return new Date("2026-09-01T10:00:00Z"); }
  });
  assertThrows_(function () {
    access.assertAdministrativeCapability("ACCESS_MANAGE");
  }, "ACCESS_CAPABILITY_DENIED");
}

function AKS_testAccess002ExplicitManage_rejectsInactiveOrOutOfPeriodAssignment_() {
  [{ status: "INACTIVE" }, { validFrom: "2026-09-02" },
    { validUntil: "2026-08-31" }].forEach(function (overrides) {
    var access = AKS_access002ExplicitManagerService_(overrides);
    assertThrows_(function () {
      access.assertAdministrativeCapability("ACCESS_MANAGE");
    }, "ACCESS_CAPABILITY_DENIED");
  });
}

function AKS_testAccess002ExplicitManage_rejectsInvalidTransverseShape_() {
  [{ season: "2026-2027" }, { section: "BABY" }, { courseCode: "BABY" },
    { extraCapabilities: [] }, { extraCapabilities: ["ANALYTICS_READ"] },
    { extraCapabilities: ["ACCESS_MANAGE", "ACCESS_MANAGE"] }]
    .forEach(function (overrides) {
      var access = AKS_access002ExplicitManagerService_(overrides);
      assertThrows_(function () {
        access.assertAdministrativeCapability("ACCESS_MANAGE");
      }, "ACCESS_REGISTRY_INVALID");
    });
}

function AKS_testAccess002ExplicitManage_rejectsRoleNotHeldByAccount_() {
  var fixture = AKS_access002AdminFixture_();
  var before = fixture.service.readRegistry();
  var proposed = {
    schemaVersion: before.schemaVersion,
    accounts: JSON.parse(JSON.stringify(before.accounts))
  };
  proposed.accounts[1].assignments = [{
    module: "ACCESS",
    season: "*",
    status: "ACTIVE",
    roles: ["ADMINISTRATEUR"],
    extraCapabilities: ["ACCESS_MANAGE"]
  }];
  assertThrows_(function () {
    fixture.service.updateRegistry({
      expectedRevision: before.revision,
      registry: proposed
    });
  }, "ACCESS_REGISTRY_INVALID");
  assertEquals_(0, fixture.writes());
  assertEquals_(0, fixture.lockAttempts());
}

function AKS_testAccess002ExplicitManage_preservesLastExplicitManager_() {
  var registry = AKS_access002ExplicitManagerRegistry_();
  var fixture = AKS_access002AdminFixture_({
    registry: registry,
    identity: "manager@example.com"
  });
  var before = fixture.service.readRegistry();
  var proposed = {
    schemaVersion: before.schemaVersion,
    accounts: JSON.parse(JSON.stringify(before.accounts))
  };
  proposed.accounts[0].status = "INACTIVE";
  assertThrows_(function () {
    fixture.service.updateRegistry({
      expectedRevision: before.revision,
      registry: proposed
    });
  }, "ACCESS_LAST_MANAGER_REQUIRED");
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002ExplicitManage_migratesHistoricalManager_() {
  var fixture = AKS_access002AdminFixture_();
  var before = fixture.service.readRegistry();
  var proposed = {
    schemaVersion: before.schemaVersion,
    accounts: JSON.parse(JSON.stringify(before.accounts))
  };
  proposed.accounts[0].roles = ["CONSULTATION"];
  proposed.accounts[0].assignments = [{
    module: "ACCESS",
    season: "*",
    status: "ACTIVE",
    roles: ["CONSULTATION"],
    extraCapabilities: ["ACCESS_MANAGE"]
  }];
  var result = fixture.service.updateRegistry({
    expectedRevision: before.revision,
    registry: proposed
  });
  assertEquals_(1, fixture.writes());
  assertEquals_("CONSULTATION", result.accounts[0].roles[0]);
  assertEquals_("ACCESS", result.accounts[0].assignments[0].module);
  assertEquals_(2, fixture.service.readRegistry().accounts.length);
}

function AKS_runAccess002ExplicitManageSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-02 — habilitation explicite", [
    { name: "affectation transverse autorisée",
      test: AKS_testAccess002ExplicitManage_authorizesTransverseAssignment_ },
    { name: "rôle seul refusé",
      test: AKS_testAccess002ExplicitManage_rejectsRoleWithoutAssignment_ },
    { name: "affectation inactive ou hors période refusée",
      test: AKS_testAccess002ExplicitManage_rejectsInactiveOrOutOfPeriodAssignment_ },
    { name: "forme transverse invalide refusée",
      test: AKS_testAccess002ExplicitManage_rejectsInvalidTransverseShape_ },
    { name: "rôle d'affectation non détenu refusé",
      test: AKS_testAccess002ExplicitManage_rejectsRoleNotHeldByAccount_ },
    { name: "dernier gestionnaire explicite préservé",
      test: AKS_testAccess002ExplicitManage_preservesLastExplicitManager_ },
    { name: "gestionnaire historique migré vers habilitation explicite",
      test: AKS_testAccess002ExplicitManage_migratesHistoricalManager_ }
  ]);
}
