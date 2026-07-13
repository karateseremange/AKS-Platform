/** Runs HQ-009.1 signed connector contract tests. */
function AKS_runHQ009Tests() {
  var tests = [
    test_HQ009_acceptsValidSignedContextRequest,
    test_HQ009_rejectsInvalidSignatureBeforePayloadParsing,
    test_HQ009_rejectsExpiredRequest,
    test_HQ009_rejectsNonceReplay,
    test_HQ009_routesSubmitWithoutPersistingPayloadInCache
  ];
  var results = [];

  tests.forEach(function (testCase) {
    testCase();
    results.push({ name: testCase.name, status: "PASSED" });
  });

  var report = {
    ok: true,
    feature: "HQ-009.1",
    passed: results.length,
    total: tests.length,
    results: results
  };
  console.log(JSON.stringify(report));
  return report;
}
