function AKS_runLogger001Tests() {
  var tests = [
    AKS_testLogger_exposesStablePublicApi,
    AKS_testLogger_acceptsCallsWithoutContext,
    AKS_testLogger_acceptsOptionalContext,
    AKS_testLogger_delegatesToInternalProvider
  ];
  var passed = 0;
  var results = [];

  tests.forEach(function (testCase) {
    testCase();
    passed += 1;
    results.push({
      name: testCase.name,
      status: "PASSED"
    });
  });

  var report = {
    ok: true,
    feature: "LOGGER-001",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
