/**
 * ADMIN-001 automated tests.
 */
function AKS_testAdminDashboard_authorizesConfiguredAdministrator() {
  assertTrue_(
    AKS.Admin.Access.isAuthorizedEmail("  KARATE.SEREMANGE@GMAIL.COM  "),
    "The configured administrator must be authorized after normalization."
  );
}

function AKS_testAdminDashboard_rejectsUnknownAdministrator() {
  assertThrows_(function () {
    AKS.Admin.Access.assertAuthorized("unknown@example.com");
  }, "ADMIN001_ACCESS_DENIED");
}

function AKS_testAdminDashboard_rejectsEmptyInjectedAuthorizationList() {
  assertThrows_(function () {
    AKS.Admin.Access.assertAuthorized("karate.seremange@gmail.com", []);
  }, "ADMIN001_ACCESS_DENIED");
}

function AKS_testAdminDashboard_buildsDeclarativeViewModel() {
  var releaseInfo = AKS.Version.getReleaseInfo();
  var viewModel = AKS.Admin.Dashboard.buildViewModelForAuthorizedUser(
    "karate.seremange@gmail.com",
    "https://example.test/app"
  );

  assertEquals_("AKS Platform", viewModel.platform.name);
  assertEquals_(releaseInfo.version, viewModel.platform.version);
  assertEquals_(releaseInfo.releaseName, viewModel.platform.releaseName);
  assertEquals_("karate.seremange@gmail.com", viewModel.administrator.email);
  assertEquals_(4, viewModel.actions.length);
  assertEquals_(
    "admin.config",
    viewModel.actions[0].id
  );
  assertEquals_(
    "admin.logs",
    viewModel.actions[1].id
  );
  assertEquals_(
    "module.analytics",
    viewModel.actions[2].id
  );
  assertEquals_(
    "module.health-questionnaire",
    viewModel.actions[3].id
  );
  assertTrue_(
    viewModel.navigation.families.length === 2 &&
      viewModel.navigation.families[0].id === "administration" &&
      viewModel.navigation.families[1].id === "modules",
    "The Dashboard must expose only navigation families with real destinations."
  );
}

function AKS_testAdminDashboard_doesNotExposeLegacyCodenameProperty() {
  var viewModel = AKS.Admin.Dashboard.buildViewModelForAuthorizedUser(
    "karate.seremange@gmail.com"
  );

  assertEquals_(undefined, viewModel.platform.codename);
  assertTrue_(
    typeof viewModel.platform.releaseName === "string" && viewModel.platform.releaseName.length > 0,
    "The Dashboard must expose the releaseName supplied by VERSION-001."
  );
}

function AKS_testAdminDashboard_keepsReleaseDataImmutable() {
  var viewModel = AKS.Admin.Dashboard.buildViewModelForAuthorizedUser(
    "karate.seremange@gmail.com"
  );

  assertTrue_(Object.isFrozen(viewModel), "The view model must be immutable.");
  assertTrue_(
    Object.isFrozen(viewModel.platform),
    "Platform presentation data must be immutable."
  );
  assertTrue_(
    Object.isFrozen(viewModel.actions),
    "Quick actions must be immutable."
  );
  assertTrue_(
    Object.isFrozen(viewModel.navigation),
    "The navigation model must be immutable."
  );
}
