/**
 * Runs HQ-005.2 Sprint 1 Web foundation tests.
 *
 * @returns {Object}
 */
function AKS_runHQ0052Sprint1Tests() {
  var tests = [
    test_HQ0052Sprint1_flowIsExplicitAndOrdered,
    test_HQ0052Sprint1_stepCountIsDerivedFromFlow,
    test_HQ0052Sprint1_flowContainsPresentationDataOnly
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
    feature: "HQ-005.2-Sprint-1",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
