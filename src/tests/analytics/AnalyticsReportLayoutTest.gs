function AKS_analyticsReportLayoutInput_() {
  var content = AKS_analyticsChartModelInput_();
  return {
    content: content,
    charts: AKS.Analytics.ChartModel.build(content)
  };
}

function AKS_testAnalyticsReportLayout_buildsCourseAndGlobalCompositions_() {
  var input = AKS_analyticsReportLayoutInput_();
  var result = AKS.Analytics.ReportLayout.build(input.content, input.charts);
  assertEquals_(3, result.compositions.length);
  assertEquals_("COURSE", result.compositions[0].variant);
  assertEquals_("GLOBAL", result.compositions[2].variant);
}

function AKS_testAnalyticsReportLayout_usesHarmonizedCourseStructure_() {
  var input = AKS_analyticsReportLayoutInput_();
  var layouts = AKS.Analytics.ReportLayout.build(input.content, input.charts).compositions;
  assertEquals_(layouts[0].sections.map(function (item) { return item.code; }).join("|"),
    layouts[1].sections.map(function (item) { return item.code; }).join("|"));
}

function AKS_testAnalyticsReportLayout_ordersRequiredSections_() {
  var input = AKS_analyticsReportLayoutInput_();
  var codes = AKS.Analytics.ReportLayout.build(input.content, input.charts)
    .compositions[0].sections.map(function (item) { return item.code; });
  assertEquals_("SUMMARY|INDICATORS|CHART|DATA_QUALITY|WARNINGS|LIMITS|METHOD", codes.join("|"));
}

function AKS_testAnalyticsReportLayout_placesMatchingChartWithoutRecalculation_() {
  var input = AKS_analyticsReportLayoutInput_();
  var layout = AKS.Analytics.ReportLayout.build(input.content, input.charts).compositions[0];
  var chart = layout.sections.filter(function (item) { return item.code === "CHART"; })[0].content.chart;
  assertEquals_(layout.report_code, chart.report_code);
  assertEquals_(input.charts.charts[0].series[0].points[0].value, chart.series[0].points[0].value);
}

function AKS_testAnalyticsReportLayout_appliesConditionalVisibility_() {
  var input = AKS_analyticsReportLayoutInput_();
  var copy = JSON.parse(JSON.stringify(input.content));
  copy.reports[0].warnings = [];
  copy.reports[0].limits = [];
  var charts = AKS.Analytics.ChartModel.build(copy);
  var sections = AKS.Analytics.ReportLayout.build(copy, charts).compositions[0].sections;
  assertEquals_(false, sections.filter(function (item) { return item.code === "WARNINGS"; })[0].visible);
  assertEquals_(false, sections.filter(function (item) { return item.code === "LIMITS"; })[0].visible);
}

function AKS_testAnalyticsReportLayout_preservesUnavailableState_() {
  var input = AKS_analyticsReportLayoutInput_();
  var copy = JSON.parse(JSON.stringify(input.content));
  copy.reports[0].state = "NON_CALCULABLE";
  copy.reports[0].indicators[0].raw_value = null;
  copy.reports[0].indicators[0].state = "NON_CALCULABLE";
  var result = AKS.Analytics.ReportLayout.build(copy, AKS.Analytics.ChartModel.build(copy));
  assertEquals_("NON_CALCULABLE", result.compositions[0].state);
  assertEquals_(false, result.compositions[0].sections[1].content.unavailable_is_zero);
}

function AKS_testAnalyticsReportLayout_buildsGlobalOverview_() {
  var input = AKS_analyticsReportLayoutInput_();
  var global = AKS.Analytics.ReportLayout.build(input.content, input.charts).compositions[2];
  var overview = global.sections.filter(function (item) { return item.code === "COURSE_OVERVIEW"; })[0];
  assertEquals_(true, overview.visible);
  assertEquals_(2, overview.content.chart_categories.length);
  assertEquals_(true, overview.content.unavailable_courses_visible);
}

function AKS_testAnalyticsReportLayout_definesA4AccessiblePrintContract_() {
  var input = AKS_analyticsReportLayoutInput_();
  var result = AKS.Analytics.ReportLayout.build(input.content, input.charts);
  assertEquals_("A4", result.page.format);
  assertEquals_("PORTRAIT", result.page.orientation);
  assertEquals_(true, result.compositions[0].accessibility.information_not_color_only);
  assertEquals_(true, result.compositions[0].accessibility.print_compatible);
}

function AKS_testAnalyticsReportLayout_matchesGold006_() {
  var gold = AKS.Tests.AnalyticsGoldDatasets.filter(function (dataset) { return dataset.id === "GOLD-006"; })[0];
  var restitution = AKS.Analytics.RestitutionModel.build(AKS.Analytics.CourseOrchestrator.run(gold.input.orchestration));
  var content = AKS.Analytics.ReportContent.build(restitution);
  var result = AKS.Analytics.ReportLayout.build(content, AKS.Analytics.ChartModel.build(content));
  assertEquals_(gold.expected.reportLayout.compositionCount, result.compositions.length);
  assertEquals_(gold.expected.reportLayout.globalState, result.compositions[result.compositions.length - 1].state);
}

function AKS_testAnalyticsReportLayout_isDeterministicPureAndImmutable_() {
  var input = AKS_analyticsReportLayoutInput_();
  var before = JSON.stringify(input);
  var first = AKS.Analytics.ReportLayout.build(input.content, input.charts);
  var second = AKS.Analytics.ReportLayout.build(input.content, input.charts);
  assertEquals_(before, JSON.stringify(input));
  assertEquals_(0, AKS.Analytics.GoldDatasetSupport.compare(first, second).length);
  assertTrue_(Object.isFrozen(first.compositions[0].sections));
  assertTrue_(Object.isFrozen(first.compositions[0].header));
}

function AKS_runAnalyticsReportLayoutSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — mise en page des rapports", [
    { name: "ANALYTICS / compositions cours et global", test: AKS_testAnalyticsReportLayout_buildsCourseAndGlobalCompositions_ },
    { name: "ANALYTICS / composition harmonisée", test: AKS_testAnalyticsReportLayout_usesHarmonizedCourseStructure_ },
    { name: "ANALYTICS / ordre des sections", test: AKS_testAnalyticsReportLayout_ordersRequiredSections_ },
    { name: "ANALYTICS / graphique sans recalcul", test: AKS_testAnalyticsReportLayout_placesMatchingChartWithoutRecalculation_ },
    { name: "ANALYTICS / visibilité conditionnelle", test: AKS_testAnalyticsReportLayout_appliesConditionalVisibility_ },
    { name: "ANALYTICS / état indisponible", test: AKS_testAnalyticsReportLayout_preservesUnavailableState_ },
    { name: "ANALYTICS / vue globale", test: AKS_testAnalyticsReportLayout_buildsGlobalOverview_ },
    { name: "ANALYTICS / contrat A4 accessible", test: AKS_testAnalyticsReportLayout_definesA4AccessiblePrintContract_ },
    { name: "ANALYTICS / mise en page GOLD-006", test: AKS_testAnalyticsReportLayout_matchesGold006_ },
    { name: "ANALYTICS / mise en page immuable", test: AKS_testAnalyticsReportLayout_isDeterministicPureAndImmutable_ }
  ]);
}
