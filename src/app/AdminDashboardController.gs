var AKS = AKS || {};
AKS.Admin = AKS.Admin || {};

function AKS_buildPortalDashboardViewModel_(portal, releaseInfo, baseUrl, recentLogs) {
  var destinations = portal.destinations.slice();
  if (portal.bootstrapAccess !== true) {
    destinations.push({ id: "access.my-access", label: "Mes accès", family: "personal",
      target: baseUrl + "?app=my-access", priority: 1, transitional: false });
  }
  var order = ["personal", "administration", "modules"];
  var labels = { personal: "Mon espace", administration: "Administration", modules: "Modules" };
  var families = order.map(function (family) {
    return { id: family, label: labels[family], destinations: destinations.filter(function (entry) {
      return entry.family === family;
    }) };
  }).filter(function (family) { return family.destinations.length > 0; });
  function freeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze_(value[key]); });
    return Object.freeze(value);
  }
  return freeze_({
    platform: { name: "AKS Platform", version: releaseInfo.version,
      releaseName: releaseInfo.releaseName },
    user: portal.identity, administrator: portal.identity, state: portal.state,
    emptyMessage: portal.state === "NO_ACCESS"
      ? "Aucun accès n’est actuellement attribué à votre compte." : "",
    navigation: { families: families }, actions: destinations,
    recentLogs: recentLogs || null,
    legacyAdministrativeAccess: portal.legacyAdministrativeAccess
  });
}

function AKS_portalHasDestination_(portal, destinationId) {
  return !!portal && (portal.destinations || []).some(function (entry) {
    return entry.id === destinationId;
  });
}

function AKS_buildDeniedPortalDashboardViewModel_(releaseInfo) {
  return Object.freeze({
    platform: Object.freeze({ name: "AKS Platform", version: releaseInfo.version,
      releaseName: releaseInfo.releaseName }),
    user: Object.freeze({ email: "" }), administrator: Object.freeze({ email: "" }),
    state: "DENIED", emptyMessage: "Accès non autorisé.",
    navigation: Object.freeze({ families: Object.freeze([]) }),
    actions: Object.freeze([]), recentLogs: null, legacyAdministrativeAccess: false
  });
}

/**
 * Administrative Dashboard controller.
 *
 * The controller authorizes the current Google user, reads release metadata
 * from AKS.Version and passes a presentation model to the HTML view.
 */
AKS.Admin.Dashboard = (function () {
  function getWebAppUrl_() {
    try {
      return ScriptApp.getService().getUrl() || "";
    } catch (error) {
      return "";
    }
  }

  function buildViewModel_(authorizedEmail, baseUrl, accessManageAuthorized) {
    var releaseInfo = AKS.Version.getReleaseInfo();
    var navigation = AKS.Admin.Navigation.getModel(
      typeof baseUrl === "string" ? baseUrl : getWebAppUrl_(),
      accessManageAuthorized === true
    );

    return Object.freeze({
      platform: Object.freeze({
        name: "AKS Platform",
        version: releaseInfo.version,
        releaseName: releaseInfo.releaseName
      }),
      administrator: Object.freeze({
        email: authorizedEmail
      }),
      navigation: navigation,
      actions: navigation.quickActions,
      recentLogs: (function () {
        try {
          return AKS.Admin.Logs.getDashboardModel();
        } catch (ignoredLogAccessFailure) {
          return null;
        }
      }())
    });
  }

  function getViewModel() {
    var baseUrl = getWebAppUrl_();
    var accessService = AKS_createAccessService_();
    var portal = AKS.Core.AccessPortalProjection.create({
      accessService: accessService,
      baseUrlProvider: function () { return baseUrl; }
    }).getPortalModel();
    var recentLogs = null;
    if (AKS_portalHasDestination_(portal, "admin.logs")) {
      if (AKS_privatePortalIsRecipe_()) {
        // Render the shell before any private configuration/signature/transport.
        recentLogs = AKS_privatePortalLogShell_(accessService, "widget", baseUrl);
      } else try {
        recentLogs = AKS.Core.PrivatePortalLogClient.createDashboardModel(
          AKS_createProductionPrivatePortalLogClient_(),
          baseUrl + "?app=logs"
        );
      } catch (ignoredLogsFailure) {
        recentLogs = Object.freeze({
          status: "UNAVAILABLE",
          available: false,
          events: Object.freeze([]),
          navigation: Object.freeze({ logsTarget: baseUrl + "?app=logs" })
        });
      }
    }
    return AKS_buildPortalDashboardViewModel_(
      portal, AKS.Version.getReleaseInfo(), baseUrl, recentLogs);
  }

  function render() {
    var template = HtmlService.createTemplateFromFile("ui/admin/Dashboard");
    try {
      template.viewModel = getViewModel();
    } catch (ignoredAccessRefusal) {
      template.viewModel = AKS_buildDeniedPortalDashboardViewModel_(
        AKS.Version.getReleaseInfo());
    }

    return template
      .evaluate()
      .setTitle("Portail AKS — AKS Platform")
      .addMetaTag("viewport", "width=device-width, initial-scale=1");
  }

  return Object.freeze({
    getViewModel: getViewModel,
    render: render,
    buildViewModelForAuthorizedUser: function (email, baseUrl, accessManageAuthorized) {
      return buildViewModel_(
        AKS.Admin.Access.assertAuthorized(email),
        baseUrl,
        accessManageAuthorized
      );
    }
  });
})();

/**
 * Includes a static Dashboard fragment.
 *
 * @param {string} path
 * @returns {string}
 */
function AKS_includeAdminDashboardFile_(path) {
  return HtmlService.createHtmlOutputFromFile(path).getContent();
}

/**
 * Reads an unevaluated Dashboard template for structural tests.
 *
 * Unlike createHtmlOutputFromFile(), this accepts Apps Script template
 * scriptlets and must never be used to serve a response directly.
 *
 * @param {string} path
 * @returns {string}
 */
function AKS_getAdminDashboardTemplateSource_(path) {
  return HtmlService.createTemplateFromFile(path).getRawContent();
}
