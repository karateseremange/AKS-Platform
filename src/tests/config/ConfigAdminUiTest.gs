function AKS_createConfig001AdminUiFixture_(options) {
  options = options || {};
  var registry = options.registry || AKS_createPlatformParameterRegistry_();
  var properties = AKS_createConfig001MemoryProperties_();
  var store = AKS_createParameterValueStore_(
    properties,
    AKS_createConfig001MemoryLock_()
  );
  var service = AKS_createConfigurationService_(
    registry,
    store,
    function () { return new Date("2026-07-25T10:00:00.000Z"); }
  );
  var calls = { assertions: [], identity: 0, snapshot: 0 };
  var settings = {
    email: options.email || "admin@example.com",
    capabilities: options.capabilities || [
      "CONFIG_READ", "CONFIG_WRITE", "CONFIG_RESET"
    ],
    bootstrap: options.bootstrap === true,
    denied: options.denied || {}
  };
  function has_(capability) {
    return settings.capabilities.indexOf(capability) !== -1;
  }
  var access = {
    getEffectiveAccessSnapshot: function () {
      calls.snapshot += 1;
      return {
        email: settings.email,
        roles: ["ADMINISTRATEUR"],
        bootstrap: settings.bootstrap,
        assignments: settings.bootstrap ? [] : [{
          module: "ADMINISTRATION",
          capabilities: settings.capabilities.slice()
        }]
      };
    },
    assertAdministrationCapability: function (capability) {
      calls.assertions.push(capability);
      if (settings.denied[capability] || !settings.bootstrap && !has_(capability)) {
        var failure = new Error("Paramétrage non autorisé.");
        failure.code = "ACCESS_CAPABILITY_DENIED";
        throw failure;
      }
      return true;
    },
    getCurrentIdentity: function () {
      calls.identity += 1;
      return settings.email;
    }
  };

  return {
    registry: registry,
    store: store,
    service: service,
    calls: calls,
    settings: settings,
    controller: AKS_createAdminConfigurationController_(
      access,
      service,
      function () { return "https://example.test/app"; }
    )
  };
}

function AKS_testConfig001AdminUi_buildsAuthorizedViewModel_() {
  var model = AKS_createConfig001AdminUiFixture_().controller.getViewModel();

  assertEquals_("admin@example.com", model.administrator.email);
  assertEquals_(true, model.permissions.read);
  assertEquals_(true, model.permissions.write);
  assertEquals_(true, model.permissions.reset);
  assertEquals_("https://example.test/app?app=admin", model.navigation.homeTarget);
  assertEquals_("https://example.test/app?app=config",
    model.navigation.configurationTarget);
  assertEquals_(16, model.parameters.length);
  var retention = model.parameters.filter(function (parameter) {
    return parameter.key === "logging.retentionDays";
  })[0];
  assertEquals_(90, retention.value);
  assertEquals_("integer", retention.type);
  assertEquals_(true, retention.administrable);
  assertTrue_(Object.isFrozen(model));
  assertTrue_(Object.isFrozen(model.permissions));
  assertTrue_(Object.isFrozen(model.parameters));
}

function AKS_testConfig001AdminUi_adaptsExplicitCapabilityCombinations_() {
  var readOnly = AKS_createConfig001AdminUiFixture_({
    capabilities: ["CONFIG_READ"]
  }).controller.getViewModel();
  assertEquals_(true, readOnly.permissions.read);
  assertEquals_(false, readOnly.permissions.write);
  assertEquals_(false, readOnly.permissions.reset);
  assertEquals_(16, readOnly.parameters.length);

  var writeWithoutRead = AKS_createConfig001AdminUiFixture_({
    capabilities: ["CONFIG_WRITE"]
  }).controller.getViewModel();
  assertEquals_(false, writeWithoutRead.permissions.read);
  assertEquals_(false, writeWithoutRead.permissions.write);
  assertEquals_(false, writeWithoutRead.permissions.reset);
  assertEquals_(0, writeWithoutRead.parameters.length);

  var resetWithoutWrite = AKS_createConfig001AdminUiFixture_({
    capabilities: ["CONFIG_READ", "CONFIG_RESET"]
  }).controller.getViewModel();
  assertEquals_(true, resetWithoutWrite.permissions.read);
  assertEquals_(false, resetWithoutWrite.permissions.write);
  assertEquals_(false, resetWithoutWrite.permissions.reset);
}

function AKS_testConfig001AdminUi_preservesBoundedBootstrapAccess_() {
  var model = AKS_createConfig001AdminUiFixture_({
    capabilities: [], bootstrap: true, email: "legacy@example.com"
  }).controller.getViewModel();
  assertEquals_("legacy@example.com", model.administrator.email);
  assertEquals_(true, model.permissions.read);
  assertEquals_(true, model.permissions.write);
  assertEquals_(true, model.permissions.reset);
}

function AKS_testConfig001AdminUi_rejectsRouteWithoutConfigCapability_() {
  var fixture = AKS_createConfig001AdminUiFixture_({ capabilities: [] });
  assertThrows_(function () {
    fixture.controller.getViewModel();
  }, "ACCESS_CAPABILITY_DENIED");
}

function AKS_testConfig001AdminUi_reauthorizesEveryMutation_() {
  var fixture = AKS_createConfig001AdminUiFixture_();
  fixture.controller.save("club.name", "AKS");
  fixture.controller.reset("club.name");
  assertEquals_(JSON.stringify([
    "CONFIG_READ", "CONFIG_WRITE",
    "CONFIG_READ", "CONFIG_WRITE", "CONFIG_RESET"
  ]), JSON.stringify(fixture.calls.assertions));
  assertEquals_(2, fixture.calls.identity);
}

function AKS_testConfig001AdminUi_stopsDeniedMutationBeforeStorage_() {
  var fixture = AKS_createConfig001AdminUiFixture_({
    denied: { CONFIG_WRITE: true }
  });
  assertThrows_(function () {
    fixture.controller.save("club.name", "Interdit");
  }, "ACCESS_CAPABILITY_DENIED");
  assertEquals_(null, fixture.store.metadata("club.name"));
  assertEquals_(0, fixture.calls.identity);
}

function AKS_testConfig001AdminUi_reportsInvalidRequiredParameter_() {
  var registry = AKS_createParameterRegistry_();
  registry.register({
    key: "platform.requiredValue",
    label: "Valeur obligatoire",
    type: "string",
    scope: "platform",
    required: true,
    administrable: true
  });
  var model = AKS_createConfig001AdminUiFixture_({
    registry: registry
  }).controller.getViewModel();

  assertEquals_(false, model.parameters[0].valid);
  assertEquals_("invalid", model.parameters[0].source);
  assertEquals_("CONFIG001_REQUIRED_PARAMETER_MISSING",
    model.parameters[0].errorCode);
}

function AKS_testConfig001AdminUi_marksReadOnlyParameter_() {
  var model = AKS_createConfig001AdminUiFixture_().controller.getViewModel();
  var language = model.parameters.filter(function (parameter) {
    return parameter.key === "platform.language";
  })[0];

  assertEquals_(false, language.administrable);
  assertEquals_("fr", language.value);
}

function AKS_testConfig001AdminUi_usesAuthenticatedActor_() {
  var fixture = AKS_createConfig001AdminUiFixture_({
    email: "president@karate-seremange.fr"
  });
  var result = fixture.controller.save("club.name", "AKS");

  assertEquals_(true, result.ok);
  assertEquals_("AKS", result.parameter.value);
  assertEquals_("president@karate-seremange.fr",
    fixture.store.metadata("club.name").updatedBy);
}

function AKS_testConfig001AdminUi_restoresDefault_() {
  var fixture = AKS_createConfig001AdminUiFixture_();
  fixture.controller.save("club.name", "Nom temporaire");

  var result = fixture.controller.reset("club.name");

  assertEquals_(true, result.ok);
  assertEquals_("Association Karaté Serémange", result.parameter.value);
  assertEquals_("default", result.parameter.source);
}

function AKS_testConfig001AdminUi_publishesNavigationDestination_() {
  var model = AKS.Admin.Navigation.getModel("https://example.test/app");
  var administration = model.families.filter(function (family) {
    return family.id === "administration";
  })[0];

  assertEquals_("admin.config", administration.destinations[0].id);
  assertEquals_("https://example.test/app?app=config",
    administration.destinations[0].target);
  assertEquals_("admin.logs", administration.destinations[1].id);
  assertEquals_("https://example.test/app?app=logs",
    administration.destinations[1].target);
}

function AKS_testConfig001AdminUi_masksSensitiveValue_() {
  var registry = AKS_createParameterRegistry_();
  registry.register({
    key: "integration.reference",
    label: "Référence d'intégration",
    type: "string",
    scope: "integration",
    sensitive: true,
    administrable: true,
    defaultValue: "internal-reference"
  });
  var fixture = AKS_createConfig001AdminUiFixture_({ registry: registry });
  var model = fixture.controller.getViewModel();

  assertEquals_(null, model.parameters[0].value);
  assertEquals_(true, model.parameters[0].sensitive);
  assertThrows_(function () {
    fixture.controller.save("integration.reference", "replacement");
  }, "CONFIG001_SENSITIVE_WRITE_FORBIDDEN");
}

function AKS_testConfig001AdminUi_viewAdaptsToServerPermissions_() {
  var source = AKS_getAdminConfigurationTemplateSource_("ui/admin/Configuration");
  assertEquals_(true, source.indexOf("viewModel.permissions.read") !== -1);
  assertEquals_(true, source.indexOf("viewModel.permissions.write") !== -1);
  assertEquals_(true, source.indexOf("viewModel.permissions.reset") !== -1);
  assertEquals_(true, source.indexOf("data-can-read") !== -1);
  assertEquals_(true, source.indexOf("data-can-write") !== -1);
  assertEquals_(true, source.indexOf("data-can-reset") !== -1);
}

function AKS_runConfigAdminUiSuite() {
  return AKS_runNamedTestSuite_("ACCESS-002-06 — Paramétrage", [
    { name: "modèle autorisé", test: AKS_testConfig001AdminUi_buildsAuthorizedViewModel_ },
    { name: "combinaisons explicites", test: AKS_testConfig001AdminUi_adaptsExplicitCapabilityCombinations_ },
    { name: "bootstrap historique borné", test: AKS_testConfig001AdminUi_preservesBoundedBootstrapAccess_ },
    { name: "route sans capacité refusée", test: AKS_testConfig001AdminUi_rejectsRouteWithoutConfigCapability_ },
    { name: "mutations réautorisées", test: AKS_testConfig001AdminUi_reauthorizesEveryMutation_ },
    { name: "refus avant stockage", test: AKS_testConfig001AdminUi_stopsDeniedMutationBeforeStorage_ },
    { name: "paramètre requis invalide", test: AKS_testConfig001AdminUi_reportsInvalidRequiredParameter_ },
    { name: "paramètre en lecture seule", test: AKS_testConfig001AdminUi_marksReadOnlyParameter_ },
    { name: "acteur authentifié", test: AKS_testConfig001AdminUi_usesAuthenticatedActor_ },
    { name: "restauration par défaut", test: AKS_testConfig001AdminUi_restoresDefault_ },
    { name: "navigation administrative", test: AKS_testConfig001AdminUi_publishesNavigationDestination_ },
    { name: "valeur sensible masquée", test: AKS_testConfig001AdminUi_masksSensitiveValue_ },
    { name: "vue adaptée aux permissions", test: AKS_testConfig001AdminUi_viewAdaptsToServerPermissions_ }
  ]);
}
