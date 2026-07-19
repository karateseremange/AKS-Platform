/**
 * ADMIN-001 automated tests.
 */
function AKS_testAdminDashboard_authorizesConfiguredAdministrator() {
  assertTrue_(
    AKS.Admin.Access.isAuthorizedEmail("karate.seremange@gmail.com"),
    "The configured administrator must be authorized."
  );
}

function AKS_testAdminDashboard_rejectsUnknownAdministrator() {
  assertThrows_(function () {
    AKS.Admin.Access.assertAuthorized("unknown@example.com");
  }, "ADMIN001_ACCESS_DENIED");
}

function AKS_testAdminDashboard_buildsDeclarativeViewModel() {
  var releaseInfo = AKS.Version.getReleaseInfo();
  var viewModel = AKS.Admin.Dashboard.buildViewModelForAuthorizedUser(
    "karate.seremange@gmail.com"
  );

  assertEquals_("AKS Platform", viewModel.platform.name);
  assertEquals_(releaseInfo.version, viewModel.platform.version);
  assertEquals_(releaseInfo.codename, viewModel.platform.codename);
  assertEquals_("karate.seremange@gmail.com", viewModel.administrator.email);
  assertEquals_(0, viewModel.actions.length);
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
}
