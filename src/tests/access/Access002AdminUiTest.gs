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
  var history = { getAccountHistory: function () {
    calls.push("history"); return { entries: [], hasMore: false };
  }};
  var historyProvider = function () {
    calls.push("history-provider");
    if (authorized === "audit-denied") {
      throw new Error(
        "Exception: accès au document refusé (ligne 100, fichier AuditSheetsGateway)"
      );
    }
    return history;
  };
  return { calls: calls, controller: AKS_createAdminAccessAccountController_({
    accessService: access, projection: projection, lifecycle: lifecycle, detail: detail,
    historyProvider: historyProvider,
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
  fixture.controller.getAccountHistory("teacher@example.com", "");
  assertEquals_(JSON.stringify([
    "authorize:ACCESS_MANAGE", "detail", "authorize:ACCESS_MANAGE", "preview",
    "authorize:ACCESS_MANAGE", "save-access", "authorize:ACCESS_MANAGE",
    "history-provider", "history"
  ]), JSON.stringify(fixture.calls));
}

function AKS_testAccess002AdminUi_defersAndMinimizesAuditFailure_() {
  var listFixture = AKS_access002AdminUiFixture_(true);
  listFixture.controller.getViewModel({});
  assertEquals_(-1, listFixture.calls.indexOf("history-provider"));

  var auditFixture = AKS_access002AdminUiFixture_("audit-denied");
  var failure = null;
  try {
    auditFixture.controller.getAccountHistory("teacher@example.com", "");
  } catch (error) {
    failure = error;
  }
  assertTrue_(!!failure);
  assertEquals_("ACCESS_HISTORY_UNAVAILABLE", failure.code);
  assertEquals_(
    "L’historique des modifications est temporairement indisponible.",
    failure.message
  );
  assertEquals_(-1, failure.message.indexOf("AuditSheetsGateway"));
  assertEquals_(-1, failure.message.indexOf("ligne 100"));
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

function AKS_testAccess002AdminUi_exposesFiveAccessCards_() {
  var html = AKS_includeAdminAccessAccountFile_("ui/admin/AccessAccounts");
  var client = AKS_includeAdminAccessAccountFile_("ui/admin/AccessAccountsClient");
  ["ATTENDANCE", "ANALYTICS", "INSCRIPTIONS", "ADMINISTRATION", "ACCESS"]
    .forEach(function (module) {
      assertTrue_(html.indexOf('data-module="' + module + '"') !== -1);
    });
  assertTrue_(html.indexOf("<option>ADMINISTRATION</option>") !== -1);
  assertTrue_(html.indexOf("Configuration et journaux") !== -1);
  assertTrue_(client.indexOf('["ANALYTICS","ADMINISTRATION","ACCESS"].indexOf(module)') !== -1);
  assertTrue_(client.indexOf('["ANALYTICS","ADMINISTRATION","ACCESS"].indexOf(row.dataset.module)') !== -1);
  assertTrue_(html.indexOf("Rôles descriptifs") !== -1);
}

function AKS_testAccess002AdminUi_exposesFourAccessCards_() {
  AKS_testAccess002AdminUi_exposesFiveAccessCards_();
}

function AKS_testAccess002AdminUi_connectsProtectedDetailWorkflow_() {
  var client = AKS_includeAdminAccessAccountFile_("ui/admin/AccessAccountsClient");
  assertTrue_(client.indexOf("AKS_getAdminAccessAccountDetail") !== -1);
  assertTrue_(client.indexOf("AKS_previewAdminAccessAccount") !== -1);
  assertTrue_(client.indexOf("AKS_saveAdminAccessAccount") !== -1);
  assertTrue_(client.indexOf("Gérer les habilitations") !== -1);
}

function AKS_testAccess002AdminUi_exposesDatesCommentAndSummary_() {
  var html = AKS_includeAdminAccessAccountFile_("ui/admin/AccessAccounts");
  var client = AKS_includeAdminAccessAccountFile_("ui/admin/AccessAccountsClient");
  assertTrue_(html.indexOf('maxlength="500"') !== -1);
  assertTrue_(client.indexOf('type=\\"date\\"') !== -1);
  assertTrue_(client.indexOf("rolesAdded") !== -1);
  assertTrue_(client.indexOf("assignmentsRemoved") !== -1);
}

function AKS_testAccess002AdminUi_keepsInactiveDetailReadOnly_() {
  var client = AKS_includeAdminAccessAccountFile_("ui/admin/AccessAccountsClient");
  assertTrue_(client.indexOf("!currentDetail.account.editable") !== -1);
  assertTrue_(client.indexOf("document.getElementById(\"access-preview\").disabled") !== -1);
}

function AKS_testAccess002AdminUi_escapesAttributesAndConfirmsSave_() {
  var client = AKS_includeAdminAccessAccountFile_("ui/admin/AccessAccountsClient");
  assertTrue_(client.indexOf("&quot;") !== -1);
  assertTrue_(client.indexOf("attr(a.courseCode)") !== -1);
  assertTrue_(client.indexOf("window.confirm") !== -1);
  assertTrue_(client.indexOf("confirmSensitive=true") !== -1);
}

function AKS_testAccess002AdminUi_keepsCheckboxesCompactAndManageUnique_() {
  var style = AKS_includeAdminAccessAccountFile_("ui/admin/AccessAccountsStyle");
  var client = AKS_includeAdminAccessAccountFile_("ui/admin/AccessAccountsClient");
  assertTrue_(style.indexOf('input[type="checkbox"]') !== -1);
  assertTrue_(style.indexOf('input:not([type="checkbox"])') !== -1);
  assertTrue_(client.indexOf('module==="ACCESS"&&existing') !== -1);
}

function AKS_testAccess002AdminUi_exposesMinimizedPaginatedHistory_() {
  var html = AKS_includeAdminAccessAccountFile_("ui/admin/AccessAccounts");
  var client = AKS_includeAdminAccessAccountFile_("ui/admin/AccessAccountsClient");
  assertTrue_(html.indexOf("Historique des modifications") !== -1);
  assertTrue_(client.indexOf("AKS_getAdminAccessAccountHistory") !== -1);
  assertTrue_(client.indexOf("historyCursor") !== -1);
  assertTrue_(client.indexOf("entry.comment") !== -1);
  assertEquals_(-1, client.indexOf("metadata_json"));
}

function AKS_testAccess002AdminUi_displaysHistoryFailureLocally_() {
  var html = AKS_includeAdminAccessAccountFile_("ui/admin/AccessAccounts");
  var client = AKS_includeAdminAccessAccountFile_("ui/admin/AccessAccountsClient");
  assertTrue_(html.indexOf('id="access-history-message"') !== -1);
  assertTrue_(html.indexOf('role="alert"') !== -1);
  assertTrue_(html.indexOf('aria-live="assertive"') !== -1);
  assertTrue_(client.indexOf("function failHistory(error)") !== -1);
  assertTrue_(client.indexOf("withFailureHandler(failHistory)") !== -1);
  assertTrue_(client.indexOf("historyMessage.focus()") !== -1);
}

function AKS_runAccess002AdminUiSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-03 — interface d’administration", [
    { name: "route refusée avant projection", test: AKS_testAccess002AdminUi_deniesRouteBeforeProjection_ },
    { name: "modèle protégé", test: AKS_testAccess002AdminUi_buildsProtectedViewModel_ },
    { name: "commandes réautorisées", test: AKS_testAccess002AdminUi_reauthorizesEveryCommand_ },
    { name: "fiche et prévisualisation réautorisées", test: AKS_testAccess002AdminUi_reauthorizesDetailAndPreview_ },
    { name: "AUDIT différé et erreur minimisée", test: AKS_testAccess002AdminUi_defersAndMinimizesAuditFailure_ },
    { name: "navigation conditionnelle", test: AKS_testAccess002AdminUi_hidesUnauthorizedNavigation_ },
    { name: "états interactifs sûrs", test: AKS_testAccess002AdminUi_exposesSafeInteractiveStates_ }
    ,{ name: "cinq cartes d'habilitations", test: AKS_testAccess002AdminUi_exposesFiveAccessCards_ }
    ,{ name: "workflow de fiche protégé", test: AKS_testAccess002AdminUi_connectsProtectedDetailWorkflow_ }
    ,{ name: "dates commentaire et synthèse", test: AKS_testAccess002AdminUi_exposesDatesCommentAndSummary_ }
    ,{ name: "fiche inactive en lecture seule", test: AKS_testAccess002AdminUi_keepsInactiveDetailReadOnly_ }
    ,{ name: "échappement et confirmation", test: AKS_testAccess002AdminUi_escapesAttributesAndConfirmsSave_ }
    ,{ name: "cases compactes et ACCESS unique", test: AKS_testAccess002AdminUi_keepsCheckboxesCompactAndManageUnique_ }
    ,{ name: "historique fonctionnel paginé", test: AKS_testAccess002AdminUi_exposesMinimizedPaginatedHistory_ }
    ,{ name: "erreur d’historique affichée localement", test: AKS_testAccess002AdminUi_displaysHistoryFailureLocally_ }
  ]);
}
