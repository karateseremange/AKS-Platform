var AKS = AKS || {};
AKS.Admin = AKS.Admin || {};

/**
 * Creates the read-only LOG-001 administration controller.
 *
 * Authorization is checked before the repository is queried. Filtering is
 * performed server-side on the bounded set of the 500 most recent events.
 *
 * @param {Object} accessApi
 * @param {Object} repository
 * @param {Function=} baseUrlProvider
 * @returns {Object}
 */
function AKS_createAdminLogController_(accessApi, repository, baseUrlProvider) {
  var LEVELS = ["DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"];
  var CATEGORIES = [
    "technical", "security", "administration", "functional", "integration"
  ];
  var LIMITS = [25, 50, 100];
  var LEVEL_LABELS = {
    DEBUG: "Diagnostic",
    INFO: "Information",
    WARN: "Avertissement",
    ERROR: "Erreur",
    CRITICAL: "Critique"
  };

  function deepFreeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    Object.keys(value).forEach(function (key) {
      deepFreeze_(value[key]);
    });
    return Object.freeze(value);
  }

  function authorize_() {
    accessApi.assertAdministrationCapability("LOG_READ");
    return accessApi.getCurrentIdentity();
  }

  function baseUrl_() {
    try {
      return typeof baseUrlProvider === "function" ? baseUrlProvider() || "" : "";
    } catch (error) {
      return "";
    }
  }

  function allowed_(candidate, values) {
    return values.indexOf(candidate) === -1 ? "" : candidate;
  }

  function normalizeFilters_(filters) {
    filters = filters || {};
    var limit = Number(filters.limit);
    return {
      level: allowed_(String(filters.level || "").toUpperCase(), LEVELS),
      category: allowed_(
        String(filters.category || "").toLowerCase(),
        CATEGORIES
      ),
      module: String(filters.module || "").trim().slice(0, 100),
      search: String(filters.search || "").trim().slice(0, 100),
      limit: LIMITS.indexOf(limit) === -1 ? 25 : limit
    };
  }

  function matches_(event, filters) {
    var haystack;
    if (filters.level && event.level !== filters.level) {
      return false;
    }
    if (filters.category && event.category !== filters.category) {
      return false;
    }
    if (
      filters.module &&
      String(event.module || "").toLowerCase() !== filters.module.toLowerCase()
    ) {
      return false;
    }
    if (!filters.search) {
      return true;
    }
    haystack = [
      event.eventId,
      event.correlationId,
      event.source,
      event.module,
      event.eventType,
      event.message,
      event.outcome,
      event.reference
    ].join(" ").toLowerCase();
    return haystack.indexOf(filters.search.toLowerCase()) !== -1;
  }

  function hasActiveFilters_(filters) {
    return Boolean(
      filters.level ||
      filters.category ||
      filters.module ||
      filters.search
    );
  }

  function formatTimestamp_(timestamp) {
    var date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return String(timestamp || "");
    }
    return Utilities.formatDate(date, "Europe/Paris", "dd/MM/yyyy HH:mm");
  }

  function present_(event) {
    return {
      eventId: event.eventId,
      timestamp: event.timestamp,
      timestampLabel: formatTimestamp_(event.timestamp),
      level: event.level,
      levelLabel: LEVEL_LABELS[event.level] || event.level,
      category: event.category,
      source: event.source,
      module: event.module,
      eventType: event.eventType,
      message: event.message,
      outcome: event.outcome,
      correlationId: event.correlationId,
      reference: event.reference,
      durationMs: event.durationMs,
      actorJson: event.actor ? JSON.stringify(event.actor, null, 2) : "",
      contextJson: event.context && Object.keys(event.context).length
        ? JSON.stringify(event.context, null, 2)
        : ""
    };
  }

  function readAuthorized_(email, filters, dashboardMode) {
    var normalized = normalizeFilters_(filters);
    var events = repository.listRecent(dashboardMode ? 5 : 500)
      .filter(function (event) {
        return dashboardMode || matches_(event, normalized);
      })
      .slice(0, dashboardMode ? 5 : normalized.limit)
      .map(present_);

    return deepFreeze_({
      available: true,
      administrator: { email: email },
      navigation: {
        homeTarget: baseUrl_() + "?app=admin",
        logsTarget: baseUrl_() + "?app=logs",
        resetTarget: baseUrl_() + "?app=logs"
      },
      filters: normalized,
      result: {
        count: events.length,
        filtered: hasActiveFilters_(normalized)
      },
      options: {
        levels: LEVELS.slice(),
        categories: CATEGORIES.slice(),
        limits: LIMITS.slice()
      },
      events: events
    });
  }

  function getViewModel(filters) {
    var email = authorize_();
    return readAuthorized_(email, filters, false);
  }

  function getDashboardModel() {
    var email = authorize_();
    try {
      return readAuthorized_(email, { limit: 25 }, true);
    } catch (error) {
      return deepFreeze_({
        available: false,
        events: [],
        navigation: { logsTarget: baseUrl_() + "?app=logs" }
      });
    }
  }

  return Object.freeze({
    getViewModel: getViewModel,
    getDashboardModel: getDashboardModel
  });
}

function AKS_createProductionAdminLogController_() {
  return AKS_createAdminLogController_(
    AKS_createAccessService_(),
    AKS.LogEventRepository,
    function () {
      return ScriptApp.getService().getUrl() || "";
    }
  );
}

AKS.Admin.Logs = Object.freeze({
  getViewModel: function (filters) {
    if (AKS_privatePortalIsRecipe_()) {
      return AKS_privatePortalLogShell_(AKS_createAccessService_(), "page",
        ScriptApp.getService().getUrl() || "");
    }
    return AKS_createProductionAdminLogController_().getViewModel(filters);
  },
  getDashboardModel: function () {
    if (AKS_privatePortalIsRecipe_()) {
      return AKS_privatePortalLogShell_(AKS_createAccessService_(), "widget",
        ScriptApp.getService().getUrl() || "");
    }
    return AKS_createProductionAdminLogController_().getDashboardModel();
  },
  getDashboardModelForAuthorizedUser: function () {
    return AKS.Admin.Logs.getDashboardModel();
  },
  render: function (filters) {
    if (AKS_privatePortalIsRecipe_()) return AKS_renderPrivatePortalLogs_();
    var template = HtmlService.createTemplateFromFile("ui/admin/Logs");
    template.viewModel = this.getViewModel(filters);
    return template
      .evaluate()
      .setTitle("Journaux — AKS Platform")
      .addMetaTag("viewport", "width=device-width, initial-scale=1");
  }
});

function AKS_includeAdminLogFile_(path) {
  return HtmlService.createHtmlOutputFromFile(path).getContent();
}
