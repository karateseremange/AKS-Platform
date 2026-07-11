/**
 * Runs RC 0.3.0 / HQ-005.2 Sprint 2 tests.
 *
 * @returns {Object}
 */
function AKS_runHQ0052Sprint2Tests() {
  var tests = [
    test_HQ0052Sprint2_viewModelExposesUxPresentationData,
    test_HQ0052Sprint2_identityValidationAcceptsValidMinor,
    test_HQ0052Sprint2_identityValidationRejectsInvalidEmail,
    test_HQ0052Sprint2_identityValidationRejectsAdult,
    test_HQ0052Sprint2_identityValidationRejectsMissingSex
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
    feature: "HQ-005.2-Sprint-2",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
