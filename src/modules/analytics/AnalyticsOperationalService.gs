var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Relie les sources Google Sheets à la chaîne de restitution et à la
 * publication Drive. L'aperçu est strictement sans écriture ; la publication
 * relit les sources et exige le jeton correspondant exactement à cet aperçu.
 */
AKS.Analytics.OperationalService = (function () {
  "use strict";

  var RULE_VERSION = "analytics-operational-service/1.0.0";
  var EXPECTED_SOURCES = 4;
  var REQUIRED_DOCUMENTS = 5;

  function error_(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function text_(value) {
    return value === null || typeof value === "undefined" ? "" : String(value).trim();
  }

  function freeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { freeze_(value[key]); });
    return Object.freeze(value);
  }

  function dependencies_(options) {
    options = options || {};
    return {
      sheets: options.sheets_provider || AKS.Analytics.SheetsProvider,
      orchestrator: options.course_orchestrator || AKS.Analytics.CourseOrchestrator,
      restitution: options.restitution_model || AKS.Analytics.RestitutionModel,
      content: options.report_content || AKS.Analytics.ReportContent,
      charts: options.chart_model || AKS.Analytics.ChartModel,
      layout: options.report_layout || AKS.Analytics.ReportLayout,
      html: options.html_report_generator || AKS.Analytics.HtmlReportGenerator,
      pdf: options.pdf_report_converter || AKS.Analytics.PdfReportConverter,
      publisher: options.drive_publisher || AKS.Analytics.DrivePublisher
    };
  }

  function defaultToken_(value) {
    var bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8);
    return bytes.map(function (byte) {
      var normalized = byte < 0 ? byte + 256 : byte;
      return ("0" + normalized.toString(16)).slice(-2);
    }).join("");
  }

  function validationMarkers_(source) {
    var markers = [];
    (source.courses || []).forEach(function (course) {
      (course.members || []).forEach(function (member) {
        var id = text_(member.licencie_id).toUpperCase();
        var name = text_(member.nom).toUpperCase();
        var firstName = text_(member.prenom).toUpperCase();
        if (/^(TEST|VALIDATION)(-|_|$)/.test(id) ||
            (name === "TEST" && firstName === "VALIDATION")) {
          markers.push({ course_code: course.code, licencie_id: id });
        }
      });
    });
    return markers;
  }

  function diagnostic_(source, orchestration, markers) {
    var errors = [];
    if (source.state !== "VALIDE" || source.summary.valid_count !== EXPECTED_SOURCES) {
      errors.push({ code: "ANALYTICS_OPERATIONAL_SOURCES_INCOMPLETE" });
    }
    if (orchestration.state !== "VALIDE" ||
        orchestration.summary.exploitable_count !== EXPECTED_SOURCES ||
        orchestration.summary.failed_count !== 0) {
      errors.push({ code: "ANALYTICS_OPERATIONAL_DATA_NOT_PUBLISHABLE" });
    }
    if (markers.length) {
      errors.push({
        code: "ANALYTICS_OPERATIONAL_VALIDATION_DATA_PRESENT",
        details: { count: markers.length }
      });
    }
    return {
      state: errors.length ? "BLOQUE" : "PRET",
      publishable: errors.length === 0,
      errors: errors,
      source_summary: source.summary,
      orchestration_summary: orchestration.summary,
      validation_marker_count: markers.length
    };
  }

  function tokenPayload_(source, htmlBundle) {
    return JSON.stringify({
      season: source.season,
      sources: (source.courses || []).map(function (course) {
        return [course.code, course.spreadsheet_id, course.source_state];
      }),
      reports: (htmlBundle.documents || []).map(function (document) {
        return [document.report_code, document.fingerprint];
      })
    });
  }

  function build_(request, options) {
    request = request || {};
    options = options || {};
    var dependencies = dependencies_(options);
    var source = dependencies.sheets.load({
      season: request.season,
      spreadsheet_ids: request.spreadsheet_ids,
      adapter: options.sheets_adapter
    });
    var orchestration = dependencies.orchestrator.run(source.orchestrator_input);
    var restitution = dependencies.restitution.build(orchestration);
    var content = dependencies.content.build(restitution);
    var charts = dependencies.charts.build(content);
    var layout = dependencies.layout.build(content, charts);
    var htmlBundle = dependencies.html.build(layout);
    var markers = validationMarkers_(source);
    var diagnostic = diagnostic_(source, orchestration, markers);
    if (htmlBundle.documents.length !== REQUIRED_DOCUMENTS) {
      diagnostic.errors.push({ code: "ANALYTICS_OPERATIONAL_REPORT_BATCH_INCOMPLETE" });
      diagnostic.state = "BLOQUE";
      diagnostic.publishable = false;
    }
    var tokenProvider = options.token_provider || defaultToken_;
    return {
      dependencies: dependencies,
      source: source,
      orchestration: orchestration,
      html_bundle: htmlBundle,
      diagnostic: diagnostic,
      confirmation_token: diagnostic.publishable ?
        tokenProvider(tokenPayload_(source, htmlBundle)) : null
    };
  }

  function preview(request, options) {
    var built = build_(request, options);
    return freeze_({
      rule_version: RULE_VERSION,
      season: built.source.season,
      state: built.diagnostic.state,
      publishable: built.diagnostic.publishable,
      diagnostic: built.diagnostic,
      confirmation_token: built.confirmation_token,
      reports: built.html_bundle.documents.map(function (document) {
        return {
          report_code: document.report_code,
          report_type: document.report_type,
          course: document.course,
          state: document.state,
          file_name: document.file_name,
          fingerprint: document.fingerprint,
          html: document.html
        };
      })
    });
  }

  function defaultLock_() {
    var lock = LockService.getScriptLock();
    return {
      acquire: function () { return lock.tryLock(30000); },
      release: function () { lock.releaseLock(); }
    };
  }

  function publish(request, options) {
    request = request || {};
    options = options || {};
    if (request.confirmed !== true) {
      throw error_("ANALYTICS_OPERATIONAL_CONFIRMATION_REQUIRED",
        "Une confirmation explicite est obligatoire avant publication.");
    }
    var suppliedToken = text_(request.confirmation_token);
    if (!suppliedToken) {
      throw error_("ANALYTICS_OPERATIONAL_CONFIRMATION_TOKEN_REQUIRED",
        "Le jeton de l'aperçu est obligatoire avant publication.");
    }
    var lock = options.lock || defaultLock_();
    if (!lock.acquire()) {
      throw error_("ANALYTICS_OPERATIONAL_PUBLICATION_LOCKED",
        "Une autre publication Analytics est déjà en cours.");
    }
    try {
      var built = build_(request, options);
      if (!built.diagnostic.publishable) {
        throw error_("ANALYTICS_OPERATIONAL_PUBLICATION_BLOCKED",
          "Les données Analytics ne permettent pas une publication complète.");
      }
      if (built.confirmation_token !== suppliedToken) {
        throw error_("ANALYTICS_OPERATIONAL_PREVIEW_STALE",
          "Les sources ont changé depuis l'aperçu ; une nouvelle confirmation est nécessaire.");
      }
      var pdfBundle = built.dependencies.pdf.convert(built.html_bundle, {
        converter: options.pdf_converter,
        max_documents: REQUIRED_DOCUMENTS
      });
      return built.dependencies.publisher.publish(pdfBundle, {
        root_folder_id: request.root_folder_id,
        adapter: options.drive_adapter,
        clock: options.clock,
        id_provider: options.id_provider,
        logger: options.logger
      });
    } finally {
      lock.release();
    }
  }

  return Object.freeze({
    RULE_VERSION: RULE_VERSION,
    EXPECTED_SOURCES: EXPECTED_SOURCES,
    REQUIRED_DOCUMENTS: REQUIRED_DOCUMENTS,
    preview: preview,
    publish: publish
  });
}());
