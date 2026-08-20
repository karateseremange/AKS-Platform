function AKS_access002Schema12AdministrationAssignment_(capabilities) {
  return {
    module: "ADMINISTRATION", season: "*", section: "", courseCode: "",
    status: "ACTIVE", roles: ["ADMINISTRATEUR"],
    extraCapabilities: capabilities.slice(), validFrom: "", validUntil: ""
  };
}

function AKS_access002Schema12Registry_(schemaVersion, assignments) {
  return {
    schemaVersion: schemaVersion,
    accounts: [{
      email: "manager@example.com", displayName: "Gestionnaire", status: "ACTIVE",
      roles: ["ADMINISTRATEUR"], assignments: [{
        module: "ACCESS", season: "*", section: "", courseCode: "",
        status: "ACTIVE", roles: ["ADMINISTRATEUR"],
        extraCapabilities: ["ACCESS_MANAGE"], validFrom: "", validUntil: ""
      }].concat(assignments || [])
    }]
  };
}

function AKS_access002Schema12Service_(registry) {
  return AKS_createAccessService_({
    identityProvider: function () { return "manager@example.com"; },
    registryStore: { load: function () { return registry; } },
    courseProvider: { list: function () { return []; } },
    legacyAdminEmails: [],
    clock: function () { return new Date("2026-09-01T10:00:00.000Z"); }
  });
}

function AKS_testAccess002Schema12_reads11WithoutWrite_() {
  var fixture = AKS_access002AdminFixture_({
    registry: AKS_access002Schema12Registry_("access/1.1"),
    identity: "manager@example.com"
  });
  var view = fixture.service.readRegistry();
  assertEquals_("access/1.2", view.schemaVersion);
  assertEquals_(0, fixture.writes());
  assertEquals_("access/1.1", fixture.registry().schemaVersion);
}

function AKS_testAccess002Schema12_exposesAdministrationCatalogue_() {
  var catalogue = AKS.Core.AccessModelCatalogue.get();
  assertEquals_("access/1.2", catalogue.schemaVersion);
  assertEquals_(JSON.stringify(["access/1.0", "access/1.1", "access/1.2"]),
    JSON.stringify(catalogue.readableSchemaVersions));
  assertEquals_(JSON.stringify(["CONFIG_READ", "CONFIG_WRITE", "CONFIG_RESET", "LOG_READ"]),
    JSON.stringify(catalogue.modules.ADMINISTRATION.capabilities));
  assertTrue_(Object.isFrozen(catalogue.modules.ADMINISTRATION));
}

function AKS_testAccess002Schema12_authorizesExplicitAdministration_() {
  var access = AKS_access002Schema12Service_(AKS_access002Schema12Registry_("access/1.2", [
    AKS_access002Schema12AdministrationAssignment_([
      "CONFIG_READ", "CONFIG_WRITE", "CONFIG_RESET", "LOG_READ"
    ])
  ]));
  ["CONFIG_READ", "CONFIG_WRITE", "CONFIG_RESET", "LOG_READ"].forEach(function (capability) {
    assertTrue_(access.assertAdministrationCapability(capability));
  });
}

function AKS_testAccess002Schema12_rejectsAdministrationIn11_() {
  var access = AKS_access002Schema12Service_(AKS_access002Schema12Registry_("access/1.1", [
    AKS_access002Schema12AdministrationAssignment_(["CONFIG_READ"])
  ]));
  assertThrows_(function () { access.readRegistryForAdministration(); },
    "ACCESS_REGISTRY_INVALID");
}

function AKS_testAccess002Schema12_rejectsIncoherentConfigWrites_() {
  [["CONFIG_WRITE"], ["CONFIG_READ", "CONFIG_RESET"]].forEach(function (capabilities) {
    var fixture = AKS_access002AdminFixture_({
      registry: AKS_access002Schema12Registry_("access/1.1"),
      identity: "manager@example.com"
    });
    var view = fixture.service.readRegistry();
    var accounts = JSON.parse(JSON.stringify(view.accounts));
    accounts[0].assignments.push(
      AKS_access002Schema12AdministrationAssignment_(capabilities));
    assertThrows_(function () {
      fixture.service.previewRegistry({
        expectedRevision: view.revision,
        registry: { schemaVersion: "access/1.2", accounts: accounts }
      });
    }, "ACCESS_REGISTRY_INVALID");
    assertEquals_(0, fixture.writes());
  });
}

function AKS_testAccess002Schema12_acceptsCoherentConfigPreview_() {
  var fixture = AKS_access002AdminFixture_({
    registry: AKS_access002Schema12Registry_("access/1.1"),
    identity: "manager@example.com"
  });
  var view = fixture.service.readRegistry();
  var accounts = JSON.parse(JSON.stringify(view.accounts));
  accounts[0].assignments.push(AKS_access002Schema12AdministrationAssignment_([
    "CONFIG_READ", "CONFIG_WRITE", "CONFIG_RESET"
  ]));
  var preview = fixture.service.previewRegistry({
    expectedRevision: view.revision,
    registry: { schemaVersion: "access/1.2", accounts: accounts }
  });
  assertEquals_("access/1.2", preview.schemaVersion);
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Schema12_rejectsIncoherentAnalyticsWrites_() {
  [["ANALYTICS_PREVIEW"], ["ANALYTICS_READ", "ANALYTICS_PUBLISH"]]
    .forEach(function (capabilities) {
      var fixture = AKS_access002AdminFixture_({
        registry: AKS_access002Schema12Registry_("access/1.1"),
        identity: "manager@example.com"
      });
      var view = fixture.service.readRegistry();
      var accounts = JSON.parse(JSON.stringify(view.accounts));
      accounts[0].assignments.push({
        module: "ANALYTICS", season: "*", section: "", courseCode: "",
        status: "ACTIVE", roles: ["ADMINISTRATEUR"],
        extraCapabilities: capabilities, validFrom: "", validUntil: ""
      });
      assertThrows_(function () {
        fixture.service.previewRegistry({
          expectedRevision: view.revision,
          registry: { schemaVersion: "access/1.2", accounts: accounts }
        });
      }, "ACCESS_REGISTRY_INVALID");
    });
}

function AKS_testAccess002Schema12_preservesIncoherent11Read_() {
  var registry = AKS_access002Schema12Registry_("access/1.1", [{
    module: "ANALYTICS", season: "*", section: "", courseCode: "",
    status: "ACTIVE", roles: ["ADMINISTRATEUR"],
    extraCapabilities: ["ANALYTICS_PUBLISH"], validFrom: "", validUntil: ""
  }]);
  var access = AKS_access002Schema12Service_(registry);
  assertTrue_(access.assertAnalyticsCapability("ANALYTICS_PUBLISH"));
  assertThrows_(function () { access.assertAnalyticsCapability("ANALYTICS_READ"); },
    "ACCESS_CAPABILITY_DENIED");
  assertEquals_("access/1.1", registry.schemaVersion);
}

function AKS_testAccess002Schema12_keepsAuditReadUnassignable_() {
  var fixture = AKS_access002AdminFixture_({
    registry: AKS_access002Schema12Registry_("access/1.1"),
    identity: "manager@example.com"
  });
  var view = fixture.service.readRegistry();
  var accounts = JSON.parse(JSON.stringify(view.accounts));
  accounts[0].assignments.push(
    AKS_access002Schema12AdministrationAssignment_(["AUDIT_READ"]));
  assertThrows_(function () {
    fixture.service.previewRegistry({
      expectedRevision: view.revision,
      registry: { schemaVersion: "access/1.2", accounts: accounts }
    });
  }, "ACCESS_REGISTRY_INVALID");
}

function AKS_testAccess002Schema12_restoresExact11AfterFailure_() {
  var initial = AKS_access002Schema12Registry_("access/1.1");
  var fixture = AKS_access002AdminFixture_({
    registry: JSON.parse(JSON.stringify(initial)),
    identity: "manager@example.com",
    failAuditAt: 2
  });
  var view = fixture.service.readRegistry();
  var accounts = JSON.parse(JSON.stringify(view.accounts));
  accounts[0].displayName = "Modification temporaire";
  assertThrows_(function () {
    fixture.service.updateRegistry({
      expectedRevision: view.revision,
      registry: { schemaVersion: "access/1.2", accounts: accounts }
    });
  }, "ACCESS_AUDIT_REQUIRED");
  assertEquals_(JSON.stringify(initial), JSON.stringify(fixture.registry()));
}

function AKS_runAccess002Schema12Suite() {
  return AKS_runNamedTestSuite_("ACCESS-002-06 — modèle access/1.2", [
    { name: "lecture 1.1 sans écriture", test: AKS_testAccess002Schema12_reads11WithoutWrite_ },
    { name: "catalogue Administration", test: AKS_testAccess002Schema12_exposesAdministrationCatalogue_ },
    { name: "Administration explicite", test: AKS_testAccess002Schema12_authorizesExplicitAdministration_ },
    { name: "Administration interdite en 1.1", test: AKS_testAccess002Schema12_rejectsAdministrationIn11_ },
    { name: "Config incohérent refusé", test: AKS_testAccess002Schema12_rejectsIncoherentConfigWrites_ },
    { name: "Config cohérent accepté", test: AKS_testAccess002Schema12_acceptsCoherentConfigPreview_ },
    { name: "Analytics incohérent refusé", test: AKS_testAccess002Schema12_rejectsIncoherentAnalyticsWrites_ },
    { name: "Analytics 1.1 préservé", test: AKS_testAccess002Schema12_preservesIncoherent11Read_ },
    { name: "AUDIT_READ non attribuable", test: AKS_testAccess002Schema12_keepsAuditReadUnassignable_ },
    { name: "restauration exacte 1.1", test: AKS_testAccess002Schema12_restoresExact11AfterFailure_ }
  ]);
}
