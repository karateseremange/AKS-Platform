function AKS_analyticsRestitutionInput_() {
  return AKS.Analytics.CourseOrchestrator.run(AKS_analyticsOrchestratorInput_());
}

function AKS_testAnalyticsRestitution_buildsCourseAndGlobalBlocks_() {
  var result = AKS.Analytics.RestitutionModel.build(AKS_analyticsRestitutionInput_());
  assertEquals_(2, result.report.courses.length);
  assertEquals_(1, result.report.global.length);
  assertEquals_("Baby", result.report.courses[0].label);
}

function AKS_testAnalyticsRestitution_exposesAuditableMetrics_() {
  var metric = AKS.Analytics.RestitutionModel.build(
    AKS_analyticsRestitutionInput_()
  ).report.courses[0].indicators.participation;
  assertEquals_(1, metric.numerator);
  assertEquals_(2, metric.denominator);
  assertEquals_(0.5, metric.raw_value);
  assertEquals_(50, metric.display_percentage);
}

function AKS_testAnalyticsRestitution_formatsOneDecimalWithoutChangingRawValue_() {
  var input = AKS_analyticsOrchestratorInput_();
  input.courses[0].attendances.push({
    session_date: "2026-09-05", licencie_id: "LIC-000009", status: "PRESENT"
  });
  var metric = AKS.Analytics.RestitutionModel.build(
    AKS.Analytics.CourseOrchestrator.run(input)
  ).report.courses[0].indicators.participation;
  assertEquals_(2 / 3, metric.raw_value);
  assertEquals_(66.7, metric.display_percentage);
}

function AKS_testAnalyticsRestitution_separatesTechnicalDiagnostics_() {
  var input = AKS_analyticsOrchestratorInput_();
  input.courses[0].attendances.push(input.courses[0].attendances[0]);
  var result = AKS.Analytics.RestitutionModel.build(
    AKS.Analytics.CourseOrchestrator.run(input)
  );
  assertEquals_(1, result.report.courses[0].data_quality.duplicate_count);
  assertEquals_("DOUBLON_IDENTIQUE", result.technical.diagnostics_by_course[0].warnings[0].code);
  assertEquals_(undefined, result.report.courses[0].diagnostics);
}

function AKS_testAnalyticsRestitution_preservesUnavailableCourses_() {
  var input = AKS_analyticsOrchestratorInput_();
  input.courses[1].attendances[0].status = "INCONNU";
  var result = AKS.Analytics.RestitutionModel.build(
    AKS.Analytics.CourseOrchestrator.run(input)
  );
  assertEquals_(false, result.report.courses[1].available);
  assertEquals_("NON_CALCULABLE", result.report.courses[1].indicators.assiduity.status);
  assertEquals_("ENFANT_1", result.data_quality.unavailable_courses[0]);
}

function AKS_testAnalyticsRestitution_mentionsHistoricalWomensExclusion_() {
  var orchestrated = AKS.Analytics.CourseOrchestrator.run({
    season: "2025-2026", expected_courses: ["BABY", "FEMININ"], courses: [
      { code: "BABY", attendances: [
        { session_date: "2025-09-06", licencie_id: "LIC-000001", status: "PRESENT" }
      ] },
      { code: "FEMININ", attendances: [
        { session_date: "2025-09-06", licencie_id: "LIC-000002", status: "PRESENT" }
      ] }
    ]
  });
  var limits = AKS.Analytics.RestitutionModel.build(orchestrated).report.limits;
  assertTrue_(limits.some(function (item) {
    return item.code === "FEMININ_HORS_PERIMETRE_HISTORIQUE";
  }));
}

function AKS_testAnalyticsRestitution_exposesDisabledIndicatorsWithoutScore_() {
  var result = AKS.Analytics.RestitutionModel.build(AKS_analyticsRestitutionInput_());
  assertEquals_(3, result.disabled_indicator_ids.length);
  assertEquals_(undefined, result.score_aks);
  assertEquals_(undefined, result.report.score);
}

function AKS_testAnalyticsRestitution_aggregatesDataQuality_() {
  var input = AKS_analyticsOrchestratorInput_();
  input.courses[0].attendances.push(input.courses[0].attendances[0]);
  var result = AKS.Analytics.RestitutionModel.build(
    AKS.Analytics.CourseOrchestrator.run(input)
  );
  assertEquals_(3, result.data_quality.accepted_count);
  assertEquals_(1, result.data_quality.duplicate_count);
  assertEquals_(0, result.data_quality.rejected_count);
}

function AKS_testAnalyticsRestitution_matchesGold006_() {
  var gold = AKS.Tests.AnalyticsGoldDatasets.filter(function (dataset) {
    return dataset.id === "GOLD-006";
  })[0];
  var result = AKS.Analytics.RestitutionModel.build(
    AKS.Analytics.CourseOrchestrator.run(gold.input.orchestration)
  );
  assertEquals_(gold.expected.restitution.availableCourses, result.report.summary.available_course_count);
  assertEquals_(gold.expected.restitution.unavailableCourses[0], result.data_quality.unavailable_courses[0]);
  assertEquals_(gold.expected.restitution.state, result.state);
}

function AKS_testAnalyticsRestitution_isDeterministicPureAndImmutable_() {
  var input = AKS_analyticsRestitutionInput_();
  var before = JSON.stringify(input);
  var first = AKS.Analytics.RestitutionModel.build(input);
  var second = AKS.Analytics.RestitutionModel.build(input);
  assertEquals_(before, JSON.stringify(input));
  assertEquals_(0, AKS.Analytics.GoldDatasetSupport.compare(first, second).length);
  assertTrue_(Object.isFrozen(first.report.courses[0].indicators));
  assertTrue_(Object.isFrozen(first.technical.diagnostics_by_course));
}

function AKS_runAnalyticsRestitutionModelSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — modèle de restitution", [
    { name: "ANALYTICS / blocs cours et global", test: AKS_testAnalyticsRestitution_buildsCourseAndGlobalBlocks_ },
    { name: "ANALYTICS / métriques auditables", test: AKS_testAnalyticsRestitution_exposesAuditableMetrics_ },
    { name: "ANALYTICS / affichage à une décimale", test: AKS_testAnalyticsRestitution_formatsOneDecimalWithoutChangingRawValue_ },
    { name: "ANALYTICS / diagnostics séparés", test: AKS_testAnalyticsRestitution_separatesTechnicalDiagnostics_ },
    { name: "ANALYTICS / cours indisponible", test: AKS_testAnalyticsRestitution_preservesUnavailableCourses_ },
    { name: "ANALYTICS / limite cours féminin", test: AKS_testAnalyticsRestitution_mentionsHistoricalWomensExclusion_ },
    { name: "ANALYTICS / indicateurs désactivés", test: AKS_testAnalyticsRestitution_exposesDisabledIndicatorsWithoutScore_ },
    { name: "ANALYTICS / qualité consolidée", test: AKS_testAnalyticsRestitution_aggregatesDataQuality_ },
    { name: "ANALYTICS / restitution GOLD-006", test: AKS_testAnalyticsRestitution_matchesGold006_ },
    { name: "ANALYTICS / restitution immuable", test: AKS_testAnalyticsRestitution_isDeterministicPureAndImmutable_ }
  ]);
}
