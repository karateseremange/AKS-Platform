/**
 * Runs RC 0.3.0 - HQ-005.2 Sprint 4.2 tests.
 *
 * @returns {Object}
 */
function AKS_runHQ0052Sprint42Tests() {
  var tests = [
    test_HQ0052_S42_flowIncludesDeclarationStep,
    test_HQ0052_S42_prepareDeclarationAllNo,
    test_HQ0052_S42_prepareDeclarationWithYes,
    test_HQ0052_S42_prepareDeclarationRejectsMissingAnswer,
    test_HQ0052_S42_validateDeclarationRequiresConsent,
    test_HQ0052_S42_validateDeclarationAcceptsValidData
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
    feature: "HQ-005.2-SPRINT-4.2",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
