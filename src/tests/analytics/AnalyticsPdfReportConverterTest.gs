function AKS_analyticsPdfHtmlBundle_() {
  var gold = AKS.Tests.AnalyticsGoldDatasets.filter(function (dataset) {
    return dataset.id === "GOLD-006";
  })[0];
  var restitution = AKS.Analytics.RestitutionModel.build(
    AKS.Analytics.CourseOrchestrator.run(gold.input.orchestration)
  );
  var content = AKS.Analytics.ReportContent.build(restitution);
  var charts = AKS.Analytics.ChartModel.build(content);
  return AKS.Analytics.HtmlReportGenerator.build(
    AKS.Analytics.ReportLayout.build(content, charts)
  );
}

function AKS_analyticsPdfFakeBlob_(contentType, bytes) {
  var name = "";
  return {
    getContentType: function () { return contentType; },
    getBytes: function () { return bytes || [37, 80, 68, 70, 45, 49]; },
    setName: function (value) { name = value; return this; },
    getName: function () { return name; }
  };
}

function AKS_analyticsPdfFakeConverter_(calls) {
  return function (document) {
    calls.push(document);
    return AKS_analyticsPdfFakeBlob_("application/pdf");
  };
}

function AKS_testAnalyticsPdf_convertsCompleteFiveDocumentBatch_() {
  var calls = [];
  var result = AKS.Analytics.PdfReportConverter.convert(
    AKS_analyticsPdfHtmlBundle_(), { converter: AKS_analyticsPdfFakeConverter_(calls) }
  );
  assertEquals_(5, result.document_count);
  assertEquals_(5, calls.length);
  assertEquals_("application/pdf", result.mime_type);
}

function AKS_testAnalyticsPdf_preservesMetadataAndHtmlFingerprint_() {
  var source = AKS_analyticsPdfHtmlBundle_();
  var result = AKS.Analytics.PdfReportConverter.convert(
    source, { converter: AKS_analyticsPdfFakeConverter_([]) }
  );
  assertEquals_(source.documents[0].report_code, result.documents[0].report_code);
  assertEquals_(source.documents[0].fingerprint, result.documents[0].source_html_fingerprint);
  assertSame_(source.documents[0].source_versions, result.documents[0].source_versions);
}

function AKS_testAnalyticsPdf_normalizesPdfNames_() {
  var result = AKS.Analytics.PdfReportConverter.convert(
    AKS_analyticsPdfHtmlBundle_(), { converter: AKS_analyticsPdfFakeConverter_([]) }
  );
  assertTrue_(result.documents.every(function (document) {
    return /\.pdf$/.test(document.file_name) && document.file_name.indexOf(".html.pdf") === -1;
  }));
}

function AKS_testAnalyticsPdf_exposesValidatedBlobSize_() {
  var result = AKS.Analytics.PdfReportConverter.convert(
    AKS_analyticsPdfHtmlBundle_(), {
      converter: function () {
        return AKS_analyticsPdfFakeBlob_("application/pdf", [37, 80, 68, 70, 1, 2, 3]);
      }
    }
  );
  assertEquals_(7, result.documents[0].size_bytes);
  assertTrue_(!!result.documents[0].blob);
}

function AKS_testAnalyticsPdf_rejectsBatchBeforeQuotaConsumption_() {
  var calls = [];
  var error = null;
  try {
    AKS.Analytics.PdfReportConverter.convert(
      AKS_analyticsPdfHtmlBundle_(),
      { max_documents: 4, converter: AKS_analyticsPdfFakeConverter_(calls) }
    );
  } catch (failure) { error = failure; }
  assertEquals_("ANALYTICS_PDF_BATCH_LIMIT_EXCEEDED", error && error.code);
  assertEquals_(0, calls.length);
}

function AKS_testAnalyticsPdf_rejectsInvalidQuotaPolicy_() {
  assertThrows_(function () {
    AKS.Analytics.PdfReportConverter.convert(
      AKS_analyticsPdfHtmlBundle_(), { max_documents: 0, converter: function () {} }
    );
  }, "ANALYTICS_PDF_QUOTA_POLICY_INVALID");
}

function AKS_testAnalyticsPdf_mapsGoogleQuotaFailure_() {
  var error = null;
  try {
    AKS.Analytics.PdfReportConverter.convert(AKS_analyticsPdfHtmlBundle_(), {
      converter: function () { throw new Error("Service invoked too many times for one day"); }
    });
  } catch (failure) { error = failure; }
  assertEquals_("ANALYTICS_PDF_QUOTA_EXCEEDED", error && error.code);
  assertTrue_(error.message.indexOf("ADO_ADULTE") > -1);
  assertTrue_(error.message.indexOf("position 0") > -1);
}

function AKS_testAnalyticsPdf_rejectsInvalidMimeType_() {
  assertThrows_(function () {
    AKS.Analytics.PdfReportConverter.convert(AKS_analyticsPdfHtmlBundle_(), {
      converter: function () { return AKS_analyticsPdfFakeBlob_("text/plain"); }
    });
  }, "ANALYTICS_PDF_INVALID_MIME");
}

function AKS_testAnalyticsPdf_rejectsInvalidSignature_() {
  assertThrows_(function () {
    AKS.Analytics.PdfReportConverter.convert(AKS_analyticsPdfHtmlBundle_(), {
      converter: function () {
        return AKS_analyticsPdfFakeBlob_("application/pdf", [78, 79, 84, 80, 68, 70]);
      }
    });
  }, "ANALYTICS_PDF_INVALID_CONTENT");
}

function AKS_testAnalyticsPdf_matchesGold006_() {
  var gold = AKS.Tests.AnalyticsGoldDatasets.filter(function (dataset) {
    return dataset.id === "GOLD-006";
  })[0];
  var result = AKS.Analytics.PdfReportConverter.convert(
    AKS_analyticsPdfHtmlBundle_(), { converter: AKS_analyticsPdfFakeConverter_([]) }
  );
  assertEquals_(gold.expected.pdfReports.documentCount, result.document_count);
  assertEquals_(gold.expected.pdfReports.mimeType, result.mime_type);
  assertEquals_(gold.expected.pdfReports.globalState, result.documents[4].state);
}

/**
 * Test d'intégration explicite : effectue cinq conversions Google réelles.
 * Ne pas inclure dans la suite centralisée afin d'éviter une consommation
 * quotidienne implicite du quota de conversion.
 */
function AKS_runAnalyticsPdfIntegrationSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — intégration PDF Apps Script", [
    {
      name: "ANALYTICS / conversion Google réelle des cinq rapports",
      test: function () {
        var result = AKS.Analytics.PdfReportConverter.convert(AKS_analyticsPdfHtmlBundle_());
        assertEquals_(5, result.document_count);
        result.documents.forEach(function (document) {
          assertEquals_("application/pdf", document.mime_type);
          assertTrue_(document.size_bytes > 4);
          assertTrue_(/\.pdf$/.test(document.file_name));
        });
      }
    }
  ]);
}

function AKS_runAnalyticsPdfReportSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — rapports PDF", [
    { name: "ANALYTICS / lot PDF complet", test: AKS_testAnalyticsPdf_convertsCompleteFiveDocumentBatch_ },
    { name: "ANALYTICS / métadonnées PDF", test: AKS_testAnalyticsPdf_preservesMetadataAndHtmlFingerprint_ },
    { name: "ANALYTICS / noms PDF", test: AKS_testAnalyticsPdf_normalizesPdfNames_ },
    { name: "ANALYTICS / taille blob PDF", test: AKS_testAnalyticsPdf_exposesValidatedBlobSize_ },
    { name: "ANALYTICS / limite avant conversion", test: AKS_testAnalyticsPdf_rejectsBatchBeforeQuotaConsumption_ },
    { name: "ANALYTICS / politique quota", test: AKS_testAnalyticsPdf_rejectsInvalidQuotaPolicy_ },
    { name: "ANALYTICS / erreur quota Google", test: AKS_testAnalyticsPdf_mapsGoogleQuotaFailure_ },
    { name: "ANALYTICS / MIME PDF", test: AKS_testAnalyticsPdf_rejectsInvalidMimeType_ },
    { name: "ANALYTICS / signature PDF", test: AKS_testAnalyticsPdf_rejectsInvalidSignature_ },
    { name: "ANALYTICS / rapports PDF GOLD-006", test: AKS_testAnalyticsPdf_matchesGold006_ }
  ]);
}
