function AKS_analyticsReportContentInput_() {
  return AKS.Analytics.RestitutionModel.build(AKS_analyticsRestitutionInput_());
}

function AKS_testAnalyticsReportContent_buildsCourseAndGlobalReports_() {
  var result = AKS.Analytics.ReportContent.build(AKS_analyticsReportContentInput_());
  assertEquals_(3, result.reports.length);
  assertEquals_("COURS", result.reports[0].report_type);
  assertEquals_("GLOBAL", result.reports[2].report_type);
}

function AKS_testAnalyticsReportContent_usesHarmonizedStructure_() {
  var reports = AKS.Analytics.ReportContent.build(AKS_analyticsReportContentInput_()).reports;
  assertEquals_(Object.keys(reports[0]).sort().join("|"), Object.keys(reports[1]).sort().join("|"));
  assertEquals_(2, reports[0].indicators.length);
}

function AKS_testAnalyticsReportContent_formatsMetricsWithoutRecalculation_() {
  var report = AKS.Analytics.ReportContent.build(AKS_analyticsReportContentInput_()).reports[0];
  assertEquals_(0.5, report.indicators[0].raw_value);
  assertEquals_("50,0 %", report.indicators[0].display_value);
  assertEquals_(1, report.indicators[0].numerator);
  assertEquals_(2, report.indicators[0].denominator);
}

function AKS_testAnalyticsReportContent_exposesCoverage_() {
  var report = AKS.Analytics.ReportContent.build(AKS_analyticsReportContentInput_()).reports[0];
  assertEquals_(1, report.indicators[0].coverage_rate);
  assertEquals_("100,0 %", report.indicators[0].display_coverage);
}

function AKS_testAnalyticsReportContent_preservesPartialState_() {
  var input = AKS_analyticsOrchestratorInput_();
  input.courses[0].attendances.push({
    session_date: "2026-09-12", licencie_id: "LIC-000001", status: "NON_RENSEIGNE"
  });
  var model = AKS.Analytics.RestitutionModel.build(AKS.Analytics.CourseOrchestrator.run(input));
  var report = AKS.Analytics.ReportContent.build(model).reports.filter(function (item) {
    return item.report_code === "BABY";
  })[0];
  assertEquals_("PARTIEL", report.state);
  assertTrue_(report.indicators[0].display_coverage !== "100,0 %");
}

function AKS_testAnalyticsReportContent_marksUnavailableCourse_() {
  var input = AKS_analyticsOrchestratorInput_();
  input.courses[1].attendances[0].status = "INCONNU";
  var model = AKS.Analytics.RestitutionModel.build(AKS.Analytics.CourseOrchestrator.run(input));
  var report = AKS.Analytics.ReportContent.build(model).reports.filter(function (item) {
    return item.report_code === "ENFANT_1";
  })[0];
  assertEquals_("NON_CALCULABLE", report.state);
  assertTrue_(report.warnings.indexOf("RESULTAT_NON_CALCULABLE") >= 0);
}

function AKS_testAnalyticsReportContent_mentionsHistoricalWomensExclusion_() {
  var model = AKS.Analytics.RestitutionModel.build(AKS.Analytics.CourseOrchestrator.run({
    season: "2025-2026", expected_courses: ["BABY", "FEMININ"], courses: [
      { code: "BABY", attendances: [
        { session_date: "2025-09-06", licencie_id: "LIC-000001", status: "PRESENT" }
      ] },
      { code: "FEMININ", attendances: [
        { session_date: "2025-09-06", licencie_id: "LIC-000002", status: "PRESENT" }
      ] }
    ]
  }));
  var reports = AKS.Analytics.ReportContent.build(model).reports;
  assertTrue_(reports[0].limits.some(function (item) {
    return item.code === "FEMININ_HORS_PERIMETRE_HISTORIQUE";
  }));
}

function AKS_testAnalyticsReportContent_exposesDisabledIndicatorsWithoutScore_() {
  var result = AKS.Analytics.ReportContent.build(AKS_analyticsReportContentInput_());
  var disabled = result.reports[0].limits.filter(function (item) {
    return item.code === "INDICATEUR_NON_CALCULABLE";
  });
  assertEquals_(3, disabled.length);
  assertEquals_(undefined, result.score_aks);
}

function AKS_testAnalyticsReportContent_matchesGold006_() {
  var gold = AKS.Tests.AnalyticsGoldDatasets.filter(function (dataset) {
    return dataset.id === "GOLD-006";
  })[0];
  var model = AKS.Analytics.RestitutionModel.build(
    AKS.Analytics.CourseOrchestrator.run(gold.input.orchestration)
  );
  var result = AKS.Analytics.ReportContent.build(model);
  assertEquals_(gold.expected.reportContent.reportCount, result.reports.length);
  assertEquals_(gold.expected.reportContent.globalState, result.reports[result.reports.length - 1].state);
}

function AKS_testAnalyticsReportContent_isDeterministicPureAndImmutable_() {
  var input = AKS_analyticsReportContentInput_();
  var before = JSON.stringify(input);
  var first = AKS.Analytics.ReportContent.build(input);
  var second = AKS.Analytics.ReportContent.build(input);
  assertEquals_(before, JSON.stringify(input));
  assertEquals_(0, AKS.Analytics.GoldDatasetSupport.compare(first, second).length);
  assertTrue_(Object.isFrozen(first.reports[0].indicators));
  assertTrue_(Object.isFrozen(first.reports[0].limits));
}

function AKS_runAnalyticsReportContentSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — contenu des rapports", [
    { name: "ANALYTICS / cinq rapports logiques", test: AKS_testAnalyticsReportContent_buildsCourseAndGlobalReports_ },
    { name: "ANALYTICS / structure harmonisée", test: AKS_testAnalyticsReportContent_usesHarmonizedStructure_ },
    { name: "ANALYTICS / métriques non recalculées", test: AKS_testAnalyticsReportContent_formatsMetricsWithoutRecalculation_ },
    { name: "ANALYTICS / couverture visible", test: AKS_testAnalyticsReportContent_exposesCoverage_ },
    { name: "ANALYTICS / état partiel", test: AKS_testAnalyticsReportContent_preservesPartialState_ },
    { name: "ANALYTICS / cours indisponible", test: AKS_testAnalyticsReportContent_marksUnavailableCourse_ },
    { name: "ANALYTICS / exclusion cours féminin", test: AKS_testAnalyticsReportContent_mentionsHistoricalWomensExclusion_ },
    { name: "ANALYTICS / indicateurs désactivés", test: AKS_testAnalyticsReportContent_exposesDisabledIndicatorsWithoutScore_ },
    { name: "ANALYTICS / contenu GOLD-006", test: AKS_testAnalyticsReportContent_matchesGold006_ },
    { name: "ANALYTICS / contenu immuable", test: AKS_testAnalyticsReportContent_isDeterministicPureAndImmutable_ }
  ]);
}
