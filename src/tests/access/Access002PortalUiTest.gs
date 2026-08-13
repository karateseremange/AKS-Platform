function AKS_access002PortalUiModel_(overrides) {
  overrides = overrides || {};
  return AKS_buildPortalDashboardViewModel_({
    identity: { email: overrides.email || "user@example.com" },
    state: overrides.state || "AUTHORIZED",
    legacyAdministrativeAccess: overrides.legacy === true,
    destinations: overrides.destinations || [{ id: "module.analytics", label: "Analytics",
      family: "modules", target: "https://example.test/exec?app=analytics",
      priority: 20, transitional: false }]
  }, { version: "1.3.0", releaseName: "Test" }, "https://example.test/exec",
    overrides.logs || null);
}

function AKS_testAccess002PortalUi_addsMyAccessForEveryKnownAccount_() {
  var model = AKS_access002PortalUiModel_();
  assertEquals_("access.my-access", model.navigation.families[0].destinations[0].id);
  assertEquals_("https://example.test/exec?app=my-access",
    model.navigation.families[0].destinations[0].target);
}

function AKS_testAccess002PortalUi_keepsOnlyProjectedDestinations_() {
  var model = AKS_access002PortalUiModel_({ destinations: [{
    id: "admin.access", label: "Comptes et accès", family: "administration",
    target: "https://example.test/exec?app=access", priority: 10, transitional: false
  }] });
  var ids = model.actions.map(function (entry) { return entry.id; });
  assertTrue_(ids.indexOf("admin.access") !== -1);
  assertEquals_(-1, ids.indexOf("admin.logs"));
  assertEquals_(-1, ids.indexOf("module.analytics"));
}

function AKS_testAccess002PortalUi_returnsNeutralNoAccessState_() {
  var model = AKS_access002PortalUiModel_({ state: "NO_ACCESS", destinations: [] });
  assertEquals_("NO_ACCESS", model.state);
  assertEquals_("Aucun accès n’est actuellement attribué à votre compte.", model.emptyMessage);
  assertEquals_(1, model.actions.length);
}

function AKS_testAccess002PortalUi_hidesLogsOutsideLegacyAdministration_() {
  assertEquals_(null, AKS_access002PortalUiModel_({ legacy: false }).recentLogs);
  assertEquals_("event", AKS_access002PortalUiModel_({ legacy: true,
    logs: { available: true, events: ["event"] } }).recentLogs.events[0]);
}

function AKS_testAccess002PortalUi_modelIsDeeplyImmutable_() {
  var model = AKS_access002PortalUiModel_();
  assertTrue_(Object.isFrozen(model));
  assertTrue_(Object.isFrozen(model.navigation.families));
  assertTrue_(Object.isFrozen(model.navigation.families[0].destinations));
}

function AKS_testAccess002PortalUi_renamesDashboardWithoutChangingRoute_() {
  var html = AKS_includeAdminDashboardFile_("ui/admin/Dashboard");
  assertTrue_(html.indexOf("Portail AKS") !== -1);
  assertTrue_(html.indexOf("Compte connecté") !== -1);
  assertEquals_(-1, html.indexOf("Administration AKS Platform"));
  assertTrue_(doGet.toString().indexOf('app === "admin"') !== -1);
}

function AKS_testAccess002PortalUi_deniedViewLeaksNoIdentityOrLink_() {
  var model = AKS_buildDeniedPortalDashboardViewModel_(
    { version: "1.3.0", releaseName: "Test" });
  assertEquals_("DENIED", model.state);
  assertEquals_("", model.user.email);
  assertEquals_(0, model.navigation.families.length);
  assertEquals_(0, model.actions.length);
  assertEquals_(null, model.recentLogs);
  assertTrue_(Object.isFrozen(model));
}

function AKS_runAccess002PortalUiSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-05 — Portail AKS", [
    { name: "Mes accès toujours visible", test: AKS_testAccess002PortalUi_addsMyAccessForEveryKnownAccount_ },
    { name: "destinations projetées uniquement", test: AKS_testAccess002PortalUi_keepsOnlyProjectedDestinations_ },
    { name: "état neutre", test: AKS_testAccess002PortalUi_returnsNeutralNoAccessState_ },
    { name: "journaux historiques bornés", test: AKS_testAccess002PortalUi_hidesLogsOutsideLegacyAdministration_ },
    { name: "modèle immuable", test: AKS_testAccess002PortalUi_modelIsDeeplyImmutable_ },
    { name: "renommage et route stable", test: AKS_testAccess002PortalUi_renamesDashboardWithoutChangingRoute_ },
    { name: "refus générique sans fuite", test: AKS_testAccess002PortalUi_deniedViewLeaksNoIdentityOrLink_ }
  ]);
}
