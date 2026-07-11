/**
 * Runs RC 0.3.0 / HQ-005.2 Sprint 3 tests.
 *
 * @returns {Object}
 */
function AKS_runHQ0052Sprint3Tests() {
  var tests = [
    test_HQ0052Sprint3_questionnaireValidationAcceptsCompleteAnswers,
    test_HQ0052Sprint3_questionnaireValidationRejectsMissingAnswer,
    test_HQ0052Sprint3_questionnaireValidationRejectsInvalidValue,
    test_HQ0052Sprint3_questionnaireViewModelKeepsQuestionOrder,
    test_HQ0052Sprint3_questionnaireValidationDoesNotPersistAnswers
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
    feature: "HQ-005.2-Sprint-3",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
