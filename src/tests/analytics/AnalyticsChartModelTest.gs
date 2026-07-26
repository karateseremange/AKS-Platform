function AKS_analyticsChartModelInput_() {
  return AKS.Analytics.ReportContent.build(AKS_analyticsReportContentInput_());
}

function AKS_testAnalyticsChartModel_buildsCourseAndGlobalCharts_() {
  var result = AKS.Analytics.ChartModel.build(AKS_analyticsChartModelInput_());
  assertEquals_(3, result.charts.length);
  assertEquals_("GROUPED_BAR", result.charts[0].chart_type);
  assertEquals_("GROUPED_BAR_WITH_REFERENCE", result.charts[2].chart_type);
}

function AKS_testAnalyticsChartModel_usesFixedPercentageAxis_() {
  var chart = AKS.Analytics.ChartModel.build(AKS_analyticsChartModelInput_()).charts[0];
  assertEquals_(0, chart.axis.minimum);
  assertEquals_(100, chart.axis.maximum);
  assertEquals_("%", chart.axis.unit);
}

function AKS_testAnalyticsChartModel_preservesValuesWithoutRecalculation_() {
  var chart = AKS.Analytics.ChartModel.build(AKS_analyticsChartModelInput_()).charts[0];
  assertEquals_(50, chart.series[0].points[0].value);
  assertEquals_("50,0 %", chart.series[0].points[0].display_value);
  assertEquals_(1, chart.series[0].points[0].numerator);
  assertEquals_(2, chart.series[0].points[0].denominator);
}

function AKS_testAnalyticsChartModel_exposesCoverageSeparately_() {
  var chart = AKS.Analytics.ChartModel.build(AKS_analyticsChartModelInput_()).charts[0];
  assertEquals_("100,0 %", chart.coverage.participation);
  assertEquals_("DOTS", chart.coverage.pattern);
}

function AKS_testAnalyticsChartModel_marksUnavailableWithoutZero_() {
  var content = AKS_analyticsChartModelInput_();
  content = JSON.parse(JSON.stringify(content));
  content.reports[0].indicators[0].state = "NON_CALCULABLE";
  content.reports[0].indicators[0].raw_value = null;
  var point = AKS.Analytics.ChartModel.build(content).charts[0].series[0].points[0];
  assertEquals_(null, point.value);
  assertEquals_("Indisponible", point.display_value);
  assertEquals_(false, point.available);
}

function AKS_testAnalyticsChartModel_buildsGlobalComparisonAndReferences_() {
  var chart = AKS.Analytics.ChartModel.build(AKS_analyticsChartModelInput_()).charts[2];
  assertEquals_(2, chart.categories.length);
  assertEquals_(2, chart.series.length);
  assertEquals_(2, chart.references.length);
  assertEquals_("PONDEREE_EN_AMONT", chart.aggregation);
}

function AKS_testAnalyticsChartModel_usesAccessiblePrintConventions_() {
  var result = AKS.Analytics.ChartModel.build(AKS_analyticsChartModelInput_());
  assertTrue_(result.patterns.participation !== result.patterns.assiduity);
  assertTrue_(result.palette.participation !== result.palette.assiduity);
  assertEquals_(true, result.charts[0].unavailable_convention.zero_is_not_unavailable);
}

function AKS_testAnalyticsChartModel_excludesDisabledIndicatorsAndScore_() {
  var result = AKS.Analytics.ChartModel.build(AKS_analyticsChartModelInput_());
  assertEquals_(2, result.charts[0].series.length);
  assertEquals_(undefined, result.score_aks);
  assertTrue_(result.charts[0].series.every(function (series) {
    return series.code === "PARTICIPATION" || series.code === "ASSIDUITE";
  }));
}

function AKS_testAnalyticsChartModel_matchesGold006_() {
  var gold = AKS.Tests.AnalyticsGoldDatasets.filter(function (dataset) {
    return dataset.id === "GOLD-006";
  })[0];
  var model = AKS.Analytics.RestitutionModel.build(
    AKS.Analytics.CourseOrchestrator.run(gold.input.orchestration)
  );
  var content = AKS.Analytics.ReportContent.build(model);
  var result = AKS.Analytics.ChartModel.build(content);
  assertEquals_(gold.expected.chartModel.chartCount, result.charts.length);
  assertEquals_(gold.expected.chartModel.globalState, result.charts[result.charts.length - 1].state);
}

function AKS_testAnalyticsChartModel_isDeterministicPureAndImmutable_() {
  var input = AKS_analyticsChartModelInput_();
  var before = JSON.stringify(input);
  var first = AKS.Analytics.ChartModel.build(input);
  var second = AKS.Analytics.ChartModel.build(input);
  assertEquals_(before, JSON.stringify(input));
  assertEquals_(0, AKS.Analytics.GoldDatasetSupport.compare(first, second).length);
  assertTrue_(Object.isFrozen(first.charts[0].series));
  assertTrue_(Object.isFrozen(first.charts[0].series[0].points));
}

function AKS_runAnalyticsChartModelSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — modèle graphique", [
    { name: "ANALYTICS / graphiques cours et global", test: AKS_testAnalyticsChartModel_buildsCourseAndGlobalCharts_ },
    { name: "ANALYTICS / axe pourcentage fixe", test: AKS_testAnalyticsChartModel_usesFixedPercentageAxis_ },
    { name: "ANALYTICS / valeurs non recalculées", test: AKS_testAnalyticsChartModel_preservesValuesWithoutRecalculation_ },
    { name: "ANALYTICS / couverture distincte", test: AKS_testAnalyticsChartModel_exposesCoverageSeparately_ },
    { name: "ANALYTICS / indisponible sans zéro", test: AKS_testAnalyticsChartModel_marksUnavailableWithoutZero_ },
    { name: "ANALYTICS / comparaison globale", test: AKS_testAnalyticsChartModel_buildsGlobalComparisonAndReferences_ },
    { name: "ANALYTICS / accessibilité impression", test: AKS_testAnalyticsChartModel_usesAccessiblePrintConventions_ },
    { name: "ANALYTICS / indicateurs exclus", test: AKS_testAnalyticsChartModel_excludesDisabledIndicatorsAndScore_ },
    { name: "ANALYTICS / graphique GOLD-006", test: AKS_testAnalyticsChartModel_matchesGold006_ },
    { name: "ANALYTICS / graphique immuable", test: AKS_testAnalyticsChartModel_isDeterministicPureAndImmutable_ }
  ]);
}
