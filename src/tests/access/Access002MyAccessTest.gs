function AKS_access002MyAccessFixture_(snapshot) {
  return AKS_createAccessMyAccessService_({
    accessService: { getEffectiveAccessSnapshot: function () {
      return JSON.parse(JSON.stringify(snapshot));
    }}
  });
}

function AKS_testAccess002MyAccess_returnsEffectiveProjection_() {
  var result = AKS_access002MyAccessFixture_({
    email: "teacher@example.com", roles: ["PROFESSEUR"], bootstrap: false,
    assignments: [{ module: "ATTENDANCE", season: "2026-2027", section: "ENFANTS",
      courseCode: "BABY", validFrom: "", validUntil: "",
      capabilities: ["ATTENDANCE_READ", "COURSE_LIST"] }]
  }).getMyAccess();
  assertEquals_("teacher@example.com", result.identity.email);
  assertEquals_("AUTHORIZED", result.state);
  assertEquals_("BABY", result.assignments[0].courseCode);
  assertEquals_(undefined, result.registry);
}

function AKS_testAccess002MyAccess_returnsNeutralEmptyState_() {
  var result = AKS_access002MyAccessFixture_({
    email: "empty@example.com", roles: ["CONSULTATION"], assignments: [], bootstrap: false
  }).getMyAccess();
  assertEquals_("NO_ACCESS", result.state);
  assertEquals_("Aucun accès n’est actuellement attribué à votre compte.", result.message);
}

function AKS_testAccess002MyAccess_rejectsBootstrapIdentity_() {
  assertThrows_(function () {
    AKS_access002MyAccessFixture_({
      email: "legacy@example.com", roles: [], assignments: [], bootstrap: true
    }).getMyAccess();
  }, "ACCESS_MY_ACCESS_UNAVAILABLE");
}

function AKS_testAccess002MyAccess_returnsDeeplyImmutableView_() {
  var result = AKS_access002MyAccessFixture_({
    email: "reader@example.com", roles: ["CONSULTATION"], bootstrap: false,
    assignments: [{ module: "ANALYTICS", season: "*", section: "", courseCode: "",
      validFrom: "", validUntil: "", capabilities: ["ANALYTICS_READ"] }]
  }).getMyAccess();
  assertTrue_(Object.isFrozen(result));
  assertTrue_(Object.isFrozen(result.assignments));
  assertTrue_(Object.isFrozen(result.assignments[0].capabilities));
}

function AKS_testAccess002MyAccess_controllerBuildsPersonalModel_() {
  var controller = AKS_createMyAccessController_({
    service: { getMyAccess: function () { return {
      identity: { email: "me@example.com" }, roles: [], state: "NO_ACCESS",
      message: "Aucun accès", assignments: []
    }; }},
    baseUrlProvider: function () { return "https://example.test/exec"; }
  });
  var model = controller.getViewModel();
  assertEquals_("me@example.com", model.identity.email);
  assertEquals_("https://example.test/exec?app=admin", model.navigation.homeTarget);
}

function AKS_testAccess002MyAccess_publicApiAcceptsNoTargetIdentity_() {
  assertEquals_(0, AKS_getMyAccess.length);
  assertEquals_(-1, AKS_getMyAccess.toString().indexOf("accountId"));
}

function AKS_testAccess002MyAccess_exposesReadOnlyRouteAndView_() {
  assertTrue_(doGet.toString().indexOf('app === "my-access"') !== -1);
  var html = AKS_includeMyAccessFile_("ui/admin/MyAccess");
  assertTrue_(html.indexOf("Mes accès") !== -1);
  assertTrue_(html.indexOf("Habilitations effectives") !== -1);
  assertEquals_(-1, html.indexOf("Enregistrer"));
  assertEquals_(-1, html.indexOf("Modifier"));
}

function AKS_testAccess002MyAccess_deniedViewLeaksNoIdentity_() {
  var model = AKS_createMyAccessDeniedViewModel_();
  assertEquals_("DENIED", model.state);
  assertEquals_("", model.identity.email);
  assertEquals_(0, model.assignments.length);
  assertTrue_(Object.isFrozen(model) && Object.isFrozen(model.identity));
}

function AKS_runAccess002MyAccessSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-05 — Mes accès", [
    { name: "projection effective", test: AKS_testAccess002MyAccess_returnsEffectiveProjection_ },
    { name: "état vide neutre", test: AKS_testAccess002MyAccess_returnsNeutralEmptyState_ },
    { name: "bootstrap refusé", test: AKS_testAccess002MyAccess_rejectsBootstrapIdentity_ },
    { name: "vue immuable", test: AKS_testAccess002MyAccess_returnsDeeplyImmutableView_ },
    { name: "contrôleur personnel", test: AKS_testAccess002MyAccess_controllerBuildsPersonalModel_ },
    { name: "API sans identité cible", test: AKS_testAccess002MyAccess_publicApiAcceptsNoTargetIdentity_ },
    { name: "route en lecture seule", test: AKS_testAccess002MyAccess_exposesReadOnlyRouteAndView_ }
    ,{ name: "refus générique minimisé", test: AKS_testAccess002MyAccess_deniedViewLeaksNoIdentity_ }
  ]);
}
