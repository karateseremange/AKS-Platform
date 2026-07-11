function AKS_runHQ0052Sprint2FixTests() {
  var tests = [
    test_HQ0052Sprint2Fix_campaignNameIsNotDuplicatedBySeason,
    test_HQ0052Sprint2Fix_clientContainsDeferredInitialization,
    test_HQ0052Sprint2Fix_clientContainsExplicitFieldFeedback
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
    feature: "HQ-005.2-Sprint-2-Fix",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
