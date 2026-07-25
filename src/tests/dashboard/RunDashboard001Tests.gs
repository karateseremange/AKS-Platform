function AKS_runDashboard001Tests() {
  var tests = [
    { name: "API publique", run: AKS_testDashboard001ApiExists_ },
    { name: "Modèle nominal", run: AKS_testDashboard001BuildsNominalModel_ },
    { name: "Refus d'accès", run: AKS_testDashboard001PropagatesAccessDenied_ },
    { name: "Accès indisponible", run: AKS_testDashboard001FailsClosedWithoutAccessApi_ },
    { name: "Version indisponible", run: AKS_testDashboard001ReturnsPartialModelWithoutVersion_ },
    { name: "Configuration indisponible", run: AKS_testDashboard001ReturnsPartialModelWithoutConfiguration_ },
    { name: "Logger incomplet", run: AKS_testDashboard001DetectsIncompleteLoggerApi_ },
    { name: "Immuabilité récursive", run: AKS_testDashboard001ModelIsDeeplyImmutable_ },
    { name: "Copies défensives", run: AKS_testDashboard001ReturnsDefensiveCopies_ }
  ];
  var passed = 0;
  var failures = [];

  tests.forEach(function (test) {
    try {
      test.run();
      passed += 1;
    } catch (error) {
      failures.push({
        test: test.name,
        message: error && error.message ? error.message : String(error)
      });
    }
  });

  var result = {
    ok: failures.length === 0,
    feature: "DASHBOARD-001",
    passed: passed,
    total: tests.length,
    failures: failures
  };

  Logger.log(JSON.stringify(result));
  return result;
}
