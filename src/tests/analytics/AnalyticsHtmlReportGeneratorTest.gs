function AKS_analyticsHtmlReportInput_() {
  var input = AKS_analyticsReportLayoutInput_();
  return AKS.Analytics.ReportLayout.build(input.content, input.charts);
}

function AKS_testAnalyticsHtmlReport_buildsAutonomousDocuments_() {
  var result = AKS.Analytics.HtmlReportGenerator.build(AKS_analyticsHtmlReportInput_());
  assertEquals_(3, result.documents.length);
  assertTrue_(result.documents[0].html.indexOf("<!doctype html>") === 0);
  assertTrue_(result.documents[0].html.indexOf("https://") === -1);
}

function AKS_testAnalyticsHtmlReport_definesA4PrintOutput_() {
  var doc = AKS.Analytics.HtmlReportGenerator.build(AKS_analyticsHtmlReportInput_()).documents[0];
  assertEquals_("text/html", doc.mime_type);
  assertTrue_(doc.html.indexOf("@page{size:A4 portrait") > -1);
  assertTrue_(doc.file_name.slice(-5) === ".html");
}

function AKS_testAnalyticsHtmlReport_rendersIntegratedSvg_() {
  var doc = AKS.Analytics.HtmlReportGenerator.build(AKS_analyticsHtmlReportInput_()).documents[0];
  assertTrue_(doc.html.indexOf("<svg") > -1);
  assertTrue_(doc.html.indexOf('role="img"') > -1);
  assertTrue_(doc.html.indexOf("<figcaption>") > -1);
}

function AKS_testAnalyticsHtmlReport_preservesValuesWithoutRecalculation_() {
  var layout = AKS_analyticsHtmlReportInput_();
  var point = layout.compositions[0].sections.filter(function (item) { return item.code === "CHART"; })[0]
    .content.chart.series[0].points[0];
  var doc = AKS.Analytics.HtmlReportGenerator.build(layout).documents[0];
  assertTrue_(doc.html.indexOf(point.display_value) > -1);
  assertTrue_(doc.html.indexOf(String(point.value * 100) + " %") === -1);
}

function AKS_testAnalyticsHtmlReport_marksUnavailableWithoutZero_() {
  var layout = JSON.parse(JSON.stringify(AKS_analyticsHtmlReportInput_()));
  var chart = layout.compositions[0].sections.filter(function (item) { return item.code === "CHART"; })[0].content.chart;
  chart.series[0].points[0].available = false;
  chart.series[0].points[0].value = null;
  chart.series[0].points[0].display_value = "Indisponible";
  var doc = AKS.Analytics.HtmlReportGenerator.build(layout).documents[0];
  assertTrue_(doc.html.indexOf("Indisponible") > -1);
  assertTrue_(doc.html.indexOf(">0 %<") === -1);
}

function AKS_testAnalyticsHtmlReport_escapesUntrustedContent_() {
  var layout = JSON.parse(JSON.stringify(AKS_analyticsHtmlReportInput_()));
  layout.compositions[0].header.title = '<script>alert("x")</script>';
  var doc = AKS.Analytics.HtmlReportGenerator.build(layout).documents[0];
  assertTrue_(doc.html.indexOf("<script>alert") === -1);
  assertTrue_(doc.html.indexOf("&lt;script&gt;") > -1);
}

function AKS_testAnalyticsHtmlReport_rendersGlobalVariant_() {
  var documents = AKS.Analytics.HtmlReportGenerator.build(AKS_analyticsHtmlReportInput_()).documents;
  var global = documents[documents.length - 1];
  assertEquals_("GLOBAL", global.report_type);
  assertTrue_(global.html.indexOf("agrégés de manière pondérée") > -1);
}

function AKS_testAnalyticsHtmlReport_exposesVersionsAndFingerprint_() {
  var layout = AKS_analyticsHtmlReportInput_();
  var doc = AKS.Analytics.HtmlReportGenerator.build(layout).documents[0];
  assertEquals_(layout.rule_version, doc.source_versions.layout);
  assertEquals_(8, doc.fingerprint.length);
}

function AKS_testAnalyticsHtmlReport_matchesGold006_() {
  var gold = AKS.Tests.AnalyticsGoldDatasets.filter(function (dataset) { return dataset.id === "GOLD-006"; })[0];
  var restitution = AKS.Analytics.RestitutionModel.build(AKS.Analytics.CourseOrchestrator.run(gold.input.orchestration));
  var content = AKS.Analytics.ReportContent.build(restitution);
  var charts = AKS.Analytics.ChartModel.build(content);
  var result = AKS.Analytics.HtmlReportGenerator.build(AKS.Analytics.ReportLayout.build(content, charts));
  assertEquals_(gold.expected.htmlReports.documentCount, result.documents.length);
  assertEquals_(gold.expected.htmlReports.mimeType, result.mime_type);
  assertEquals_(gold.expected.htmlReports.globalState, result.documents[result.documents.length - 1].state);
}

function AKS_testAnalyticsHtmlReport_isDeterministicPureAndImmutable_() {
  var input = AKS_analyticsHtmlReportInput_();
  var before = JSON.stringify(input);
  var first = AKS.Analytics.HtmlReportGenerator.build(input);
  var second = AKS.Analytics.HtmlReportGenerator.build(input);
  assertEquals_(before, JSON.stringify(input));
  assertEquals_(0, AKS.Analytics.GoldDatasetSupport.compare(first, second).length);
  assertTrue_(Object.isFrozen(first.documents));
  assertTrue_(Object.isFrozen(first.documents[0].source_versions));
}

function AKS_runAnalyticsHtmlReportSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — rapports HTML A4", [
    { name: "ANALYTICS / documents autonomes", test: AKS_testAnalyticsHtmlReport_buildsAutonomousDocuments_ },
    { name: "ANALYTICS / sortie A4 imprimable", test: AKS_testAnalyticsHtmlReport_definesA4PrintOutput_ },
    { name: "ANALYTICS / graphiques SVG intégrés", test: AKS_testAnalyticsHtmlReport_rendersIntegratedSvg_ },
    { name: "ANALYTICS / valeurs sans recalcul", test: AKS_testAnalyticsHtmlReport_preservesValuesWithoutRecalculation_ },
    { name: "ANALYTICS / indisponible sans zéro", test: AKS_testAnalyticsHtmlReport_marksUnavailableWithoutZero_ },
    { name: "ANALYTICS / échappement HTML", test: AKS_testAnalyticsHtmlReport_escapesUntrustedContent_ },
    { name: "ANALYTICS / variante globale", test: AKS_testAnalyticsHtmlReport_rendersGlobalVariant_ },
    { name: "ANALYTICS / versions et empreinte", test: AKS_testAnalyticsHtmlReport_exposesVersionsAndFingerprint_ },
    { name: "ANALYTICS / rapports HTML GOLD-006", test: AKS_testAnalyticsHtmlReport_matchesGold006_ },
    { name: "ANALYTICS / rapports HTML immuables", test: AKS_testAnalyticsHtmlReport_isDeterministicPureAndImmutable_ }
  ]);
}
