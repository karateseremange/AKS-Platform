function AKS_analyticsAdminFixture_(overrides) {
  var calls = { authorize: 0, preview: 0, publish: 0 };
  var preview = {
    season: "2026-2027",
    state: "PRET",
    publishable: true,
    confirmation_token: "TOKEN-CURRENT",
    diagnostic: {
      source_summary: {
        expected_count: 5, valid_count: 5, conforming_count: 5,
        non_calculable_count: 0, error_count: 0
      },
      orchestration_summary: { exploitable_count: 5, failed_count: 0 },
      validation_marker_count: 0,
      errors: []
    },
    reports: ["BABY", "ENFANT_1", "ENFANT_2", "ADO_ADULTE", "FEMININ", "GLOBAL"].map(function (code) {
      return {
        report_code: code,
        report_type: code === "GLOBAL" ? "GLOBAL" : "COURS",
        course: code === "GLOBAL" ? null : code,
        state: "VALIDE",
        file_name: code + ".html",
        html: "<p>" + code + "</p>"
      };
    })
  };
  var values = {
    "platform.activeSeason": "2026-2027",
    "analytics.driveRootFolderId": "ROOT-AKS"
  };
  var controller = AKS_createAdminAnalyticsController_({
    assertCurrentUserAuthorized: function () {
      calls.authorize += 1;
      return "admin@example.test";
    }
  }, {
    preview: function () {
      calls.preview += 1;
      return preview;
    },
    publish: function (request) {
      calls.publish += 1;
      calls.publishRequest = request;
      return {
        season: request.season,
        document_count: 6,
        publication_folder_id: "PUB-1",
        publication_folder_url: "https://drive.google.com/drive/folders/PUB-1",
        documents: []
      };
    }
  }, {
    resolve: function (key) {
      return { value: values[key] || "", valid: true };
    }
  }, function () {
    return "https://example.test/exec";
  });
  if (overrides) overrides(preview, calls);
  return { controller: controller, preview: preview, calls: calls };
}

function AKS_testAnalyticsAdmin_protectsEveryServerAction_() {
  var fixture = AKS_analyticsAdminFixture_();
  fixture.controller.getViewModel();
  fixture.controller.diagnose({ season: "2026-2027" });
  fixture.controller.preview({ season: "2026-2027" });
  fixture.controller.publish({
    season: "2026-2027", confirmed: true, confirmationToken: "TOKEN-CURRENT"
  });
  assertEquals_(4, fixture.calls.authorize);
}

function AKS_testAnalyticsAdmin_buildsNavigationAndSeason_() {
  var model = AKS_analyticsAdminFixture_().controller.getViewModel();
  assertEquals_("2026-2027", model.season);
  assertEquals_("https://example.test/exec?app=admin", model.navigation.homeTarget);
  assertEquals_("https://example.test/exec?app=analytics", model.navigation.analyticsTarget);
}

function AKS_testAnalyticsAdmin_diagnosticContainsNoIndividualData_() {
  var fixture = AKS_analyticsAdminFixture_();
  fixture.preview.diagnostic.errors = [{
    code: "SOURCE_INVALID",
    details: { licencie_id: "LIC-SECRET", nom: "DUPONT" }
  }];
  var model = fixture.controller.diagnose({ season: "2026-2027" });
  var serialized = JSON.stringify(model);
  assertEquals_(true, serialized.indexOf("SOURCE_INVALID") !== -1);
  assertEquals_(-1, serialized.indexOf("LIC-SECRET"));
  assertEquals_(-1, serialized.indexOf("DUPONT"));
  assertEquals_(null, model.confirmationToken);
  assertEquals_(null, model.reports[0].html);
}

function AKS_testAnalyticsAdmin_previewDelegatesWithoutPublishing_() {
  var fixture = AKS_analyticsAdminFixture_();
  var model = fixture.controller.preview({ season: "2026-2027" });
  assertEquals_(1, fixture.calls.preview);
  assertEquals_(0, fixture.calls.publish);
  assertEquals_(6, model.reports.length);
  assertEquals_("TOKEN-CURRENT", model.confirmationToken);
}

function AKS_testAnalyticsAdmin_requiresExplicitConfirmation_() {
  var fixture = AKS_analyticsAdminFixture_();
  assertThrows_(function () {
    fixture.controller.publish({
      season: "2026-2027", confirmationToken: "TOKEN-CURRENT"
    });
  }, "ANALYTICS_ADMIN_CONFIRMATION_REQUIRED");
  assertEquals_(0, fixture.calls.publish);
}

function AKS_testAnalyticsAdmin_forwardsPreviewTokenAndConfiguredRoot_() {
  var fixture = AKS_analyticsAdminFixture_();
  var result = fixture.controller.publish({
    season: "2026-2027", confirmed: true, confirmationToken: "TOKEN-CURRENT"
  });
  assertEquals_(1, fixture.calls.publish);
  assertEquals_("TOKEN-CURRENT", fixture.calls.publishRequest.confirmation_token);
  assertEquals_("ROOT-AKS", fixture.calls.publishRequest.root_folder_id);
  assertEquals_("PUB-1", result.folderId);
}

function AKS_testAnalyticsAdmin_rejectsInvalidSeasonBeforeService_() {
  var fixture = AKS_analyticsAdminFixture_();
  assertThrows_(function () {
    fixture.controller.preview({ season: "2026" });
  }, "ANALYTICS_ADMIN_SEASON_INVALID");
  assertEquals_(0, fixture.calls.preview);
}

function AKS_testAnalyticsAdmin_clientPreventsDuplicateAndStaleActions_() {
  var source = AKS_includeAdminAnalyticsFile_("ui/admin/AnalyticsClient");
  assertEquals_(true, source.indexOf("if (busy)") !== -1);
  assertEquals_(true, source.indexOf("resetPreview_") !== -1);
  assertEquals_(true, source.indexOf("confirmed: true") !== -1);
  assertEquals_(true, source.indexOf("withFailureHandler") !== -1);
}

function AKS_testAnalyticsAdmin_viewHasAccessibleFeedbackAndConfirmation_() {
  var source = HtmlService.createHtmlOutputFromFile("ui/admin/Analytics").getContent();
  assertEquals_(true, source.indexOf('role="status"') !== -1);
  assertEquals_(true, source.indexOf('aria-live="polite"') !== -1);
  assertEquals_(true, source.indexOf("Je confirme la publication") !== -1);
  assertEquals_(true, source.indexOf("Aperçu des rapports") !== -1);
}

function AKS_testAnalyticsAdmin_viewReusesAdministrativeVisualCharter_() {
  var source = HtmlService.createHtmlOutputFromFile("ui/admin/Analytics").getContent();
  var style = AKS_includeAdminAnalyticsFile_("ui/admin/AnalyticsStyle");
  assertEquals_(true, source.indexOf('ui/admin/DashboardStyle') !== -1);
  assertEquals_(true, source.indexOf('aks-admin-card__header') !== -1);
  assertEquals_(true, source.indexOf('aks-admin-card__kicker') !== -1);
  assertEquals_(true, style.indexOf("var(--aks-primary)") !== -1);
  assertEquals_(true, style.indexOf("var(--aks-border)") !== -1);
}

function AKS_testAnalyticsAdmin_navigationPublishesDestination_() {
  var model = AKS.Admin.Navigation.getModel("https://example.test/exec");
  var destinations = [];
  model.families.forEach(function (family) {
    destinations = destinations.concat(family.destinations);
  });
  var analytics = destinations.filter(function (destination) {
    return destination.id === "module.analytics";
  });
  assertEquals_(1, analytics.length);
  assertEquals_("https://example.test/exec?app=analytics", analytics[0].target);
}

function AKS_runAnalyticsAdminUiSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — Centre de pilotage", [
    { name: "ANALYTICS / actions administratives protégées", test: AKS_testAnalyticsAdmin_protectsEveryServerAction_ },
    { name: "ANALYTICS / saison et navigation", test: AKS_testAnalyticsAdmin_buildsNavigationAndSeason_ },
    { name: "ANALYTICS / diagnostics sans données individuelles", test: AKS_testAnalyticsAdmin_diagnosticContainsNoIndividualData_ },
    { name: "ANALYTICS / aperçu sans publication", test: AKS_testAnalyticsAdmin_previewDelegatesWithoutPublishing_ },
    { name: "ANALYTICS / confirmation UI obligatoire", test: AKS_testAnalyticsAdmin_requiresExplicitConfirmation_ },
    { name: "ANALYTICS / jeton et racine configurée", test: AKS_testAnalyticsAdmin_forwardsPreviewTokenAndConfiguredRoot_ },
    { name: "ANALYTICS / saison invalide bloquée", test: AKS_testAnalyticsAdmin_rejectsInvalidSeasonBeforeService_ },
    { name: "ANALYTICS / client anti-doublon et aperçu périmé", test: AKS_testAnalyticsAdmin_clientPreventsDuplicateAndStaleActions_ },
    { name: "ANALYTICS / vue accessible et confirmation", test: AKS_testAnalyticsAdmin_viewHasAccessibleFeedbackAndConfirmation_ },
    { name: "ANALYTICS / charte visuelle administrative partagée", test: AKS_testAnalyticsAdmin_viewReusesAdministrativeVisualCharter_ },
    { name: "ANALYTICS / destination de navigation", test: AKS_testAnalyticsAdmin_navigationPublishesDestination_ }
  ]);
}
