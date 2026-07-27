var AKS = AKS || {};
AKS.Admin = AKS.Admin || {};

/**
 * Administrative boundary for Analytics. Business calculations and Drive
 * publication remain exclusively owned by Analytics.OperationalService.
 */
function AKS_createAdminAnalyticsController_(
  accessApi,
  operationalService,
  configurationService,
  baseUrlProvider
) {
  "use strict";

  var COURSE_LABELS = {
    BABY: "Baby",
    ENFANT_1: "Enfant 1",
    ENFANT_2: "Enfant 2",
    ADO_ADULTE: "Ado/Adulte",
    FEMININ: "Cours féminin"
  };

  function freeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze_(value[key]); });
    return Object.freeze(value);
  }

  function authorize_() {
    return accessApi.assertCurrentUserAuthorized();
  }

  function baseUrl_() {
    try {
      return typeof baseUrlProvider === "function" ? baseUrlProvider() || "" : "";
    } catch (ignored) {
      return "";
    }
  }

  function configuredValue_(key) {
    try {
      var resolved = configurationService.resolve(key);
      return resolved && resolved.valid !== false ? resolved.value || "" : "";
    } catch (ignored) {
      return "";
    }
  }

  function validateSeason_(season) {
    season = String(season || "").trim();
    if (!/^\d{4}-\d{4}$/.test(season) ||
        Number(season.slice(5)) !== Number(season.slice(0, 4)) + 1) {
      var error = new Error("La saison doit respecter le format AAAA-AAAA.");
      error.code = "ANALYTICS_ADMIN_SEASON_INVALID";
      throw error;
    }
    return season;
  }

  function safeDiagnostics_(preview) {
    var sourceSummary = preview.diagnostic.source_summary || {};
    var orchestrationSummary = preview.diagnostic.orchestration_summary || {};
    return {
      state: preview.state,
      publishable: preview.publishable === true,
      expectedSourceCount: Number(sourceSummary.expected_count || 4),
      validSourceCount: Number(sourceSummary.valid_count || 0),
      conformingSourceCount: Number(sourceSummary.conforming_count || 0),
      emptySourceCount: Number(sourceSummary.non_calculable_count || 0),
      errorSourceCount: Number(sourceSummary.error_count || 0),
      exploitableCourseCount: Number(orchestrationSummary.exploitable_count || 0),
      failedCourseCount: Number(orchestrationSummary.failed_count || 0),
      validationMarkerCount: Number(preview.diagnostic.validation_marker_count || 0),
      errors: (preview.diagnostic.errors || []).map(function (error) {
        return { code: String(error.code || "ANALYTICS_ADMIN_UNKNOWN_DIAGNOSTIC") };
      })
    };
  }

  function presentReports_(preview, includeHtml) {
    return (preview.reports || []).map(function (report) {
      return {
        reportCode: report.report_code,
        reportType: report.report_type,
        course: report.course,
        label: report.course ? COURSE_LABELS[report.course] : "Rapport global",
        state: report.state,
        fileName: report.file_name,
        html: includeHtml ? report.html : null
      };
    });
  }

  function preview_(request, includeHtml) {
    var season = validateSeason_(request && request.season);
    var result = operationalService.preview({ season: season });
    return freeze_({
      season: season,
      diagnostic: safeDiagnostics_(result),
      confirmationToken: includeHtml ? result.confirmation_token : null,
      reports: presentReports_(result, includeHtml)
    });
  }

  function getViewModel() {
    var email = authorize_();
    return freeze_({
      administrator: { email: email },
      season: configuredValue_("platform.activeSeason"),
      navigation: {
        homeTarget: baseUrl_() + "?app=admin",
        analyticsTarget: baseUrl_() + "?app=analytics"
      }
    });
  }

  function diagnose(request) {
    authorize_();
    return preview_(request || {}, false);
  }

  function preview(request) {
    authorize_();
    return preview_(request || {}, true);
  }

  function publish(request) {
    authorize_();
    request = request || {};
    if (request.confirmed !== true) {
      var error = new Error("Une confirmation explicite est obligatoire.");
      error.code = "ANALYTICS_ADMIN_CONFIRMATION_REQUIRED";
      throw error;
    }
    var result = operationalService.publish({
      season: validateSeason_(request.season),
      confirmed: true,
      confirmation_token: String(request.confirmationToken || ""),
      root_folder_id: configuredValue_("analytics.driveRootFolderId")
    });
    return freeze_({
      season: result.season,
      documentCount: result.document_count,
      folderId: result.publication_folder_id || null,
      folderUrl: result.publication_folder_url || null,
      documents: (result.documents || []).map(function (document) {
        return {
          reportCode: document.report_code,
          fileName: document.file_name,
          fileId: document.file_id,
          url: document.file_url
        };
      })
    });
  }

  return Object.freeze({
    getViewModel: getViewModel,
    diagnose: diagnose,
    preview: preview,
    publish: publish
  });
}

function AKS_createProductionAdminAnalyticsController_() {
  return AKS_createAdminAnalyticsController_(
    AKS.Admin.Access,
    AKS.Analytics.OperationalService,
    AKS_createConfigurationService_(
      AKS_createPlatformParameterRegistry_(),
      AKS_createScriptParameterValueStore_()
    ),
    function () { return ScriptApp.getService().getUrl() || ""; }
  );
}

AKS.Admin.Analytics = Object.freeze({
  getViewModel: function () {
    return AKS_createProductionAdminAnalyticsController_().getViewModel();
  },
  render: function () {
    var template = HtmlService.createTemplateFromFile("ui/admin/Analytics");
    template.viewModel = this.getViewModel();
    return template.evaluate()
      .setTitle("Analytics — AKS Platform")
      .addMetaTag("viewport", "width=device-width, initial-scale=1");
  }
});

function AKS_getAdminAnalyticsDiagnostic(request) {
  return AKS_createProductionAdminAnalyticsController_().diagnose(request);
}

function AKS_previewAdminAnalyticsReports(request) {
  return AKS_createProductionAdminAnalyticsController_().preview(request);
}

function AKS_publishAdminAnalyticsReports(request) {
  return AKS_createProductionAdminAnalyticsController_().publish(request);
}

function AKS_includeAdminAnalyticsFile_(path) {
  return HtmlService.createHtmlOutputFromFile(path).getContent();
}
