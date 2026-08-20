function AKS_access002PortalFixture_(snapshot, historical, baseUrl) {
  var calls = 0;
  return {
    service: AKS_createAccessPortalProjectionService_({
      accessService: { getEffectiveAccessSnapshot: function () {
        calls += 1; return JSON.parse(JSON.stringify(snapshot));
      }},
      legacyAdministrator: function (email) {
        return historical === true && email === snapshot.email;
      },
      baseUrlProvider: function () { return baseUrl || "https://example.test/exec"; }
    }),
    calls: function () { return calls; }
  };
}

function AKS_testAccess002Portal_projectsAttendanceOnly_() {
  var model = AKS_access002PortalFixture_({
    email: "teacher@example.com", roles: ["PROFESSEUR"], bootstrap: false,
    assignments: [{ module: "ATTENDANCE", capabilities: ["COURSE_LIST", "ATTENDANCE_READ"] }]
  }).service.getPortalModel();
  assertEquals_("AUTHORIZED", model.state);
  assertEquals_(JSON.stringify(["module.analytics.attendance"]),
    JSON.stringify(model.destinations.map(function (entry) { return entry.id; })));
}

function AKS_testAccess002Portal_keepsAnalyticsIndependent_() {
  var model = AKS_access002PortalFixture_({
    email: "reader@example.com", roles: ["CONSULTATION"], bootstrap: false,
    assignments: [{ module: "ANALYTICS", capabilities: ["ANALYTICS_READ"] }]
  }).service.getPortalModel();
  assertEquals_(JSON.stringify(["module.analytics"]),
    JSON.stringify(model.destinations.map(function (entry) { return entry.id; })));
}

function AKS_testAccess002Portal_showsAnalyticsForAnyExplicitCapability_() {
  ["ANALYTICS_READ", "ANALYTICS_PREVIEW", "ANALYTICS_PUBLISH"].forEach(function (capability) {
    var model = AKS_access002PortalFixture_({
      email: "analyst@example.com", roles: ["CONSULTATION"], bootstrap: false,
      assignments: [{ module: "ANALYTICS", capabilities: [capability] }]
    }).service.getPortalModel();
    assertEquals_(JSON.stringify(["module.analytics"]),
      JSON.stringify(model.destinations.map(function (entry) { return entry.id; })));
  });
}

function AKS_testAccess002Portal_exposesAccessManageOnlyExplicitly_() {
  var model = AKS_access002PortalFixture_({
    email: "manager@example.com", roles: ["ADMINISTRATEUR"], bootstrap: false,
    assignments: [{ module: "ACCESS", capabilities: ["ACCESS_MANAGE"] }]
  }).service.getPortalModel();
  assertEquals_("admin.access", model.destinations[0].id);
  assertEquals_(false, model.destinations[0].transitional);
}

function AKS_testAccess002Portal_preservesBoundedHistoricalDestinations_() {
  var model = AKS_access002PortalFixture_({
    email: "legacy@example.com", roles: [], assignments: [], bootstrap: true
  }, true).service.getPortalModel();
  assertEquals_(true, model.legacyAdministrativeAccess);
  assertEquals_(JSON.stringify(["admin.config", "admin.logs", "module.health-questionnaire"]),
    JSON.stringify(model.destinations.map(function (entry) { return entry.id; })));
  assertTrue_(model.destinations.every(function (entry) { return entry.transitional; }));
}

function AKS_testAccess002Portal_returnsNeutralClosedModel_() {
  var fixture = AKS_access002PortalFixture_({
    email: "empty@example.com", roles: ["CONSULTATION"], assignments: [], bootstrap: false
  });
  var model = fixture.service.getPortalModel();
  assertEquals_("NO_ACCESS", model.state);
  assertEquals_(0, model.destinations.length);
  assertEquals_(false, model.hasEffectiveAccess);
  assertEquals_(1, fixture.calls());
  assertEquals_(undefined, model.roles);
  assertTrue_(Object.isFrozen(model) && Object.isFrozen(model.destinations));
}

function AKS_testAccess002Portal_snapshotContainsOnlyEffectiveAssignments_() {
  var registry = { schemaVersion: "access/1.1", accounts: [{
    email: "teacher@example.com", displayName: "Professeur", status: "ACTIVE",
    roles: ["PROFESSEUR"], assignments: [{
      module: "", courseCode: "BABY", season: "2026-2027", status: "ACTIVE",
      roles: ["PROFESSEUR"], extraCapabilities: []
    }, {
      module: "ANALYTICS", courseCode: "", section: "", season: "*", status: "ACTIVE",
      roles: ["PROFESSEUR"], extraCapabilities: ["ANALYTICS_READ"],
      validFrom: "", validUntil: "2026-08-31"
    }]
  }] };
  var snapshot = AKS_access001Fixture_({ registry: registry }).service
    .getEffectiveAccessSnapshot();
  assertEquals_(1, snapshot.assignments.length);
  assertEquals_("ATTENDANCE", snapshot.assignments[0].module);
  assertTrue_(snapshot.assignments[0].capabilities.indexOf("ATTENDANCE_READ") !== -1);
}

function AKS_testAccess002Portal_snapshotDoesNotInheritFromAccountRole_() {
  var registry = { schemaVersion: "access/1.1", accounts: [{
    email: "teacher@example.com", status: "ACTIVE", roles: ["PROFESSEUR"],
    assignments: [{ module: "ANALYTICS", season: "*", section: "", courseCode: "",
      status: "ACTIVE", roles: ["PROFESSEUR"],
      extraCapabilities: ["ANALYTICS_READ"], validFrom: "", validUntil: "" }]
  }] };
  var snapshot = AKS_access001Fixture_({ registry: registry }).service
    .getEffectiveAccessSnapshot();
  assertEquals_(JSON.stringify(["ANALYTICS_READ"]),
    JSON.stringify(snapshot.assignments[0].capabilities));
}

function AKS_testAccess002Portal_snapshotIsDeeplyImmutable_() {
  var snapshot = AKS_access001Fixture_().service.getEffectiveAccessSnapshot();
  assertTrue_(Object.isFrozen(snapshot));
  assertTrue_(Object.isFrozen(snapshot.assignments));
  assertTrue_(Object.isFrozen(snapshot.assignments[0].capabilities));
}

function AKS_runAccess002PortalProjectionSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-05 — projection portail", [
    { name: "Présences uniquement", test: AKS_testAccess002Portal_projectsAttendanceOnly_ },
    { name: "Analytics indépendant", test: AKS_testAccess002Portal_keepsAnalyticsIndependent_ },
    { name: "Analytics visible pour toute capacité", test: AKS_testAccess002Portal_showsAnalyticsForAnyExplicitCapability_ },
    { name: "ACCESS explicite", test: AKS_testAccess002Portal_exposesAccessManageOnlyExplicitly_ },
    { name: "historique borné", test: AKS_testAccess002Portal_preservesBoundedHistoricalDestinations_ },
    { name: "état neutre fermé", test: AKS_testAccess002Portal_returnsNeutralClosedModel_ },
    { name: "affectations effectives", test: AKS_testAccess002Portal_snapshotContainsOnlyEffectiveAssignments_ },
    { name: "rôle sans héritage", test: AKS_testAccess002Portal_snapshotDoesNotInheritFromAccountRole_ },
    { name: "projection immuable", test: AKS_testAccess002Portal_snapshotIsDeeplyImmutable_ }
  ]);
}
