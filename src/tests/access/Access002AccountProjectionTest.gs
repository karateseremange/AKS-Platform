function AKS_access002ProjectionFixture_(overrides) {
  overrides = overrides || {};
  var reads = 0;
  var view = overrides.view || {
    revision: "access-rev/1-test",
    bootstrap: false,
    accounts: [{
      email: "manager@example.com", displayName: "Zoé Gestionnaire", status: "ACTIVE",
      roles: ["ADMINISTRATEUR"], updatedAt: "2026-08-12T10:00:00Z",
      updatedBy: "ADMIN@EXAMPLE.COM", assignments: [{
        module: "ACCESS", season: "*", section: "", courseCode: "",
        status: "ACTIVE", roles: ["ADMINISTRATEUR"],
        extraCapabilities: ["ACCESS_MANAGE"], validFrom: "", validUntil: ""
      }]
    }, {
      email: "teacher@example.com", displayName: "Alice Professeur", status: "ACTIVE",
      roles: ["PROFESSEUR"], updatedAt: "", updatedBy: "", assignments: [{
        module: "", season: "2026-2027", section: "", courseCode: "BABY",
        status: "ACTIVE", roles: ["PROFESSEUR"],
        extraCapabilities: ["ANALYTICS_READ"], validFrom: "", validUntil: ""
      }, {
        module: "INSCRIPTIONS", season: "2026-2027", section: "BABY",
        courseCode: "", status: "ACTIVE", roles: ["PROFESSEUR"],
        extraCapabilities: ["INSCRIPTIONS_READ"],
        validFrom: "2026-10-01", validUntil: ""
      }]
    }, {
      email: "old@example.com", displayName: "Ancien Compte", status: "INACTIVE",
      roles: ["CONSULTATION"], assignments: [{
        module: "", season: "2025-2026", section: "", courseCode: "ENFANT1",
        status: "ACTIVE", roles: ["CONSULTATION"], extraCapabilities: [],
        validFrom: "", validUntil: "2026-06-30"
      }]
    }, {
      email: "empty@example.com", displayName: "Compte Sans Accès", status: "ACTIVE",
      roles: ["ASSISTANT_AFA"], assignments: []
    }]
  };
  return {
    service: AKS_createAccessAccountProjectionService_({
      accessAdmin: { readRegistry: function () { reads += 1; return view; } },
      clock: function () { return new Date("2026-09-01T10:00:00.000Z"); }
    }),
    reads: function () { return reads; }
  };
}

function AKS_testAccess002Projection_buildsSafeEffectiveSummary_() {
  var result = AKS_access002ProjectionFixture_().service.listAccounts({});
  assertEquals_(4, result.totalCount);
  assertEquals_(4, result.resultCount);
  assertEquals_("teacher@example.com", result.accounts[0].accountId);
  assertEquals_(JSON.stringify(["ANALYTICS", "ATTENDANCE"]),
    JSON.stringify(result.accounts[0].effectiveModules));
  assertEquals_(1, result.accounts[0].effectiveAssignmentCount);
  assertEquals_("EFFECTIVE", result.accounts[0].temporalState);
  assertEquals_(true, result.accounts[3].status === "INACTIVE");
}

function AKS_testAccess002Projection_marksManagerOnlyFromEffectiveAssignment_() {
  var result = AKS_access002ProjectionFixture_().service.listAccounts({ search: "manager" });
  assertEquals_(1, result.resultCount);
  assertEquals_(true, result.accounts[0].accessManager);
  assertEquals_(JSON.stringify(["ACCESS"]), JSON.stringify(result.accounts[0].effectiveModules));
}

function AKS_testAccess002Projection_normalizesSearchAndCombinedFilters_() {
  var result = AKS_access002ProjectionFixture_().service.listAccounts({
    search: "  ALICE  ", status: "active", role: "professeur",
    module: "analytics", temporalState: "effective"
  });
  assertEquals_(1, result.resultCount);
  assertEquals_("alice", result.query.search);
  assertEquals_("ACTIVE", result.query.status);
  assertEquals_("teacher@example.com", result.accounts[0].accountId);
}

function AKS_testAccess002Projection_filtersFutureAndWithoutAssignment_() {
  var fixture = AKS_access002ProjectionFixture_();
  var future = fixture.service.listAccounts({ temporalState: "future" });
  var empty = fixture.service.listAccounts({ temporalState: "without_assignment" });
  assertEquals_(0, future.resultCount);
  assertEquals_(1, empty.resultCount);
  assertEquals_("empty@example.com", empty.accounts[0].accountId);
  assertEquals_(2, fixture.reads());
}

function AKS_testAccess002Projection_marksFutureWhenNoAssignmentIsEffective_() {
  var fixture = AKS_access002ProjectionFixture_({ view: {
    revision: "access-rev/future", bootstrap: false, accounts: [{
      email: "future@example.com", displayName: "Compte Futur", status: "ACTIVE",
      roles: ["CONSULTATION"], assignments: [{
        module: "", season: "2026-2027", section: "", courseCode: "BABY",
        status: "ACTIVE", roles: ["CONSULTATION"], extraCapabilities: [],
        validFrom: "2026-10-01", validUntil: ""
      }]
    }]
  }});
  var result = fixture.service.listAccounts({});
  assertEquals_("FUTURE", result.accounts[0].temporalState);
  assertEquals_(0, result.accounts[0].effectiveAssignmentCount);
  assertEquals_(0, result.accounts[0].effectiveModules.length);
}

function AKS_testAccess002Projection_sortsActiveThenNameThenEmail_() {
  var result = AKS_access002ProjectionFixture_().service.listAccounts({});
  assertEquals_(JSON.stringify([
    "teacher@example.com", "empty@example.com", "manager@example.com", "old@example.com"
  ]), JSON.stringify(result.accounts.map(function (account) { return account.accountId; })));
}

function AKS_testAccess002Projection_rejectsUnknownFiltersBeforeRead_() {
  [
    { status: "DELETED" }, { role: "SUPER_ADMIN" },
    { module: "CONFIG" }, { temporalState: "INACTIVE" }
  ].forEach(function (query) {
    var fixture = AKS_access002ProjectionFixture_();
    assertThrows_(function () { fixture.service.listAccounts(query); }, "ACCESS_QUERY_INVALID");
    assertEquals_(0, fixture.reads());
  });
}

function AKS_testAccess002Projection_propagatesAdministrativeRefusal_() {
  var service = AKS_createAccessAccountProjectionService_({
    accessAdmin: { readRegistry: function () {
      var failure = new Error("Refus");
      failure.code = "ACCESS_CAPABILITY_DENIED";
      throw failure;
    }},
    clock: function () { return new Date("2026-09-01T10:00:00.000Z"); }
  });
  assertThrows_(function () { service.listAccounts({}); }, "ACCESS_CAPABILITY_DENIED");
}

function AKS_testAccess002Projection_returnsDeeplyImmutableDefensiveView_() {
  var fixture = AKS_access002ProjectionFixture_();
  var first = fixture.service.listAccounts({});
  assertTrue_(Object.isFrozen(first));
  assertTrue_(Object.isFrozen(first.query));
  assertTrue_(Object.isFrozen(first.accounts));
  assertTrue_(Object.isFrozen(first.accounts[0].effectiveModules));
  try { first.accounts[0].displayName = "Altéré"; } catch (ignored) {}
  assertEquals_("Alice Professeur", fixture.service.listAccounts({}).accounts[0].displayName);
}

function AKS_testAccess002Projection_isReadOnly_() {
  var fixture = AKS_access002ProjectionFixture_();
  var result = fixture.service.listAccounts({ search: "absent" });
  assertEquals_(0, result.resultCount);
  assertEquals_(4, result.totalCount);
  assertEquals_(1, fixture.reads());
  assertEquals_("access-rev/1-test", result.revision);
}

function AKS_runAccess002AccountProjectionSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-03 — projection des comptes", [
    { name: "synthèse effective sûre", test: AKS_testAccess002Projection_buildsSafeEffectiveSummary_ },
    { name: "gestionnaire explicite effectif", test: AKS_testAccess002Projection_marksManagerOnlyFromEffectiveAssignment_ },
    { name: "recherche et filtres combinés", test: AKS_testAccess002Projection_normalizesSearchAndCombinedFilters_ },
    { name: "états futur et sans habilitation", test: AKS_testAccess002Projection_filtersFutureAndWithoutAssignment_ },
    { name: "affectation future non effective", test: AKS_testAccess002Projection_marksFutureWhenNoAssignmentIsEffective_ },
    { name: "tri stable", test: AKS_testAccess002Projection_sortsActiveThenNameThenEmail_ },
    { name: "filtres inconnus refusés", test: AKS_testAccess002Projection_rejectsUnknownFiltersBeforeRead_ },
    { name: "refus administratif propagé", test: AKS_testAccess002Projection_propagatesAdministrativeRefusal_ },
    { name: "projection profondément immuable", test: AKS_testAccess002Projection_returnsDeeplyImmutableDefensiveView_ },
    { name: "lecture seule", test: AKS_testAccess002Projection_isReadOnly_ }
  ]);
}
