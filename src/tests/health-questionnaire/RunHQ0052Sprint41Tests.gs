/**
 * Runs RC 0.3.0 - HQ-005.2 Sprint 4.1 tests.
 *
 * @returns {Object}
 */
function AKS_runHQ0052Sprint41Tests() {
  var tests = [
    test_HQ0052_S41_allNoAllowsAttestation,
    test_HQ0052_S41_oneYesRequiresCertificate,
    test_HQ0052_S41_countsAllPositiveAnswers,
    test_HQ0052_S41_acceptsQuestionAnswerMap,
    test_HQ0052_S41_rejectsMissingAnswers,
    test_HQ0052_S41_rejectsInvalidAnswer,
    test_HQ0052_S41_resultContainsNoDetailedAnswers
  ];

  var results = [];
  var passed = 0;

  tests.forEach(function (testCase) {
    testCase();
    passed += 1;
    results.push({ name: testCase.name, status: "PASSED" });
  });

  var report = {
    ok: true,
    feature: "HQ-005.2-SPRINT-4.1",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
