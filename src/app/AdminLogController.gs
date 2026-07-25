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

  function deepFreeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    Object.keys(value).forEach(function (key) {
      deepFreeze_(value[key]);
    });
    return Object.freeze(value);
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

  function present_(event) {
    return {
      eventId: event.eventId,
      timestamp: event.timestamp,
      level: event.level,
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

  function read_(filters, dashboardMode) {
    var email = accessApi.assertCurrentUserAuthorized();
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
        logsTarget: baseUrl_() + "?app=logs"
      },
      filters: normalized,
      options: {
        levels: LEVELS.slice(),
        categories: CATEGORIES.slice(),
        limits: LIMITS.slice()
      },
      events: events
    });
  }

  function getViewModel(filters) {
    return read_(filters, false);
  }

  function getDashboardModel() {
    try {
      return read_({ limit: 25 }, true);
    } catch (error) {
      if (error && error.code === "ADMIN001_ACCESS_DENIED") {
        throw error;
      }
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
    AKS.Admin.Access,
    AKS.LogEventRepository,
    function () {
      return ScriptApp.getService().getUrl() || "";
    }
  );
}

AKS.Admin.Logs = Object.freeze({
  getViewModel: function (filters) {
    return AKS_createProductionAdminLogController_().getViewModel(filters);
  },
  getDashboardModel: function () {
    return AKS_createProductionAdminLogController_().getDashboardModel();
  },
  getDashboardModelForAuthorizedUser: function (email, baseUrl) {
    return AKS_createAdminLogController_(
      {
        assertCurrentUserAuthorized: function () {
          return AKS.Admin.Access.assertAuthorized(email);
        }
      },
      AKS.LogEventRepository,
      function () { return baseUrl || ""; }
    ).getDashboardModel();
  },
  render: function (filters) {
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
