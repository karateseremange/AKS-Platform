/**
 * Runs HQ-005.1 public Web App tests.
 *
 * @returns {Object}
 */
function AKS_runHQ0051Tests() {
  var tests = [
    test_HQ0051_webContextFailsWithoutActiveCampaign,
    test_HQ0051_webContextRejectsClosedCampaign,
    test_HQ0051_webContextLoadsActiveQuestionnaire,
    test_HQ0051_webContextExposesNoTechnicalIdentifiers,
    test_HQ0051_webContextUsesAksBrandingAndTwoSteps
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
    feature: "HQ-005.1",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
