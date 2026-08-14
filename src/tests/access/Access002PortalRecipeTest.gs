function AKS_access002PortalRecipeFixture_(overrides) {
  overrides = overrides || {};
  var values = { AKS_ACCESS00205_NO_ACCESS_EMAIL: "empty@example.com",
    AKS_ACCESS00205_ATTENDANCE_EMAIL: "teacher@example.com", AKS_ACCESS_REGISTRY: "before" };
  var calls = [], revision = "rev-before", accounts = {};
  var base = {
    preflight: function () { calls.push("preflight"); return {
      environment: "RECETTE", scriptIdSuffix: "eIRxs4", registryRevision: revision }; },
    apply: function () { calls.push("base:apply"); revision = "rev-bootstrap";
      values.AKS_ACCESS_REGISTRY = "bootstrap";
      values.AKS_ACCESS002_RECIPE_BACKUP = JSON.stringify({
        schemaVersion: "access-recipe-backup/1.0", manager: "manager@example.com",
        beforeRaw: "before", beforeRevision: "rev-before" }); return { revision: revision }; },
    restore: function () { calls.push("restore"); revision = "rev-before";
      values.AKS_ACCESS_REGISTRY = "before"; delete values.AKS_ACCESS002_RECIPE_BACKUP;
      return { revision: revision, exactRestore: true, backupRemoved: true }; }
  };
  function mutate_(name, command) {
    calls.push(name); if (overrides.failOn === name) throw new Error("failure");
    revision = "rev-" + calls.length; values.AKS_ACCESS_REGISTRY = revision;
    if (name === "create") accounts[command.accountId] = { status: "INACTIVE", assignments: [] };
    if (name === "activate") accounts[command.accountId].status = "ACTIVE";
    if (name === "save") accounts[command.accountId].assignments = command.assignments;
    return { revision: revision };
  }
  function snapshot_(identity) {
    var account = accounts[identity] || { assignments: [] };
    return { email: identity, bootstrap: false, roles: [], assignments: account.assignments };
  }
  function portal_(identity) { return { getPortalModel: function () {
    calls.push("portal:" + identity); var snapshot = snapshot_(identity), destinations = [];
    if (snapshot.assignments.length) destinations.push({ id: "module.analytics.attendance" });
    if (overrides.leakAnalytics && identity === "teacher@example.com") destinations.push({ id: "module.analytics" });
    return { state: destinations.length ? "AUTHORIZED" : "NO_ACCESS", destinations: destinations };
  } }; }
  function myAccess_(identity) { return { getMyAccess: function () {
    calls.push("my:" + identity); var snapshot = snapshot_(identity);
    return { state: snapshot.assignments.length ? "AUTHORIZED" : "NO_ACCESS",
      assignments: snapshot.assignments };
  } }; }
  return { values: values, calls: calls, accounts: accounts,
    recipe: AKS_createAccess002PortalRecipe_({ baseRecipe: base,
      propertyStore: { getProperty: function (key) { return values[key] || null; },
        setProperty: function (key, value) { values[key] = String(value); calls.push("backup"); } },
      lifecycleFactory: function () { return {
        createAccount: function (command) { return mutate_("create", command); },
        reactivateAccount: function (command) { return mutate_("activate", command); }
      }; },
      detailFactory: function () { return { saveAccountAccess: function (command) {
        return mutate_("save", command); } }; },
      portalFactory: portal_, myAccessFactory: myAccess_, idProvider: function () { return "uuid"; }
    }) };
}

function AKS_testAccess002PortalRecipe_preflightIsReadOnly_() {
  var fixture = AKS_access002PortalRecipeFixture_(), result = fixture.recipe.preflight();
  assertEquals_("PREFLIGHT", result.phase); assertEquals_(false, result.writePerformed);
  assertEquals_(JSON.stringify(["preflight"]), JSON.stringify(fixture.calls));
}
function AKS_testAccess002PortalRecipe_verifiesMultipleProfiles_() {
  var fixture = AKS_access002PortalRecipeFixture_(), result = fixture.recipe.apply();
  assertEquals_(true, result.noAccessVerified); assertEquals_(true, result.attendanceOnlyVerified);
  assertEquals_(true, result.myAccessVerified); assertEquals_(true, result.forbiddenDestinationsHidden);
  var assignment = fixture.accounts["teacher@example.com"].assignments[0];
  assertEquals_("", assignment.module);
  assertEquals_("2099-2100", assignment.season);
  assertEquals_("ACCESS00205RECIPE", assignment.courseCode);
  assertTrue_(AKS_createDefaultAccess002PortalRecipe_.toString()
    .indexOf("https://example.invalid/exec") !== -1);
}
function AKS_testAccess002PortalRecipe_restoresExactInitialState_() {
  var fixture = AKS_access002PortalRecipeFixture_(); fixture.recipe.apply();
  var result = fixture.recipe.restore(); assertEquals_(true, result.exactRestore);
  assertEquals_("before", fixture.values.AKS_ACCESS_REGISTRY);
  assertEquals_(undefined, fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
}
function AKS_testAccess002PortalRecipe_rejectsDuplicateIdentities_() {
  var fixture = AKS_access002PortalRecipeFixture_();
  fixture.values.AKS_ACCESS00205_ATTENDANCE_EMAIL = "empty@example.com";
  assertThrows_(function () { fixture.recipe.preflight(); },
    "ACCESS_PORTAL_RECIPE_IDENTITIES_DUPLICATED");
  assertEquals_("before", fixture.values.AKS_ACCESS_REGISTRY);
}
function AKS_testAccess002PortalRecipe_autoRestoresProjectionFailure_() {
  var fixture = AKS_access002PortalRecipeFixture_({ leakAnalytics: true });
  assertThrows_(function () { fixture.recipe.apply(); },
    "ACCESS_PORTAL_RECIPE_FORBIDDEN_DESTINATION");
  assertEquals_("before", fixture.values.AKS_ACCESS_REGISTRY);
  assertEquals_(undefined, fixture.values.AKS_ACCESS002_RECIPE_BACKUP);
}
function AKS_runAccess002PortalRecipeSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-05 — recette multi-profils", [
    { name: "précontrôle sans écriture", test: AKS_testAccess002PortalRecipe_preflightIsReadOnly_ },
    { name: "profils portail et Mes accès vérifiés", test: AKS_testAccess002PortalRecipe_verifiesMultipleProfiles_ },
    { name: "restauration exacte", test: AKS_testAccess002PortalRecipe_restoresExactInitialState_ },
    { name: "identités distinctes exigées", test: AKS_testAccess002PortalRecipe_rejectsDuplicateIdentities_ },
    { name: "échec de projection auto-restauré", test: AKS_testAccess002PortalRecipe_autoRestoresProjectionFailure_ }
  ]);
}
