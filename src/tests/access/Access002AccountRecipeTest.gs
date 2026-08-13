function AKS_access002AccountRecipeFixture_(overrides) {
  overrides = overrides || {};
  var values = {
    AKS_ACCESS00203_RECIPE_ACCOUNT_EMAIL: "cycle@example.com",
    AKS_ACCESS_REGISTRY: "before"
  };
  var calls = [], identities = [], revision = "rev-before", accounts = [];
  var store = {
    getProperty: function (key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    },
    setProperty: function (key, value) { calls.push("set:" + key); values[key] = String(value); }
  };
  var base = {
    preflight: function () { calls.push("base:preflight"); return {
      environment: "RECETTE", scriptIdSuffix: "eIRxs4", registryRevision: revision
    }; },
    apply: function () {
      calls.push("base:apply");
      values.AKS_ACCESS002_RECIPE_BACKUP = JSON.stringify({
        schemaVersion: "access-recipe-backup/1.0", manager: "manager@example.com",
        beforeRevision: "rev-before", beforeRaw: "before",
        afterRevision: "rev-bootstrap", afterRaw: "bootstrap"
      });
      values.AKS_ACCESS_REGISTRY = "bootstrap"; revision = "rev-bootstrap";
      return { revision: revision };
    },
    restore: function () {
      calls.push("base:restore"); values.AKS_ACCESS_REGISTRY = "before";
      delete values.AKS_ACCESS002_RECIPE_BACKUP; revision = "rev-before";
      return { revision: revision, exactRestore: true, backupRemoved: true };
    }
  };
  function mutate_(action, command) {
    calls.push(action);
    if (overrides.failOn === action) throw new Error("failure");
    revision = "rev-" + action;
    values.AKS_ACCESS_REGISTRY = action;
    if (action === "create") accounts = [{
      accountId: command.accountId, status: "INACTIVE", assignmentCount: 0
    }];
    if (action === "activate") accounts[0].status = "ACTIVE";
    if (action === "deactivate") accounts[0].status = "INACTIVE";
    return { revision: revision };
  }
  var lifecycle = {
    createAccount: function (command) { return mutate_("create", command); },
    reactivateAccount: function (command) { return mutate_("activate", command); },
    deactivateAccount: function (command) { return mutate_("deactivate", command); }
  };
  var projection = { listAccounts: function () {
    calls.push("project");
    return { resultCount: accounts.length, accounts: JSON.parse(JSON.stringify(accounts)) };
  }};
  return {
    recipe: AKS_createAccess002AccountRecipe_({
      baseRecipe: base, propertyStore: store,
      lifecycleFactory: function (identity) { identities.push(identity); return lifecycle; },
      projectionFactory: function (identity) { identities.push(identity); return projection; },
      idProvider: function () { return "uuid"; }
    }),
    calls: calls, values: values, identities: identities,
    seedExisting: function () {
      accounts = [{ accountId: "cycle@example.com", status: "INACTIVE", assignmentCount: 0 }];
      values.AKS_ACCESS_REGISTRY = JSON.stringify({ schemaVersion: "access/1.0", accounts: [{
        email: "cycle@example.com", status: "INACTIVE", roles: ["CONSULTATION"],
        assignments: []
      }] });
    }
  };
}

function AKS_testAccess002AccountRecipe_preflightIsReadOnly_() {
  var fixture = AKS_access002AccountRecipeFixture_();
  var result = fixture.recipe.preflight();
  assertEquals_("PREFLIGHT", result.phase);
  assertEquals_(false, result.writePerformed);
  assertEquals_(JSON.stringify(["base:preflight"]), JSON.stringify(fixture.calls));
}

function AKS_testAccess002AccountRecipe_rejectsExistingAccount_() {
  var fixture = AKS_access002AccountRecipeFixture_(); fixture.seedExisting();
  var before = fixture.values.AKS_ACCESS_REGISTRY;
  assertThrows_(function () { fixture.recipe.preflight(); },
    "ACCESS_ACCOUNT_RECIPE_ACCOUNT_EXISTS");
  assertEquals_(before, fixture.values.AKS_ACCESS_REGISTRY);
  assertEquals_(0, fixture.calls.filter(function (entry) {
    return entry.indexOf("set:") === 0;
  }).length);
}

function AKS_testAccess002AccountRecipe_runsVerifiedLifecycle_() {
  var fixture = AKS_access002AccountRecipeFixture_();
  var result = fixture.recipe.apply();
  assertEquals_(true, result.createdInactive);
  assertEquals_(true, result.activatedWithoutAccess);
  assertEquals_(true, result.deactivatedWithHistory);
  assertEquals_(JSON.stringify(["base:apply", "create", "set:AKS_ACCESS002_RECIPE_BACKUP",
    "activate", "set:AKS_ACCESS002_RECIPE_BACKUP", "deactivate",
    "set:AKS_ACCESS002_RECIPE_BACKUP", "project"]), JSON.stringify(fixture.calls));
  var backup = JSON.parse(fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
  assertEquals_(JSON.stringify(["cycle@example.com", "manager@example.com"]),
    JSON.stringify(backup.changedAccountIds));
  assertEquals_(JSON.stringify(["manager@example.com", "manager@example.com"]),
    JSON.stringify(fixture.identities));
}

function AKS_testAccess002AccountRecipe_restoresExactInitialState_() {
  var fixture = AKS_access002AccountRecipeFixture_();
  fixture.recipe.apply(); var result = fixture.recipe.restore();
  assertEquals_(true, result.exactRestore);
  assertEquals_("before", fixture.values.AKS_ACCESS_REGISTRY);
  assertEquals_(undefined, fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
}

function AKS_testAccess002AccountRecipe_autoRestoresFailedCycle_() {
  var fixture = AKS_access002AccountRecipeFixture_({ failOn: "activate" });
  assertThrows_(function () { fixture.recipe.apply(); });
  assertEquals_("before", fixture.values.AKS_ACCESS_REGISTRY);
  assertEquals_(undefined, fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
  assertTrue_(fixture.calls.indexOf("base:restore") !== -1);
}

function AKS_runAccess002AccountRecipeSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-03 — recette du cycle de vie", [
    { name: "précontrôle sans écriture", test: AKS_testAccess002AccountRecipe_preflightIsReadOnly_ },
    { name: "compte existant refusé", test: AKS_testAccess002AccountRecipe_rejectsExistingAccount_ },
    { name: "cycle vérifié", test: AKS_testAccess002AccountRecipe_runsVerifiedLifecycle_ },
    { name: "restauration exacte", test: AKS_testAccess002AccountRecipe_restoresExactInitialState_ },
    { name: "échec auto-restauré", test: AKS_testAccess002AccountRecipe_autoRestoresFailedCycle_ }
  ]);
}
