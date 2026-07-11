function test_runHealthQuestionnaireSuite() {
  var tests = [
    test_HealthQuestionnaire_allNoIsEligible,
    test_HealthQuestionnaire_yesRequiresMedicalReview,
    test_HealthQuestionnaire_missingAnswerIsIncomplete
  ];
  var passed = 0;
  tests.forEach(function (testCase) { testCase(); passed += 1; });
  return {ok: true, passed: passed, total: tests.length};
}
