var AKS = AKS || {};

function AKS_assertAdmin005_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function AKS_createAdmin005Provider_(providerId, widgetsFactory) {
  return {
    getProviderId: function () {
      return providerId;
    },
    getProviderMetadata: function () {
      return {
        providerId: providerId,
        moduleId: "AKS_TEST",
        label: "Fournisseur de conformité",
        contractVersion: "1.0",
        providerVersion: "1.0.0",
        enabled: true
      };
    },
    getWidgets: widgetsFactory
  };
}

function AKS_createAdmin005Widget_(providerId, widgetId, priority) {
  return {
    widgetId: widgetId,
    providerId: providerId,
    type: "information",
    zone: "modules",
    title: "Carte " + widgetId,
    state: "available",
    priority: priority,
    content: {
      label: "Contenu autorisé"
    }
  };
}

function AKS_createAdmin005Api_(registry, loggerApi, currentUser) {
  return AKS_createDashboardApi_(
    {
      assertCurrentUserAuthorized: function () {
        return currentUser || "admin@example.com";
      }
    },
    null,
    null,
    loggerApi || {
      info: function () {},
      warn: function () {},
      error: function () {}
    },
    registry
  );
}

function AKS_testAdmin005AcceptsAuthorizedAccess_() {
  var registry = AKS_createDashboardProviderRegistry_(
    AKS.Core.DashboardContract
  );
  var model = AKS_createAdmin005Api_(
    registry,
    null,
    "authorized@example.com"
  ).getDashboard();

  AKS_assertAdmin005_(
    model.context.currentUser === "authorized@example.com",
    "Le Centre de pilotage doit conserver le contexte autorisé côté serveur."
  );
}

function AKS_testAdmin005RejectsUnauthorizedAccess_() {
  var deniedError = new Error("Accès refusé.");
  deniedError.code = "ADMIN001_ACCESS_DENIED";
  var api = AKS_createDashboardApi_(
    {
      assertCurrentUserAuthorized: function () {
        throw deniedError;
      }
    },
    null,
    null,
    null,
    AKS_createDashboardProviderRegistry_(AKS.Core.DashboardContract)
  );
  var receivedCode = null;

  try {
    api.getDashboard();
  } catch (error) {
    receivedCode = error.code;
  }

  AKS_assertAdmin005_(
    receivedCode === "ADMIN001_ACCESS_DENIED",
    "Un accès non autorisé doit être refusé avant tout chargement."
  );
}

function AKS_testAdmin005SupportsZeroProviders_() {
  var registry = AKS_createDashboardProviderRegistry_(
    AKS.Core.DashboardContract
  );
  var model = AKS_createAdmin005Api_(registry).getDashboard();

  AKS_assertAdmin005_(
    model.widgets.length === 0 &&
      model.zones.header.length === 0 &&
      model.zones.summary.length === 0 &&
      model.zones.modules.length === 0 &&
      model.zones.quickActions.length === 0,
    "Zéro fournisseur doit produire un Centre de pilotage vide et utilisable."
  );
}

function AKS_testAdmin005SupportsMultipleProvidersAndWidgets_() {
  var registry = AKS_createDashboardProviderRegistry_(
    AKS.Core.DashboardContract
  );

  registry.register(AKS_createAdmin005Provider_(
    "aks.test.first",
    function () {
      return [
        AKS_createAdmin005Widget_("aks.test.first", "first.2", 20),
        AKS_createAdmin005Widget_("aks.test.first", "first.1", 10)
      ];
    }
  ));
  registry.register(AKS_createAdmin005Provider_(
    "aks.test.second",
    function () {
      return [
        AKS_createAdmin005Widget_("aks.test.second", "second.1", 15)
      ];
    }
  ));

  var model = AKS_createAdmin005Api_(registry).getDashboard();

  AKS_assertAdmin005_(
    model.zones.modules.map(function (widget) {
      return widget.widgetId;
    }).join(",") === "first.1,second.1,first.2",
    "Plusieurs fournisseurs et widgets doivent être composés dans un ordre stable."
  );
}

function AKS_testAdmin005FiltersUnauthorizedDataServerSide_() {
  var registry = AKS_createDashboardProviderRegistry_(
    AKS.Core.DashboardContract
  );

  registry.register(AKS_createAdmin005Provider_(
    "aks.test.restricted",
    function (context) {
      return context.currentUser === "allowed@example.com"
        ? [AKS_createAdmin005Widget_(
          "aks.test.restricted",
          "restricted.data",
          10
        )]
        : [];
    }
  ));

  var model = AKS_createAdmin005Api_(
    registry,
    null,
    "other@example.com"
  ).getDashboard();

  AKS_assertAdmin005_(
    model.widgets.length === 0,
    "Une donnée non autorisée ne doit jamais être transmise au client."
  );
}

function AKS_testAdmin005IsolatesAndLogsProviderFailure_() {
  var registry = AKS_createDashboardProviderRegistry_(
    AKS.Core.DashboardContract
  );
  var loggedContext = null;

  registry.register(AKS_createAdmin005Provider_(
    "aks.test.failure",
    function () {
      var error = new Error("secret technique à ne pas journaliser");
      error.code = "ADMIN005_TEST_FAILURE";
      throw error;
    }
  ));
  registry.register(AKS_createAdmin005Provider_(
    "aks.test.available",
    function () {
      return [
        AKS_createAdmin005Widget_(
          "aks.test.available",
          "available.widget",
          10
        )
      ];
    }
  ));

  var model = AKS_createAdmin005Api_(registry, {
    info: function () {},
    warn: function () {},
    error: function (message, context) {
      loggedContext = {
        message: message,
        context: context
      };
    }
  }).getDashboard();

  AKS_assertAdmin005_(
    model.widgets.length === 1 &&
      model.widgets[0].widgetId === "available.widget",
    "L'échec d'un fournisseur ne doit pas masquer les autres widgets."
  );
  AKS_assertAdmin005_(
    loggedContext &&
      loggedContext.context.providerId === "aks.test.failure" &&
      loggedContext.context.code === "ADMIN005_TEST_FAILURE" &&
      JSON.stringify(loggedContext).indexOf("secret technique") === -1,
    "L'échec doit être journalisé avec sa source, sans détail sensible."
  );
}

function AKS_testAdmin005RejectsInvalidContractWithoutGlobalFailure_() {
  var registry = AKS_createDashboardProviderRegistry_(
    AKS.Core.DashboardContract
  );
  var loggedCode = null;

  registry.register(AKS_createAdmin005Provider_(
    "aks.test.invalid-widget",
    function () {
      return [{
        widgetId: "invalid.widget",
        providerId: "aks.test.invalid-widget",
        type: "unsupported",
        zone: "modules",
        title: "Widget invalide",
        state: "available",
        priority: 10,
        content: {}
      }];
    }
  ));

  var model = AKS_createAdmin005Api_(registry, {
    info: function () {},
    warn: function () {},
    error: function (message, context) {
      loggedCode = context.code;
    }
  }).getDashboard();

  AKS_assertAdmin005_(
    model.widgets.length === 0 &&
      loggedCode === "ADMIN004_INVALID_WIDGET",
    "Un contrat invalide doit être refusé explicitement sans échec global."
  );
}

function AKS_testAdmin005ExposesNoFictitiousDestination_() {
  var model = AKS.Admin.Navigation.getModel("https://example.test/app");
  var destinationIds = [];

  model.families.forEach(function (family) {
    family.destinations.forEach(function (destination) {
      destinationIds.push(destination.id);
    });
  });

  AKS_assertAdmin005_(
    destinationIds.join(",") === "module.health-questionnaire",
    "La recette ne doit exposer aucune capacité ou destination fictive."
  );
}
