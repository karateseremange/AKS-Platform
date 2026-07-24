var AKS = AKS || {};
AKS.Admin = AKS.Admin || {};

/**
 * Builds the public administration dashboard model API.
 *
 * The component only consumes public contracts supplied through dependency
 * injection. It aggregates as much information as possible while preserving
 * fail-closed behavior for administrative access control.
 *
 * @param {Object} adminAccessApi
 * @param {Object} versionApi
 * @param {Object} configApi
 * @param {Object} loggerApi
 * @returns {Object}
 */
function AKS_createDashboardApi_(
  adminAccessApi,
  versionApi,
  configApi,
  loggerApi,
  providerRegistry
) {
  function deepFreeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }

    Object.keys(value).forEach(function (propertyName) {
      deepFreeze_(value[propertyName]);
    });

    return Object.freeze(value);
  }

  function assertCurrentUserAuthorized_() {
    if (
      !adminAccessApi ||
      typeof adminAccessApi.assertCurrentUserAuthorized !== "function"
    ) {
      var error = new Error(
        "Le contrôle d'accès administratif est indisponible."
      );
      error.code = "DASHBOARD001_ADMIN_ACCESS_UNAVAILABLE";
      throw error;
    }

    return adminAccessApi.assertCurrentUserAuthorized();
  }

  function isLoggerApiAvailable_() {
    return Boolean(
      loggerApi &&
      typeof loggerApi.info === "function" &&
      typeof loggerApi.warn === "function" &&
      typeof loggerApi.error === "function"
    );
  }

  function createProvider_(providerId, label, widgetId, reader) {
    return Object.freeze({
      getProviderId: function () {
        return providerId;
      },
      getProviderMetadata: function () {
        return {
          providerId: providerId,
          moduleId: "AKS_CORE",
          label: label,
          contractVersion: "1.0",
          providerVersion: "1.0.0",
          enabled: true
        };
      },
      getWidgets: function () {
        var value = reader();
        return [{
          widgetId: widgetId,
          providerId: providerId,
          type: "information",
          zone: "summary",
          title: label,
          state: value === null ? "unavailable" : "available",
          priority: 100,
          content: value
        }];
      }
    });
  }

  function createInternalRegistry_() {
    var registry = providerRegistry ||
      AKS_createDashboardProviderRegistry_(AKS.Core.DashboardContract);

    if (providerRegistry) {
      return registry;
    }

    registry.register(createProvider_(
      "aks.core.version",
      "Version",
      "core.version",
      function () {
        if (!versionApi || typeof versionApi.getReleaseInfo !== "function") {
          return null;
        }
        try {
          var releaseInfo = versionApi.getReleaseInfo();
          return releaseInfo && typeof releaseInfo === "object" ? {
            version: releaseInfo.version,
            build: releaseInfo.build,
            releaseName: releaseInfo.releaseName
          } : null;
        } catch (error) {
          return null;
        }
      }
    ));
    registry.register(createProvider_(
      "aks.core.configuration",
      "Configuration",
      "core.configuration",
      function () {
        if (
          !configApi ||
          typeof configApi.getAuthorizedAdminEmails !== "function"
        ) {
          return null;
        }
        try {
          var emails = configApi.getAuthorizedAdminEmails();
          return Array.isArray(emails)
            ? { administrators: emails.length }
            : null;
        } catch (error) {
          return null;
        }
      }
    ));
    registry.register(createProvider_(
      "aks.core.logger",
      "Journalisation",
      "core.logger",
      function () {
        return { apiAvailable: isLoggerApiAvailable_() };
      }
    ));
    return registry;
  }

  function collectWidgets_(registry, context) {
    var widgets = [];

    registry.listEnabled().forEach(function (provider) {
      var providerId = provider.getProviderId();
      var providerWidgetIds = {};

      try {
        var suppliedWidgets = provider.getWidgets(context);
        if (!Array.isArray(suppliedWidgets)) {
          throw new Error("La collection de widgets est invalide.");
        }

        suppliedWidgets.forEach(function (widget) {
          AKS.Core.DashboardContract.validateWidget(widget, providerId);
          if (providerWidgetIds[widget.widgetId]) {
            var duplicateError = new Error(
              "Identifiant de widget dupliqué : " + widget.widgetId
            );
            duplicateError.code = "ADMIN004_DUPLICATE_IDENTIFIER";
            throw duplicateError;
          }
          providerWidgetIds[widget.widgetId] = true;
          widgets.push(widget);
        });
      } catch (error) {
        if (loggerApi && typeof loggerApi.error === "function") {
          loggerApi.error("Échec d'un DashboardProvider.", {
            code: error.code || "ADMIN004_PROVIDER_FAILURE",
            providerId: providerId,
            correlationId: context.correlationId || null
          });
        }
      }
    });

    return widgets.sort(function (left, right) {
      if (left.zone !== right.zone) {
        return left.zone < right.zone ? -1 : 1;
      }
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }
      return left.widgetId < right.widgetId ? -1 :
        (left.widgetId > right.widgetId ? 1 : 0);
    });
  }

  function findWidgetContent_(widgets, widgetId) {
    var match = null;
    widgets.some(function (widget) {
      if (widget.widgetId === widgetId) {
        match = widget.state === "available" ? widget.content : null;
        return true;
      }
      return false;
    });
    return match;
  }

  function getDashboard() {
    var currentUser = assertCurrentUserAuthorized_();
    var registry = createInternalRegistry_();
    var widgets = collectWidgets_(registry, {
      currentUser: currentUser,
      correlationId: null
    });
    var version = findWidgetContent_(widgets, "core.version");
    var configuration = findWidgetContent_(widgets, "core.configuration");
    var logger = findWidgetContent_(widgets, "core.logger");
    var loggerApiAvailable = Boolean(logger && logger.apiAvailable);
    var components = {
      version: version !== null,
      configuration: configuration !== null,
      logger: loggerApiAvailable
    };

    var model = {
      application: {
        name: "AKS Platform"
      },
      version: version,
      configuration: configuration,
      logger: {
        apiAvailable: loggerApiAvailable
      },
      widgets: widgets,
      status: {
        healthy:
          components.version &&
          components.configuration &&
          components.logger,
        components: components
      }
    };

    return deepFreeze_(model);
  }

  return Object.freeze({
    getDashboard: getDashboard
  });
}

/*
 * DASHBOARD-001 uses a dedicated namespace because AKS.Admin.Dashboard already
 * belongs to ADMIN-001 and exposes the declarative administration view model.
 * Dependencies are resolved at call time to avoid Apps Script load-order
 * issues.
 */
AKS.Admin.DashboardModel = Object.freeze({
  getDashboard: function () {
    return AKS_createDashboardApi_(
      AKS.Admin.Access,
      AKS.Version,
      AKS.Config,
      AKS.Logger,
      null
    ).getDashboard();
  }
});
AKS.Admin.getDashboard = AKS.Admin.DashboardModel.getDashboard;
