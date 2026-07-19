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
  loggerApi
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

  function readVersion_() {
    if (!versionApi || typeof versionApi.getReleaseInfo !== "function") {
      return null;
    }

    try {
      var releaseInfo = versionApi.getReleaseInfo();

      if (!releaseInfo || typeof releaseInfo !== "object") {
        return null;
      }

      return {
        version: releaseInfo.version,
        build: releaseInfo.build,
        releaseName: releaseInfo.releaseName
      };
    } catch (error) {
      return null;
    }
  }

  function readConfiguration_() {
    if (
      !configApi ||
      typeof configApi.getAuthorizedAdminEmails !== "function"
    ) {
      return null;
    }

    try {
      var authorizedAdminEmails = configApi.getAuthorizedAdminEmails();

      if (!Array.isArray(authorizedAdminEmails)) {
        return null;
      }

      return {
        administrators: authorizedAdminEmails.length
      };
    } catch (error) {
      return null;
    }
  }

  function isLoggerApiAvailable_() {
    return Boolean(
      loggerApi &&
      typeof loggerApi.info === "function" &&
      typeof loggerApi.warn === "function" &&
      typeof loggerApi.error === "function"
    );
  }

  function getDashboard() {
    assertCurrentUserAuthorized_();

    var version = readVersion_();
    var configuration = readConfiguration_();
    var loggerApiAvailable = isLoggerApiAvailable_();
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
      AKS.Logger
    ).getDashboard();
  }
});
AKS.Admin.getDashboard = AKS.Admin.DashboardModel.getDashboard;
