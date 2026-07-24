var AKS = AKS || {};

function AKS_createAdmin004Provider_(providerId, overrides) {
  overrides = overrides || {};
  return {
    getProviderId: function () {
      return providerId;
    },
    getProviderMetadata: function () {
      return {
        providerId: providerId,
        moduleId: overrides.moduleId || "TEST_MODULE",
        label: overrides.label || "Fournisseur de test",
        contractVersion: overrides.contractVersion || "1.0",
        providerVersion: overrides.providerVersion || "1.0.0",
        enabled: overrides.enabled !== undefined ? overrides.enabled : true
      };
    },
    getWidgets: function (context) {
      if (overrides.failure) {
        throw new Error("Échec simulé.");
      }
      return overrides.widgets || [{
        widgetId: providerId + ".widget",
        providerId: providerId,
        type: "information",
        zone: "summary",
        title: "Widget de test",
        state: "available",
        priority: 100,
        content: { correlationId: context.correlationId || null }
      }];
    }
  };
}

function AKS_testAdmin004PublicContractsExist_() {
  AKS_assertDashboard001_(
    AKS.Core.DashboardContract &&
      AKS.Core.DashboardContract.contractVersion === "1.0",
    "Le contrat public ADMIN-004 doit exister en version 1.0."
  );
  AKS_assertDashboard001_(
    AKS.Core.DashboardProviders &&
      typeof AKS.Core.DashboardProviders.register === "function",
    "Le registre public des DashboardProvider doit exister."
  );
}

function AKS_testAdmin004RegistersValidProvider_() {
  var registry = AKS_createDashboardProviderRegistry_(
    AKS.Core.DashboardContract
  );
  var provider = AKS_createAdmin004Provider_("aks.test.valid");
  registry.register(provider);

  AKS_assertDashboard001_(
    registry.get("aks.test.valid") === provider &&
      registry.listEnabled().length === 1,
    "Un fournisseur valide doit être enregistré et découvert."
  );
}

function AKS_testAdmin004RejectsDuplicateProvider_() {
  var registry = AKS_createDashboardProviderRegistry_(
    AKS.Core.DashboardContract
  );
  registry.register(AKS_createAdmin004Provider_("aks.test.duplicate"));

  AKS_assertDashboard001ErrorCode_(function () {
    registry.register(AKS_createAdmin004Provider_("aks.test.duplicate"));
  }, "ADMIN004_DUPLICATE_IDENTIFIER", "Un doublon doit être refusé.");
}

function AKS_testAdmin004RejectsUnsupportedContract_() {
  var registry = AKS_createDashboardProviderRegistry_(
    AKS.Core.DashboardContract
  );

  AKS_assertDashboard001ErrorCode_(function () {
    registry.register(AKS_createAdmin004Provider_(
      "aks.test.unsupported",
      { contractVersion: "2.0" }
    ));
  }, "ADMIN004_UNSUPPORTED_CONTRACT", "Un contrat incompatible doit être refusé.");
}

function AKS_testAdmin004ExcludesDisabledProvider_() {
  var registry = AKS_createDashboardProviderRegistry_(
    AKS.Core.DashboardContract
  );
  registry.register(AKS_createAdmin004Provider_(
    "aks.test.disabled",
    { enabled: false }
  ));

  AKS_assertDashboard001_(
    registry.list().length === 1 && registry.listEnabled().length === 0,
    "Un fournisseur désactivé ne doit pas être exposé comme actif."
  );
}

function AKS_testAdmin004RejectsExecutableWidgetContent_() {
  AKS_assertDashboard001ErrorCode_(function () {
    AKS.Core.DashboardContract.validateWidget({
      widgetId: "test.executable",
      providerId: "aks.test.executable",
      type: "information",
      zone: "summary",
      title: "Contenu invalide",
      state: "available",
      priority: 100,
      content: { execute: function () {} }
    }, "aks.test.executable");
  }, "ADMIN004_INVALID_WIDGET", "Un contenu exécutable doit être refusé.");
}

function AKS_testAdmin004AcceptsEmptyWidget_() {
  AKS.Core.DashboardContract.validateWidget({
    widgetId: "test.empty",
    providerId: "aks.test.states",
    type: "empty-state",
    zone: "modules",
    title: "Aucune donnée",
    state: "empty",
    priority: 100,
    content: {}
  }, "aks.test.states");
}

function AKS_testAdmin004AcceptsUnavailableWidget_() {
  AKS.Core.DashboardContract.validateWidget({
    widgetId: "test.unavailable",
    providerId: "aks.test.states",
    type: "status",
    zone: "modules",
    title: "Service indisponible",
    state: "unavailable",
    priority: 100,
    content: {}
  }, "aks.test.states");
}

function AKS_testAdmin004IsolatesProviderFailure_() {
  var registry = AKS_createDashboardProviderRegistry_(
    AKS.Core.DashboardContract
  );
  var loggedContext = null;
  registry.register(AKS_createAdmin004Provider_(
    "aks.test.failure",
    { failure: true }
  ));
  registry.register(AKS_createAdmin004Provider_("aks.test.success"));

  var api = AKS_createDashboardApi_(
    AKS_createDashboard001AuthorizedAccessStub_(),
    null,
    null,
    {
      info: function () {},
      warn: function () {},
      error: function (message, context) {
        loggedContext = context;
      }
    },
    registry
  );
  var model = api.getDashboard();

  AKS_assertDashboard001_(
    model.widgets.length === 1 &&
      model.widgets[0].providerId === "aks.test.success",
    "L'échec d'un fournisseur ne doit pas bloquer les autres."
  );
  AKS_assertDashboard001_(
    loggedContext && loggedContext.providerId === "aks.test.failure",
    "L'échec isolé doit être journalisé sans contenu de widget."
  );
}

function AKS_testAdmin004SortsWidgetsStably_() {
  var registry = AKS_createDashboardProviderRegistry_(
    AKS.Core.DashboardContract
  );
  registry.register(AKS_createAdmin004Provider_("aks.test.order", {
    widgets: [
      {
        widgetId: "widget.b",
        providerId: "aks.test.order",
        type: "information",
        zone: "summary",
        title: "B",
        state: "available",
        priority: 10,
        content: {}
      },
      {
        widgetId: "widget.a",
        providerId: "aks.test.order",
        type: "information",
        zone: "summary",
        title: "A",
        state: "available",
        priority: 10,
        content: {}
      }
    ]
  }));
  var model = AKS_createDashboardApi_(
    AKS_createDashboard001AuthorizedAccessStub_(),
    null,
    null,
    { info: function () {}, warn: function () {}, error: function () {} },
    registry
  ).getDashboard();

  AKS_assertDashboard001_(
    model.widgets[0].widgetId === "widget.a" &&
      model.widgets[1].widgetId === "widget.b",
    "L'ordre doit être stable à priorité égale."
  );
}
