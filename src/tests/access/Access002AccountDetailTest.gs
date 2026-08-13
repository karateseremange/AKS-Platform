function AKS_access002DetailFixture_(overrides) {
  overrides = overrides || {};
  var base = AKS_access002AdminFixture_(overrides);
  return {
    service: AKS_createAccessAccountDetailService_({ accessAdmin: base.service }),
    writes: base.writes
  };
}

function AKS_testAccess002Detail_returnsMinimizedTargetAndCatalogues_() {
  var result = AKS_access002DetailFixture_().service
    .getAccountDetail(" TEACHER@EXAMPLE.COM ");
  assertEquals_("teacher@example.com", result.account.accountId);
  assertEquals_("ACTIVE", result.account.status);
  assertEquals_(true, result.account.editable);
  assertEquals_("ATTENDANCE", result.account.assignments[0].module);
  assertEquals_(undefined, result.account.email);
  assertEquals_("access/1.1", result.catalogues.schemaVersion);
  assertTrue_(Object.isFrozen(result));
  assertTrue_(Object.isFrozen(result.catalogues.modules));
}

function AKS_testAccess002Detail_rejectsInvalidOrUnknownTarget_() {
  var service = AKS_access002DetailFixture_().service;
  assertThrows_(function () { service.getAccountDetail("not-an-email"); },
    "ACCESS_ACCOUNT_ID_INVALID");
  assertThrows_(function () { service.getAccountDetail("absent@example.com"); },
    "ACCESS_ACCOUNT_NOT_FOUND");
}

function AKS_testAccess002Detail_propagatesAdministrativeRefusal_() {
  var fixture = AKS_access002DetailFixture_({ identity: "teacher@example.com" });
  assertThrows_(function () {
    fixture.service.getAccountDetail("teacher@example.com");
  }, "ACCESS_CAPABILITY_DENIED");
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Detail_previewsRolesWithoutWrite_() {
  var fixture = AKS_access002DetailFixture_();
  var before = fixture.service.getAccountDetail("teacher@example.com");
  var result = fixture.service.previewAccountAccess({
    accountId: "teacher@example.com", expectedRevision: before.revision,
    roles: ["PROFESSEUR", "CONSULTATION"],
    assignments: before.account.assignments
  });
  assertEquals_(true, result.changed);
  assertEquals_(JSON.stringify(["CONSULTATION"]),
    JSON.stringify(result.summary.rolesAdded));
  assertEquals_(0, result.summary.assignmentsAdded.length);
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Detail_previewsIndependentAnalytics_() {
  var fixture = AKS_access002DetailFixture_();
  var before = fixture.service.getAccountDetail("teacher@example.com");
  var assignments = JSON.parse(JSON.stringify(before.account.assignments));
  assignments.push({
    module: "ANALYTICS", season: "*", section: "", courseCode: "",
    status: "ACTIVE", roles: ["PROFESSEUR"],
    capabilities: ["ANALYTICS_READ", "ANALYTICS_PREVIEW"],
    validFrom: "", validUntil: ""
  });
  var result = fixture.service.previewAccountAccess({
    accountId: "teacher@example.com", expectedRevision: before.revision,
    roles: before.account.roles, assignments: assignments
  });
  assertEquals_(1, result.summary.assignmentsAdded.length);
  assertEquals_("ANALYTICS", result.summary.assignmentsAdded[0].module);
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Detail_returnsNoChangeSummary_() {
  var fixture = AKS_access002DetailFixture_();
  var before = fixture.service.getAccountDetail("teacher@example.com");
  var result = fixture.service.previewAccountAccess({
    accountId: "teacher@example.com", expectedRevision: before.revision,
    roles: before.account.roles, assignments: before.account.assignments
  });
  assertEquals_(false, result.changed);
  assertEquals_(0, result.summary.rolesAdded.length);
  assertEquals_(0, result.summary.rolesRemoved.length);
  assertEquals_(0, result.summary.assignmentsAdded.length);
  assertEquals_(0, result.summary.assignmentsRemoved.length);
}

function AKS_testAccess002Detail_rejectsStalePreview_() {
  var fixture = AKS_access002DetailFixture_();
  var before = fixture.service.getAccountDetail("teacher@example.com");
  assertThrows_(function () {
    fixture.service.previewAccountAccess({
      accountId: "teacher@example.com", expectedRevision: "stale",
      roles: before.account.roles, assignments: before.account.assignments
    });
  }, "ACCESS_REGISTRY_CONFLICT");
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Detail_rejectsInvalidProposalWithoutWrite_() {
  var fixture = AKS_access002DetailFixture_();
  var before = fixture.service.getAccountDetail("teacher@example.com");
  assertThrows_(function () {
    fixture.service.previewAccountAccess({
      accountId: "teacher@example.com", expectedRevision: before.revision,
      roles: ["SUPER_ADMIN"], assignments: before.account.assignments
    });
  }, "ACCESS_REGISTRY_INVALID");
  assertEquals_(0, fixture.writes());
}

function AKS_testAccess002Detail_rejectsInactiveModification_() {
  var fixture = AKS_access002DetailFixture_();
  var detail = fixture.service.getAccountDetail("teacher@example.com");
  var inactiveFixture = AKS_access002DetailFixture_({ registry: {
    schemaVersion: "access/1.1", accounts: [{
      email: "admin@example.com", displayName: "Admin", status: "ACTIVE",
      roles: ["ADMINISTRATEUR"], assignments: [{
        module: "ACCESS", season: "*", section: "", courseCode: "",
        status: "ACTIVE", roles: ["ADMINISTRATEUR"],
        extraCapabilities: ["ACCESS_MANAGE"], validFrom: "", validUntil: ""
      }]
    }, {
      email: "teacher@example.com", displayName: "Ancien", status: "INACTIVE",
      roles: ["PROFESSEUR"], assignments: []
    }]
  }});
  var inactive = inactiveFixture.service.getAccountDetail("teacher@example.com");
  assertEquals_(false, inactive.account.editable);
  assertThrows_(function () {
    inactiveFixture.service.previewAccountAccess({
      accountId: "teacher@example.com", expectedRevision: inactive.revision,
      roles: detail.account.roles, assignments: []
    });
  }, "ACCESS_ACCOUNT_INACTIVE");
  assertEquals_(0, inactiveFixture.writes());
}

function AKS_runAccess002AccountDetailSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-04 — fiche et prévisualisation", [
    { name: "fiche minimisée et catalogues", test: AKS_testAccess002Detail_returnsMinimizedTargetAndCatalogues_ },
    { name: "cible invalide ou inconnue", test: AKS_testAccess002Detail_rejectsInvalidOrUnknownTarget_ },
    { name: "refus administratif propagé", test: AKS_testAccess002Detail_propagatesAdministrativeRefusal_ },
    { name: "prévisualisation des rôles", test: AKS_testAccess002Detail_previewsRolesWithoutWrite_ },
    { name: "prévisualisation Analytics autonome", test: AKS_testAccess002Detail_previewsIndependentAnalytics_ },
    { name: "synthèse sans changement", test: AKS_testAccess002Detail_returnsNoChangeSummary_ },
    { name: "révision obsolète refusée", test: AKS_testAccess002Detail_rejectsStalePreview_ },
    { name: "proposition invalide refusée", test: AKS_testAccess002Detail_rejectsInvalidProposalWithoutWrite_ },
    { name: "compte inactif non modifiable", test: AKS_testAccess002Detail_rejectsInactiveModification_ }
  ]);
}
