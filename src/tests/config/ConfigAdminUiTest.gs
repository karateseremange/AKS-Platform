function AKS_createConfig001AdminUiFixture_(options) {
  options = options || {};
  var registry = options.registry || AKS_createPlatformParameterRegistry_();
  var store = AKS_createParameterValueStore_(
    AKS_createConfig001MemoryProperties_(),
    AKS_createConfig001MemoryLock_()
  );
  var service = AKS_createConfigurationService_(
    registry,
    store,
    function () { return new Date("2026-07-25T10:00:00.000Z"); }
  );
  var access = {
    assertCurrentUserAuthorized: function () {
      if (options.denied) {
        var error = new Error("Accès refusé.");
        error.code = "ADMIN001_ACCESS_DENIED";
        throw error;
      }
      return options.email || "admin@example.com";
    }
  };

  return {
    registry: registry,
    store: store,
    service: service,
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
  assertEquals_("https://example.test/app?app=admin", model.navigation.homeTarget);
  assertEquals_(
    "https://example.test/app?app=config",
    model.navigation.configurationTarget
  );
  assertEquals_(10, model.parameters.length);
  var retention = model.parameters.filter(function (parameter) {
    return parameter.key === "logging.retentionDays";
  })[0];
  assertEquals_(90, retention.value);
  assertEquals_("integer", retention.type);
  assertEquals_(true, retention.administrable);
  var analyticsRoot = model.parameters.filter(function (parameter) {
    return parameter.key === "analytics.driveRootFolderId";
  })[0];
  assertEquals_("resourceId", analyticsRoot.type);
  assertEquals_(true, analyticsRoot.administrable);
  assertTrue_(Object.isFrozen(model));
  assertTrue_(Object.isFrozen(model.parameters));
}

function AKS_testConfig001AdminUi_rejectsUnauthorizedUser_() {
  var fixture = AKS_createConfig001AdminUiFixture_({ denied: true });

  assertThrows_(function () {
    fixture.controller.getViewModel();
  }, "ADMIN001_ACCESS_DENIED");
  assertThrows_(function () {
    fixture.controller.save("club.name", "Club interdit");
  }, "ADMIN001_ACCESS_DENIED");
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
  assertEquals_(
    "CONFIG001_REQUIRED_PARAMETER_MISSING",
    model.parameters[0].errorCode
  );
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
  assertEquals_(
    "president@karate-seremange.fr",
    fixture.store.metadata("club.name").updatedBy
  );
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
  assertEquals_(
    "https://example.test/app?app=config",
    administration.destinations[0].target
  );
  assertEquals_("admin.logs", administration.destinations[1].id);
  assertEquals_(
    "https://example.test/app?app=logs",
    administration.destinations[1].target
  );
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
  var fixture = AKS_createConfig001AdminUiFixture_({
    registry: registry
  });
  var model = fixture.controller.getViewModel();

  assertEquals_(null, model.parameters[0].value);
  assertEquals_(true, model.parameters[0].sensitive);
  assertThrows_(function () {
    fixture.controller.save("integration.reference", "replacement");
  }, "CONFIG001_SENSITIVE_WRITE_FORBIDDEN");
}
