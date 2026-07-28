function AKS_analyticsOrchestratorInput_() {
  return {
    season: "2026-2027",
    expected_courses: ["BABY", "ENFANT_1"],
    courses: [
      {
        code: "BABY",
        attendances: [
          { session_date: "2026-09-05", licencie_id: "LIC-000001", status: "PRESENT" },
          { session_date: "2026-09-05", licencie_id: "LIC-000002", status: "ABSENT" }
        ]
      },
      {
        code: "ENFANT_1",
        attendances: [
          { session_date: "2026-09-05", licencie_id: "LIC-000003", status: "PRESENT" }
        ]
      }
    ]
  };
}

function AKS_testAnalyticsOrchestrator_processesCoursesIndependently_() {
  var result = AKS.Analytics.CourseOrchestrator.run(AKS_analyticsOrchestratorInput_());
  assertEquals_(2, result.courses.length);
  assertEquals_(2, result.summary.exploitable_count);
  assertEquals_("VALIDE", result.state);
}

function AKS_testAnalyticsOrchestrator_isolatesCourseFailure_() {
  var input = AKS_analyticsOrchestratorInput_();
  input.courses[1].attendances[0].status = "INCONNU";
  var result = AKS.Analytics.CourseOrchestrator.run(input);
  assertEquals_("VALIDE", result.courses[0].state);
  assertEquals_("ERREUR", result.courses[1].state);
  assertEquals_("PARTIEL", result.state);
}

function AKS_testAnalyticsOrchestrator_preservesPartialCourse_() {
  var input = AKS_analyticsOrchestratorInput_();
  input.courses[0].attendances.push({
    session_date: "2026-09-12", licencie_id: "LIC-000001", status: "NON_RENSEIGNE"
  });
  var result = AKS.Analytics.CourseOrchestrator.run(input);
  assertEquals_("PARTIEL", result.courses[0].state);
  assertEquals_(true, result.courses[0].exploitable);
}

function AKS_testAnalyticsOrchestrator_reportsMissingExpectedCourse_() {
  var input = AKS_analyticsOrchestratorInput_();
  input.courses.pop();
  var result = AKS.Analytics.CourseOrchestrator.run(input);
  assertEquals_("ENFANT_1", result.missing_courses[0]);
  assertEquals_("COURS_ATTENDU_ABSENT", result.courses[1].diagnostics.errors[0].code);
}

function AKS_testAnalyticsOrchestrator_excludesHistoricalWomensCourse_() {
  var result = AKS.Analytics.CourseOrchestrator.run({
    season: "2025-2026",
    expected_courses: ["BABY", "FEMININ"],
    courses: [
      { code: "BABY", attendances: [
        { session_date: "2025-09-06", licencie_id: "LIC-000001", status: "PRESENT" }
      ] },
      { code: "FEMININ", attendances: [
        { session_date: "2025-09-06", licencie_id: "LIC-000002", status: "PRESENT" }
      ] }
    ]
  });
  assertEquals_("EXCLU", result.courses[1].state);
  assertEquals_("PARTIEL", result.state);
}

function AKS_testAnalyticsOrchestrator_returnsErrorWithoutExploitableCourse_() {
  var result = AKS.Analytics.CourseOrchestrator.run({
    season: "2026-2027", expected_courses: ["BABY"], courses: []
  });
  assertEquals_("ERREUR", result.state);
  assertEquals_(0, result.summary.exploitable_count);
}

function AKS_testAnalyticsOrchestrator_buildsWeightedGlobalAggregate_() {
  var result = AKS.Analytics.CourseOrchestrator.run(AKS_analyticsOrchestratorInput_());
  var aggregate = result.global_aggregates[0].participation;
  assertEquals_(2, aggregate.numerator);
  assertEquals_(3, aggregate.denominator);
  assertEquals_(2 / 3, aggregate.value);
}

function AKS_testAnalyticsOrchestrator_propagatesDiagnostics_() {
  var input = AKS_analyticsOrchestratorInput_();
  input.courses[0].attendances.push(input.courses[0].attendances[0]);
  var result = AKS.Analytics.CourseOrchestrator.run(input);
  assertEquals_("DOUBLON_IDENTIQUE", result.courses[0].diagnostics.warnings[0].code);
  assertEquals_(1, result.courses[0].consolidation.duplicate_count);
}

function AKS_testAnalyticsOrchestrator_matchesGold006_() {
  var gold = AKS.Tests.AnalyticsGoldDatasets.filter(function (dataset) {
    return dataset.id === "GOLD-006";
  })[0];
  var result = AKS.Analytics.CourseOrchestrator.run(gold.input.orchestration);
  assertEquals_(gold.expected.publishedCourses, result.summary.exploitable_count);
  assertEquals_(gold.expected.failedCourses[0], result.courses.filter(function (course) {
    return course.state === "ERREUR";
  })[0].course_code);
  assertEquals_(gold.expected.globalOutcome, result.state);
}

function AKS_testAnalyticsOrchestrator_isDeterministicPureAndImmutable_() {
  var input = AKS_analyticsOrchestratorInput_();
  var before = JSON.stringify(input);
  var first = AKS.Analytics.CourseOrchestrator.run(input);
  var reversed = AKS_analyticsOrchestratorInput_();
  reversed.courses.reverse();
  var second = AKS.Analytics.CourseOrchestrator.run(reversed);
  assertEquals_(before, JSON.stringify(input));
  assertEquals_(0, AKS.Analytics.GoldDatasetSupport.compare(first, second).length);
  assertTrue_(Object.isFrozen(first.courses[0].diagnostics), "Le résultat doit être profondément immuable.");
}

function AKS_runAnalyticsCourseOrchestratorSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — orchestration par cours", [
    { name: "ANALYTICS / cours indépendants", test: AKS_testAnalyticsOrchestrator_processesCoursesIndependently_ },
    { name: "ANALYTICS / isolation d'un échec", test: AKS_testAnalyticsOrchestrator_isolatesCourseFailure_ },
    { name: "ANALYTICS / résultat partiel exploitable", test: AKS_testAnalyticsOrchestrator_preservesPartialCourse_ },
    { name: "ANALYTICS / cours attendu absent", test: AKS_testAnalyticsOrchestrator_reportsMissingExpectedCourse_ },
    { name: "ANALYTICS / cours féminin historique", test: AKS_testAnalyticsOrchestrator_excludesHistoricalWomensCourse_ },
    { name: "ANALYTICS / aucun cours exploitable", test: AKS_testAnalyticsOrchestrator_returnsErrorWithoutExploitableCourse_ },
    { name: "ANALYTICS / agrégation globale pondérée", test: AKS_testAnalyticsOrchestrator_buildsWeightedGlobalAggregate_ },
    { name: "ANALYTICS / propagation diagnostics", test: AKS_testAnalyticsOrchestrator_propagatesDiagnostics_ },
    { name: "ANALYTICS / conformité GOLD-006", test: AKS_testAnalyticsOrchestrator_matchesGold006_ },
    { name: "ANALYTICS / pureté et immutabilité", test: AKS_testAnalyticsOrchestrator_isDeterministicPureAndImmutable_ }
  ]);
}
