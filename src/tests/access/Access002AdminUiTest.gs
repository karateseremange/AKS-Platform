function AKS_access002AdminUiFixture_(authorized) {
  var calls = [];
  var access = { assertAdministrativeCapability: function (capability) {
    calls.push("authorize:" + capability);
    if (!authorized) { var error = new Error("Refus"); error.code = "ACCESS_CAPABILITY_DENIED"; throw error; }
    return true;
  }};
  var projection = { listAccounts: function (query) {
    calls.push("list"); return { revision: "rev-1", totalCount: 0, resultCount: 0, accounts: [], query: query };
  }};
  var lifecycle = {
    createAccount: function () { calls.push("create"); return { changed: true }; },
    deactivateAccount: function () { calls.push("deactivate"); return { changed: true }; },
    reactivateAccount: function () { calls.push("reactivate"); return { changed: true }; }
  };
  var detail = {
    getAccountDetail: function () { calls.push("detail"); return { account: {} }; },
    previewAccountAccess: function () { calls.push("preview"); return { changed: false }; },
    saveAccountAccess: function () { calls.push("save-access"); return { changed: true }; }
  };
  return { calls: calls, controller: AKS_createAdminAccessAccountController_({
    accessService: access, projection: projection, lifecycle: lifecycle, detail: detail,
    baseUrlProvider: function () { return "https://example.test/exec"; }
  }) };
}

function AKS_testAccess002AdminUi_deniesRouteBeforeProjection_() {
  var fixture = AKS_access002AdminUiFixture_(false);
  assertThrows_(function () { fixture.controller.getViewModel({}); }, "ACCESS_CAPABILITY_DENIED");
  assertEquals_(JSON.stringify(["authorize:ACCESS_MANAGE"]), JSON.stringify(fixture.calls));
}

function AKS_testAccess002AdminUi_buildsProtectedViewModel_() {
  var fixture = AKS_access002AdminUiFixture_(true);
  var model = fixture.controller.getViewModel({ search: "alice" });
  assertEquals_("rev-1", model.projection.revision);
  assertEquals_("https://example.test/exec?app=access", model.navigation.accessTarget);
  assertTrue_(Object.isFrozen(model));
}

function AKS_testAccess002AdminUi_reauthorizesEveryCommand_() {
  var fixture = AKS_access002AdminUiFixture_(true);
  fixture.controller.createAccount({});
  fixture.controller.deactivateAccount({});
  fixture.controller.reactivateAccount({});
  assertEquals_(JSON.stringify([
    "authorize:ACCESS_MANAGE", "create", "authorize:ACCESS_MANAGE", "deactivate",
    "authorize:ACCESS_MANAGE", "reactivate"
  ]), JSON.stringify(fixture.calls));
}

function AKS_testAccess002AdminUi_reauthorizesDetailAndPreview_() {
  var fixture = AKS_access002AdminUiFixture_(true);
  fixture.controller.getAccountDetail("teacher@example.com");
  fixture.controller.previewAccountAccess({});
  fixture.controller.saveAccountAccess({});
  assertEquals_(JSON.stringify([
    "authorize:ACCESS_MANAGE", "detail", "authorize:ACCESS_MANAGE", "preview",
    "authorize:ACCESS_MANAGE", "save-access"
  ]), JSON.stringify(fixture.calls));
}

function AKS_testAccess002AdminUi_hidesUnauthorizedNavigation_() {
  var hidden = AKS.Admin.Navigation.getModel("https://example.test/exec", false);
  var visible = AKS.Admin.Navigation.getModel("https://example.test/exec", true);
  function ids(model) { var result = []; model.families.forEach(function (family) {
    family.destinations.forEach(function (destination) { result.push(destination.id); });
  }); return result; }
  assertEquals_(-1, ids(hidden).indexOf("admin.access"));
  assertTrue_(ids(visible).indexOf("admin.access") !== -1);
}

function AKS_testAccess002AdminUi_exposesSafeInteractiveStates_() {
  var html = AKS_includeAdminAccessAccountFile_("ui/admin/AccessAccountsClient");
  assertTrue_(html.indexOf("Aucun compte ne correspond aux critères") !== -1);
  assertTrue_(html.indexOf("window.confirm") !== -1);
  assertTrue_(html.indexOf("aria-busy") !== -1);
  assertTrue_(html.indexOf("expectedRevision") !== -1);
  assertTrue_(html.indexOf("clearAssignments") !== -1);
}

function AKS_runAccess002AdminUiSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-03 — interface d’administration", [
    { name: "route refusée avant projection", test: AKS_testAccess002AdminUi_deniesRouteBeforeProjection_ },
    { name: "modèle protégé", test: AKS_testAccess002AdminUi_buildsProtectedViewModel_ },
    { name: "commandes réautorisées", test: AKS_testAccess002AdminUi_reauthorizesEveryCommand_ },
    { name: "fiche et prévisualisation réautorisées", test: AKS_testAccess002AdminUi_reauthorizesDetailAndPreview_ },
    { name: "navigation conditionnelle", test: AKS_testAccess002AdminUi_hidesUnauthorizedNavigation_ },
    { name: "états interactifs sûrs", test: AKS_testAccess002AdminUi_exposesSafeInteractiveStates_ }
  ]);
}
