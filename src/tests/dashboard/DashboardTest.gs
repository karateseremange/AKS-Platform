var AKS = AKS || {};

function AKS_assertDashboard001_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function AKS_assertDashboard001ErrorCode_(callback, expectedCode, message) {
  var thrownError = null;

  try {
    callback();
  } catch (error) {
    thrownError = error;
  }

  AKS_assertDashboard001_(
    thrownError !== null,
    message + " Aucune erreur n'a été levée."
  );
  AKS_assertDashboard001_(
    thrownError.code === expectedCode,
    message + " Code reçu : " + String(thrownError.code)
  );
}

function AKS_createDashboard001AuthorizedAccessStub_() {
  return {
    assertCurrentUserAuthorized: function () {
      return "admin@example.com";
    }
  };
}

function AKS_createDashboard001NominalApi_() {
  return AKS_createDashboardApi_(
    AKS_createDashboard001AuthorizedAccessStub_(),
    {
      getReleaseInfo: function () {
        return {
          version: "1.1.0",
          build: "build-001",
          releaseName: "Release V1.1"
        };
      }
    },
    {
      getAuthorizedAdminEmails: function () {
        return ["admin@example.com", "second@example.com"];
      }
    },
    {
      info: function () {},
      warn: function () {},
      error: function () {}
    }
  );
}

function AKS_testDashboard001ApiExists_() {
  AKS_assertDashboard001_(
    AKS.Admin && typeof AKS.Admin.getDashboard === "function",
    "AKS.Admin.getDashboard doit être une fonction."
  );
  AKS_assertDashboard001_(
    AKS.Admin.DashboardModel && typeof AKS.Admin.DashboardModel === "object",
    "AKS.Admin.DashboardModel doit exister."
  );
  AKS_assertDashboard001_(
    Object.isFrozen(AKS.Admin.DashboardModel),
    "L'API publique AKS.Admin.DashboardModel doit être figée."
  );
}

function AKS_testDashboard001BuildsNominalModel_() {
  var model = AKS_createDashboard001NominalApi_().getDashboard();

  AKS_assertDashboard001_(
    model.application.name === "AKS Platform",
    "Le nom de l'application est incorrect."
  );
  AKS_assertDashboard001_(
    model.version.version === "1.1.0" &&
      model.version.build === "build-001" &&
      model.version.releaseName === "Release V1.1",
    "Les métadonnées de version sont incorrectes."
  );
  AKS_assertDashboard001_(
    model.configuration.administrators === 2,
    "Le nombre d'administrateurs est incorrect."
  );
  AKS_assertDashboard001_(
    model.logger.apiAvailable === true,
    "L'API Logger doit être déclarée disponible."
  );
  AKS_assertDashboard001_(
    model.zones.summary.length === 3,
    "Les trois cartes de synthèse nominales doivent être disponibles."
  );
  AKS_assertDashboard001_(
    !Object.prototype.hasOwnProperty.call(model, "status"),
    "Le modèle ne doit pas déduire un état global."
  );
}

function AKS_testDashboard001PropagatesAccessDenied_() {
  var accessError = new Error("Accès refusé.");
  accessError.code = "ADMIN001_ACCESS_DENIED";
  var dashboardApi = AKS_createDashboardApi_(
    {
      assertCurrentUserAuthorized: function () {
        throw accessError;
      }
    },
    null,
    null,
    null
  );

  AKS_assertDashboard001ErrorCode_(function () {
    dashboardApi.getDashboard();
  }, "ADMIN001_ACCESS_DENIED", "Le refus d'accès doit être propagé.");
}

function AKS_testDashboard001FailsClosedWithoutAccessApi_() {
  var dashboardApi = AKS_createDashboardApi_(null, null, null, null);

  AKS_assertDashboard001ErrorCode_(function () {
    dashboardApi.getDashboard();
  }, "DASHBOARD001_ADMIN_ACCESS_UNAVAILABLE", "Une API d'accès absente doit provoquer un refus fermé.");
}

function AKS_testDashboard001ReturnsPartialModelWithoutVersion_() {
  var dashboardApi = AKS_createDashboardApi_(
    AKS_createDashboard001AuthorizedAccessStub_(),
    {
      getReleaseInfo: function () {
        throw new Error("Version indisponible.");
      }
    },
    {
      getAuthorizedAdminEmails: function () {
        return ["admin@example.com"];
      }
    },
    {
      info: function () {},
      warn: function () {},
      error: function () {}
    }
  );
  var model = dashboardApi.getDashboard();

  AKS_assertDashboard001_(model.version === null, "La version indisponible doit être représentée par null.");
  AKS_assertDashboard001_(
    model.widgets.some(function (widget) {
      return widget.widgetId === "core.version" &&
        widget.state === "unavailable";
    }),
    "La carte version doit porter son propre état indisponible."
  );
}

function AKS_testDashboard001ReturnsPartialModelWithoutConfiguration_() {
  var dashboardApi = AKS_createDashboardApi_(
    AKS_createDashboard001AuthorizedAccessStub_(),
    {
      getReleaseInfo: function () {
        return {
          version: "1.1.0",
          build: "build-001",
          releaseName: "Release V1.1"
        };
      }
    },
    {
      getAuthorizedAdminEmails: function () {
        throw new Error("Configuration indisponible.");
      }
    },
    {
      info: function () {},
      warn: function () {},
      error: function () {}
    }
  );
  var model = dashboardApi.getDashboard();

  AKS_assertDashboard001_(model.configuration === null, "La configuration indisponible doit être représentée par null.");
  AKS_assertDashboard001_(
    model.widgets.some(function (widget) {
      return widget.widgetId === "core.configuration" &&
        widget.state === "unavailable";
    }),
    "La carte configuration doit porter son propre état indisponible."
  );
}

function AKS_testDashboard001DetectsIncompleteLoggerApi_() {
  var dashboardApi = AKS_createDashboardApi_(
    AKS_createDashboard001AuthorizedAccessStub_(),
    {
      getReleaseInfo: function () {
        return {
          version: "1.1.0",
          build: "build-001",
          releaseName: "Release V1.1"
        };
      }
    },
    {
      getAuthorizedAdminEmails: function () {
        return ["admin@example.com"];
      }
    },
    {
      info: function () {},
      warn: function () {}
    }
  );
  var model = dashboardApi.getDashboard();

  AKS_assertDashboard001_(model.logger.apiAvailable === false, "Une API Logger incomplète doit être déclarée indisponible.");
  AKS_assertDashboard001_(
    model.widgets.some(function (widget) {
      return widget.widgetId === "core.logger" &&
        widget.state === "unavailable";
    }),
    "La carte Logger doit porter son propre état indisponible."
  );
}

function AKS_testDashboard001ModelIsDeeplyImmutable_() {
  var model = AKS_createDashboard001NominalApi_().getDashboard();

  AKS_assertDashboard001_(Object.isFrozen(model), "Le modèle racine doit être figé.");
  AKS_assertDashboard001_(Object.isFrozen(model.application), "application doit être figé.");
  AKS_assertDashboard001_(Object.isFrozen(model.version), "version doit être figé.");
  AKS_assertDashboard001_(Object.isFrozen(model.configuration), "configuration doit être figée.");
  AKS_assertDashboard001_(Object.isFrozen(model.logger), "logger doit être figé.");
  AKS_assertDashboard001_(Object.isFrozen(model.zones), "zones doit être figé.");
  AKS_assertDashboard001_(Object.isFrozen(model.zones.summary), "zones.summary doit être figé.");

  model.zones.summary.length = 0;
  AKS_assertDashboard001_(
    model.zones.summary.length === 3,
    "Une tentative de modification profonde ne doit pas altérer le modèle."
  );
}

function AKS_testDashboard001ReturnsDefensiveCopies_() {
  var dashboardApi = AKS_createDashboard001NominalApi_();
  var firstModel = dashboardApi.getDashboard();
  var secondModel = dashboardApi.getDashboard();

  AKS_assertDashboard001_(firstModel !== secondModel, "Chaque appel doit retourner une nouvelle instance racine.");
  AKS_assertDashboard001_(firstModel.application !== secondModel.application, "application ne doit pas être partagé.");
  AKS_assertDashboard001_(firstModel.version !== secondModel.version, "version ne doit pas être partagé.");
  AKS_assertDashboard001_(firstModel.configuration !== secondModel.configuration, "configuration ne doit pas être partagée.");
  AKS_assertDashboard001_(firstModel.logger !== secondModel.logger, "logger ne doit pas être partagé.");
  AKS_assertDashboard001_(firstModel.zones !== secondModel.zones, "zones ne doit pas être partagé.");
  AKS_assertDashboard001_(firstModel.zones.summary !== secondModel.zones.summary, "zones.summary ne doit pas être partagé.");
  AKS_assertDashboard001_(
    JSON.stringify(firstModel) === JSON.stringify(secondModel),
    "Les copies successives doivent contenir les mêmes données."
  );
}
