function AKS_access002LifecycleFixture_(overrides) {
  overrides = overrides || {};
  var updates = [];
  var reads = 0;
  var view = overrides.view || {
    revision: "access-rev/lifecycle", bootstrap: false, accounts: [{
      email: "manager@example.com", displayName: "Gestionnaire", status: "ACTIVE",
      roles: ["ADMINISTRATEUR"], assignments: [{
        module: "ACCESS", season: "*", section: "", courseCode: "",
        status: "ACTIVE", roles: ["ADMINISTRATEUR"],
        extraCapabilities: ["ACCESS_MANAGE"], validFrom: "", validUntil: ""
      }]
    }, {
      email: "old@example.com", displayName: "Ancien", status: "INACTIVE",
      roles: ["PROFESSEUR"], assignments: [{
        module: "", season: "2026-2027", section: "", courseCode: "BABY",
        status: "ACTIVE", roles: ["PROFESSEUR"], extraCapabilities: [],
        validFrom: "", validUntil: ""
      }]
    }]
  };
  var admin = {
    readRegistry: function () {
      reads += 1;
      return JSON.parse(JSON.stringify(view));
    },
    updateRegistry: function (command) {
      updates.push(command);
      if (overrides.updateFailure) throw overrides.updateFailure;
      view = {
        revision: "access-rev/updated-" + updates.length,
        correlationId: "corr-access-lifecycle-" + updates.length,
        bootstrap: false,
        accounts: JSON.parse(JSON.stringify(command.registry.accounts))
      };
      return JSON.parse(JSON.stringify(view));
    }
  };
  return {
    service: AKS_createAccessAccountLifecycleService_({ accessAdmin: admin }),
    updates: updates,
    reads: function () { return reads; },
    view: function () { return view; }
  };
}

function AKS_access002LifecycleCommand_(overrides) {
  var command = {
    accountId: "new@example.com", expectedRevision: "access-rev/lifecycle",
    requestId: "req-access-lifecycle-001"
  };
  Object.keys(overrides || {}).forEach(function (key) { command[key] = overrides[key]; });
  return command;
}

function AKS_testAccess002Lifecycle_createsInactiveAccountWithoutAssignments_() {
  var fixture = AKS_access002LifecycleFixture_();
  var result = fixture.service.createAccount(AKS_access002LifecycleCommand_({
    email: " NEW@EXAMPLE.COM ", accountId: "", displayName: " Nouvelle Personne ",
    role: "consultation"
  }));
  assertTrue_(result.changed);
  assertEquals_("CREATE", result.action);
  assertEquals_("new@example.com", result.account.email);
  assertEquals_("INACTIVE", result.account.status);
  assertEquals_(JSON.stringify(["CONSULTATION"]), JSON.stringify(result.account.roles));
  assertEquals_(0, result.account.assignments.length);
}

function AKS_testAccess002Lifecycle_rejectsInvalidCreateBeforeRead_() {
  var fixture = AKS_access002LifecycleFixture_();
  assertThrows_(function () {
    fixture.service.createAccount(AKS_access002LifecycleCommand_({ role: "SUPER_ADMIN" }));
  }, "ACCESS_COMMAND_INVALID");
  assertEquals_(0, fixture.reads());
  assertEquals_(0, fixture.updates.length);
}

function AKS_testAccess002Lifecycle_rejectsDuplicateAccount_() {
  var fixture = AKS_access002LifecycleFixture_();
  assertThrows_(function () {
    fixture.service.createAccount(AKS_access002LifecycleCommand_({
      accountId: "MANAGER@example.com", displayName: "Doublon", role: "ADMINISTRATEUR"
    }));
  }, "ACCESS_ACCOUNT_EXISTS");
  assertEquals_(0, fixture.updates.length);
}

function AKS_testAccess002Lifecycle_deactivatesAndPreservesHistory_() {
  var fixture = AKS_access002LifecycleFixture_();
  var result = fixture.service.deactivateAccount(AKS_access002LifecycleCommand_({
    accountId: "manager@example.com"
  }));
  assertEquals_("INACTIVE", result.account.status);
  assertEquals_(1, result.account.assignments.length);
  assertEquals_(1, fixture.updates.length);
}

function AKS_testAccess002Lifecycle_rejectsUnknownAccountWithoutWrite_() {
  var fixture = AKS_access002LifecycleFixture_();
  assertThrows_(function () {
    fixture.service.deactivateAccount(AKS_access002LifecycleCommand_({
      accountId: "absent@example.com"
    }));
  }, "ACCESS_ACCOUNT_NOT_FOUND");
  assertEquals_(1, fixture.reads());
  assertEquals_(0, fixture.updates.length);
}

function AKS_testAccess002Lifecycle_returnsInactiveAccountWithoutWrite_() {
  var fixture = AKS_access002LifecycleFixture_();
  var result = fixture.service.deactivateAccount(AKS_access002LifecycleCommand_({
    accountId: "old@example.com"
  }));
  assertEquals_(false, result.changed);
  assertEquals_(0, fixture.updates.length);
}

function AKS_testAccess002Lifecycle_requiresConfirmedAssignmentClear_() {
  var fixture = AKS_access002LifecycleFixture_();
  assertThrows_(function () {
    fixture.service.reactivateAccount(AKS_access002LifecycleCommand_({
      accountId: "old@example.com"
    }));
  }, "ACCESS_ASSIGNMENTS_CLEAR_REQUIRED");
  assertEquals_(0, fixture.updates.length);
}

function AKS_testAccess002Lifecycle_reactivatesWithoutOldAssignments_() {
  var fixture = AKS_access002LifecycleFixture_();
  var result = fixture.service.reactivateAccount(AKS_access002LifecycleCommand_({
    accountId: "old@example.com", clearAssignments: true
  }));
  assertEquals_("ACTIVE", result.account.status);
  assertEquals_(0, result.account.assignments.length);
  assertEquals_(1, fixture.updates.length);
}

function AKS_testAccess002Lifecycle_returnsActiveAccountWithoutWrite_() {
  var fixture = AKS_access002LifecycleFixture_();
  var result = fixture.service.reactivateAccount(AKS_access002LifecycleCommand_({
    accountId: "manager@example.com", clearAssignments: true
  }));
  assertEquals_(false, result.changed);
  assertEquals_(0, fixture.updates.length);
}

function AKS_testAccess002Lifecycle_propagatesAuditedBoundaryFailure_() {
  var failure = new Error("Dernier gestionnaire");
  failure.code = "ACCESS_LAST_MANAGER_REQUIRED";
  var fixture = AKS_access002LifecycleFixture_({ updateFailure: failure });
  assertThrows_(function () {
    fixture.service.deactivateAccount(AKS_access002LifecycleCommand_({
      accountId: "manager@example.com"
    }));
  }, "ACCESS_LAST_MANAGER_REQUIRED");
}

function AKS_testAccess002Lifecycle_passesExpectedRevisionToBoundary_() {
  var fixture = AKS_access002LifecycleFixture_();
  fixture.service.createAccount(AKS_access002LifecycleCommand_({
    displayName: "Nouvelle", role: "PROFESSEUR", expectedRevision: "stale-revision"
  }));
  assertEquals_("stale-revision", fixture.updates[0].expectedRevision);
}

function AKS_testAccess002Lifecycle_returnsImmutableResult_() {
  var fixture = AKS_access002LifecycleFixture_();
  var result = fixture.service.createAccount(AKS_access002LifecycleCommand_({
    displayName: "Nouvelle", role: "PROFESSEUR"
  }));
  assertTrue_(Object.isFrozen(result));
  assertTrue_(Object.isFrozen(result.account));
  assertTrue_(Object.isFrozen(result.account.roles));
}

function AKS_runAccess002AccountLifecycleSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-03 — cycle de vie des comptes", [
    { name: "création inactive sans habilitation", test: AKS_testAccess002Lifecycle_createsInactiveAccountWithoutAssignments_ },
    { name: "création invalide refusée", test: AKS_testAccess002Lifecycle_rejectsInvalidCreateBeforeRead_ },
    { name: "doublon refusé", test: AKS_testAccess002Lifecycle_rejectsDuplicateAccount_ },
    { name: "désactivation avec historique", test: AKS_testAccess002Lifecycle_deactivatesAndPreservesHistory_ },
    { name: "compte inconnu refusé", test: AKS_testAccess002Lifecycle_rejectsUnknownAccountWithoutWrite_ },
    { name: "désactivation idempotente", test: AKS_testAccess002Lifecycle_returnsInactiveAccountWithoutWrite_ },
    { name: "effacement confirmé requis", test: AKS_testAccess002Lifecycle_requiresConfirmedAssignmentClear_ },
    { name: "réactivation sans anciennes habilitations", test: AKS_testAccess002Lifecycle_reactivatesWithoutOldAssignments_ },
    { name: "réactivation idempotente", test: AKS_testAccess002Lifecycle_returnsActiveAccountWithoutWrite_ },
    { name: "refus du socle audité propagé", test: AKS_testAccess002Lifecycle_propagatesAuditedBoundaryFailure_ },
    { name: "révision transmise au socle", test: AKS_testAccess002Lifecycle_passesExpectedRevisionToBoundary_ },
    { name: "résultat immuable", test: AKS_testAccess002Lifecycle_returnsImmutableResult_ }
  ]);
}
