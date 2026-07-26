function AKS_analyticsIndicatorFixture_() {
  var datasets = AKS.Tests && AKS.Tests.AnalyticsGoldDatasets;
  if (datasets) {
    return datasets.filter(function (dataset) { return dataset.id === "GOLD-001"; })[0].input.attendances;
  }
  return [
    { season: "2026-2027", course_code: "BABY", session_date: "2026-09-05", licencie_id: "LIC-000001", status: "PRESENT" },
    { season: "2026-2027", course_code: "BABY", session_date: "2026-09-05", licencie_id: "LIC-000002", status: "ABSENT" },
    { season: "2026-2027", course_code: "BABY", session_date: "2026-09-05", licencie_id: "LIC-000003", status: "EXCUSE" },
    { season: "2026-2027", course_code: "BABY", session_date: "2026-09-12", licencie_id: "LIC-000001", status: "PRESENT" },
    { season: "2026-2027", course_code: "BABY", session_date: "2026-09-12", licencie_id: "LIC-000002", status: "NON_RENSEIGNE" }
  ];
}

function AKS_testAnalyticsIndicators_calculatesSessionParticipation_() {
  var result = AKS.Analytics.IndicatorEngine.calculate({ attendances: AKS_analyticsIndicatorFixture_() });
  var first = result.participation[0];
  assertEquals_(1, first.numerator);
  assertEquals_(3, first.denominator);
  assertEquals_(1 / 3, first.value);
  assertEquals_("VALIDE", first.status);
}

function AKS_testAnalyticsIndicators_marksIncompleteCoverage_() {
  var datasets = AKS.Tests.AnalyticsGoldDatasets;
  var rows = datasets.filter(function (dataset) { return dataset.id === "GOLD-003"; })[0].input.indicatorAttendances;
  var result = AKS.Analytics.IndicatorEngine.calculate({ attendances: rows });
  var second = result.participation[0];
  assertEquals_(2, second.expected_count);
  assertEquals_(1, second.known_count);
  assertEquals_(0.5, second.coverage_rate);
  assertEquals_("PARTIEL", second.status);
}

function AKS_testAnalyticsIndicators_returnsNonCalculableWithoutKnownStatus_() {
  var result = AKS.Analytics.IndicatorEngine.calculate({ attendances: [{
    season: "2026-2027", course_code: "BABY", session_date: "2026-09-19",
    licencie_id: "LIC-000001", status: "NON_RENSEIGNE"
  }] });
  assertEquals_(null, result.participation[0].value);
  assertEquals_("NON_CALCULABLE", result.participation[0].status);
}

function AKS_testAnalyticsIndicators_calculatesIndividualAssiduity_() {
  var result = AKS.Analytics.IndicatorEngine.calculate({ attendances: AKS_analyticsIndicatorFixture_() });
  var member = result.assiduity[0];
  assertEquals_(2, member.numerator);
  assertEquals_(2, member.denominator);
  assertEquals_(1, member.value);
}

function AKS_testAnalyticsIndicators_countsExcusedInDenominator_() {
  var result = AKS.Analytics.IndicatorEngine.calculate({ attendances: AKS_analyticsIndicatorFixture_() });
  var member = result.assiduity[2];
  assertEquals_(0, member.numerator);
  assertEquals_(1, member.denominator);
  assertEquals_(1, member.counts.excused);
}

function AKS_testAnalyticsIndicators_excludesIneligibleAndCancelledRows_() {
  var datasets = AKS.Tests.AnalyticsGoldDatasets;
  var rows = datasets.filter(function (dataset) { return dataset.id === "GOLD-004"; })[0].input.indicatorAttendances;
  var result = AKS.Analytics.IndicatorEngine.calculate({ attendances: rows });
  assertEquals_(1, result.participation.length);
  assertEquals_(1, result.exclusions.length);
}

function AKS_testAnalyticsIndicators_excludesHistoricalWomensCourse_() {
  var result = AKS.Analytics.IndicatorEngine.calculate({ attendances: [{
    season: "2025-2026", course_code: "FEMININ", session_date: "2025-09-06",
    licencie_id: "LIC-000001", status: "PRESENT"
  }] });
  assertEquals_(0, result.participation.length);
  assertEquals_("FEMININ_HORS_PERIMETRE_HISTORIQUE", result.exclusions[0].code);
}

function AKS_testAnalyticsIndicators_usesWeightedAggregations_() {
  var datasets = AKS.Tests.AnalyticsGoldDatasets;
  var rows = datasets.filter(function (dataset) { return dataset.id === "GOLD-006"; })[0].input.indicatorAttendances;
  var result = AKS.Analytics.IndicatorEngine.calculate({ attendances: rows });
  var aggregate = result.course_aggregates.participation[0];
  assertEquals_(3, aggregate.numerator);
  assertEquals_(4, aggregate.denominator);
  assertEquals_(0.75, aggregate.value);
}

function AKS_testAnalyticsIndicators_exposesDisabledIndicatorsWithoutScore_() {
  var result = AKS.Analytics.IndicatorEngine.calculate({ attendances: [] });
  assertEquals_(3, result.disabled_indicators.length);
  assertEquals_("NON_CALCULABLE", result.disabled_indicators[0].status);
  assertTrue_(JSON.stringify(result).indexOf("SCORE") === -1, "Le score AKS doit rester absent.");
}

function AKS_testAnalyticsIndicators_isDeterministicAndDeeplyImmutable_() {
  var rows = AKS_analyticsIndicatorFixture_();
  var first = AKS.Analytics.IndicatorEngine.calculate({ attendances: rows });
  var second = AKS.Analytics.IndicatorEngine.calculate({ attendances: rows.slice().reverse() });
  assertEquals_(0, AKS.Analytics.GoldDatasetSupport.compare(first, second).length);
  assertTrue_(Object.isFrozen(first), "Le résultat doit être immuable.");
  assertTrue_(Object.isFrozen(first.participation[0]), "Les résultats imbriqués doivent être immuables.");
}

function AKS_runAnalyticsIndicatorSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — indicateurs", [
    { name: "ANALYTICS / participation séance", test: AKS_testAnalyticsIndicators_calculatesSessionParticipation_ },
    { name: "ANALYTICS / couverture partielle", test: AKS_testAnalyticsIndicators_marksIncompleteCoverage_ },
    { name: "ANALYTICS / dénominateur nul", test: AKS_testAnalyticsIndicators_returnsNonCalculableWithoutKnownStatus_ },
    { name: "ANALYTICS / assiduité individuelle", test: AKS_testAnalyticsIndicators_calculatesIndividualAssiduity_ },
    { name: "ANALYTICS / excusé au dénominateur", test: AKS_testAnalyticsIndicators_countsExcusedInDenominator_ },
    { name: "ANALYTICS / exclusions séance et éligibilité", test: AKS_testAnalyticsIndicators_excludesIneligibleAndCancelledRows_ },
    { name: "ANALYTICS / exclusion cours féminin", test: AKS_testAnalyticsIndicators_excludesHistoricalWomensCourse_ },
    { name: "ANALYTICS / agrégation pondérée", test: AKS_testAnalyticsIndicators_usesWeightedAggregations_ },
    { name: "ANALYTICS / indicateurs désactivés", test: AKS_testAnalyticsIndicators_exposesDisabledIndicatorsWithoutScore_ },
    { name: "ANALYTICS / déterminisme et immutabilité", test: AKS_testAnalyticsIndicators_isDeterministicAndDeeplyImmutable_ }
  ]);
}
