function AKS_analyticsOperationalFixture_(overrides) {
  var source = {
    season: "2026-2027", state: "VALIDE",
    summary: { valid_count: 4, error_count: 0, expected_count: 4 },
    courses: ["ADO_ADULTE", "BABY", "ENFANT_1", "ENFANT_2"].map(function (code) {
      return {
        code: code, spreadsheet_id: "ID-" + code, source_state: "VALIDE",
        members: [{ licencie_id: "LIC-" + code, nom: "DUPONT", prenom: "Alice" }]
      };
    }),
    orchestrator_input: { season: "2026-2027", courses: [] }
  };
  var calls = { pdf: 0, publish: 0, release: 0 };
  var options = {
    token_provider: function (value) { return "TOKEN-" + value.length; },
    sheets_provider: { load: function () { return source; } },
    course_orchestrator: { run: function () {
      return {
        season: "2026-2027", state: "VALIDE",
        summary: { exploitable_count: 4, failed_count: 0 },
        courses: []
      };
    } },
    restitution_model: { build: function (value) { return value; } },
    report_content: { build: function (value) { return value; } },
    chart_model: { build: function (value) { return value; } },
    report_layout: { build: function (value) { return value; } },
    html_report_generator: { build: function () {
      return {
        season: "2026-2027",
        documents: ["ADO_ADULTE", "BABY", "ENFANT_1", "ENFANT_2", "GLOBAL"].map(function (code) {
          return {
            report_code: code, report_type: code === "GLOBAL" ? "GLOBAL" : "COURS",
            course: code === "GLOBAL" ? null : code, state: "VALIDE",
            file_name: code + ".html", fingerprint: "FP-" + code,
            mime_type: "text/html", html: "<p>" + code + "</p>"
          };
        })
      };
    } },
    pdf_report_converter: { convert: function (bundle) {
      calls.pdf += 1;
      return { season: bundle.season, documents: bundle.documents };
    } },
    drive_publisher: { publish: function (bundle) {
      calls.publish += 1;
      return { season: bundle.season, document_count: 5, publication_folder_id: "PUB-1" };
    } },
    lock: {
      acquire: function () { return true; },
      release: function () { calls.release += 1; }
    }
  };
  if (overrides) overrides(source, options, calls);
  return { source: source, options: options, calls: calls };
}

function AKS_testAnalyticsOperational_previewIsReadOnly_() {
  var fixture = AKS_analyticsOperationalFixture_();
  var result = AKS.Analytics.OperationalService.preview(
    { season: "2026-2027" }, fixture.options);
  assertEquals_("PRET", result.state);
  assertEquals_(5, result.reports.length);
  assertEquals_(0, fixture.calls.pdf);
  assertEquals_(0, fixture.calls.publish);
}

function AKS_testAnalyticsOperational_blocksIncompleteSources_() {
  var fixture = AKS_analyticsOperationalFixture_(function (source) {
    source.state = "PARTIEL"; source.summary.valid_count = 3;
  });
  var result = AKS.Analytics.OperationalService.preview(
    { season: "2026-2027" }, fixture.options);
  assertEquals_("BLOQUE", result.state);
  assertEquals_(false, result.publishable);
  assertEquals_("ANALYTICS_OPERATIONAL_SOURCES_INCOMPLETE", result.diagnostic.errors[0].code);
}

function AKS_testAnalyticsOperational_blocksValidationRows_() {
  var fixture = AKS_analyticsOperationalFixture_(function (source) {
    source.courses[0].members[0] = {
      licencie_id: "LIC-000001", nom: "TEST", prenom: "Validation"
    };
  });
  var result = AKS.Analytics.OperationalService.preview(
    { season: "2026-2027" }, fixture.options);
  assertEquals_("BLOQUE", result.state);
  assertEquals_(1, result.diagnostic.validation_marker_count);
}

function AKS_testAnalyticsOperational_requiresExplicitConfirmation_() {
  var fixture = AKS_analyticsOperationalFixture_();
  assertThrows_(function () {
    AKS.Analytics.OperationalService.publish(
      { season: "2026-2027", confirmation_token: "TOKEN" }, fixture.options);
  }, "ANALYTICS_OPERATIONAL_CONFIRMATION_REQUIRED");
}

function AKS_testAnalyticsOperational_rejectsStalePreview_() {
  var fixture = AKS_analyticsOperationalFixture_();
  assertThrows_(function () {
    AKS.Analytics.OperationalService.publish({
      season: "2026-2027", confirmed: true, confirmation_token: "ANCIEN"
    }, fixture.options);
  }, "ANALYTICS_OPERATIONAL_PREVIEW_STALE");
  assertEquals_(0, fixture.calls.pdf);
  assertEquals_(0, fixture.calls.publish);
  assertEquals_(1, fixture.calls.release);
}

function AKS_testAnalyticsOperational_publishesConfirmedCurrentPreview_() {
  var fixture = AKS_analyticsOperationalFixture_();
  var preview = AKS.Analytics.OperationalService.preview(
    { season: "2026-2027" }, fixture.options);
  var result = AKS.Analytics.OperationalService.publish({
    season: "2026-2027", confirmed: true,
    confirmation_token: preview.confirmation_token,
    root_folder_id: "AKS-PLATFORM"
  }, fixture.options);
  assertEquals_("PUB-1", result.publication_folder_id);
  assertEquals_(1, fixture.calls.pdf);
  assertEquals_(1, fixture.calls.publish);
  assertEquals_(1, fixture.calls.release);
}

function AKS_testAnalyticsOperational_releasesLockAfterFailure_() {
  var fixture = AKS_analyticsOperationalFixture_(function (source, options) {
    options.pdf_report_converter.convert = function () {
      throw new Error("conversion impossible");
    };
  });
  var preview = AKS.Analytics.OperationalService.preview(
    { season: "2026-2027" }, fixture.options);
  try {
    AKS.Analytics.OperationalService.publish({
      season: "2026-2027", confirmed: true,
      confirmation_token: preview.confirmation_token
    }, fixture.options);
  } catch (ignored) {}
  assertEquals_(1, fixture.calls.release);
}

function AKS_testAnalyticsOperational_rejectsConcurrentPublication_() {
  var fixture = AKS_analyticsOperationalFixture_(function (source, options) {
    options.lock.acquire = function () { return false; };
  });
  assertThrows_(function () {
    AKS.Analytics.OperationalService.publish({
      season: "2026-2027", confirmed: true, confirmation_token: "TOKEN"
    }, fixture.options);
  }, "ANALYTICS_OPERATIONAL_PUBLICATION_LOCKED");
  assertEquals_(0, fixture.calls.release);
}

function AKS_testAnalyticsOperational_composesRealAnalyticsChain_() {
  var sheets = AKS_analyticsSheetsOptions_();
  var calls = { publish: 0 };
  var options = {
    sheets_adapter: sheets.adapter,
    token_provider: function () { return "CURRENT"; },
    pdf_converter: AKS_analyticsPdfFakeConverter_([]),
    drive_publisher: { publish: function (bundle) {
      calls.publish += 1;
      return {
        season: bundle.season, document_count: bundle.documents.length,
        publication_folder_id: "PUB-REAL-CHAIN"
      };
    } },
    lock: { acquire: function () { return true; }, release: function () {} }
  };
  var request = {
    season: sheets.season, spreadsheet_ids: sheets.spreadsheet_ids
  };
  var preview = AKS.Analytics.OperationalService.preview(request, options);
  assertEquals_("PRET", preview.state);
  assertEquals_(5, preview.reports.length);
  request.confirmed = true;
  request.confirmation_token = preview.confirmation_token;
  var publication = AKS.Analytics.OperationalService.publish(request, options);
  assertEquals_("PUB-REAL-CHAIN", publication.publication_folder_id);
  assertEquals_(5, publication.document_count);
  assertEquals_(1, calls.publish);
}

function AKS_runAnalyticsOperationalServiceSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — orchestration opérationnelle", [
    { name: "ANALYTICS / aperçu sans écriture", test: AKS_testAnalyticsOperational_previewIsReadOnly_ },
    { name: "ANALYTICS / sources incomplètes bloquées", test: AKS_testAnalyticsOperational_blocksIncompleteSources_ },
    { name: "ANALYTICS / données de validation bloquées", test: AKS_testAnalyticsOperational_blocksValidationRows_ },
    { name: "ANALYTICS / confirmation explicite", test: AKS_testAnalyticsOperational_requiresExplicitConfirmation_ },
    { name: "ANALYTICS / aperçu périmé", test: AKS_testAnalyticsOperational_rejectsStalePreview_ },
    { name: "ANALYTICS / publication confirmée", test: AKS_testAnalyticsOperational_publishesConfirmedCurrentPreview_ },
    { name: "ANALYTICS / verrou libéré", test: AKS_testAnalyticsOperational_releasesLockAfterFailure_ },
    { name: "ANALYTICS / publication concurrente", test: AKS_testAnalyticsOperational_rejectsConcurrentPublication_ },
    { name: "ANALYTICS / chaîne réelle composée", test: AKS_testAnalyticsOperational_composesRealAnalyticsChain_ }
  ]);
}
