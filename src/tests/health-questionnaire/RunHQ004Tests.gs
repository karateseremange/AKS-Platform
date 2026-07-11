/**
 * Runs HQ-004 submission v2 tests.
 *
 * @returns {Object}
 */
function AKS_runHQ004Tests() {
  var tests = [
    test_HQ004_submissionRejectsDetailedAnswers,
    test_HQ004_submissionCalculatesMinorAge,
    test_HQ004_submissionRejectsAdult,
    test_HQ004_positiveAnswerStoresOnlyAdministrativeResult,
    test_HQ004_incompleteAssessmentIsNotPersisted
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
    feature: "HQ-004",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
