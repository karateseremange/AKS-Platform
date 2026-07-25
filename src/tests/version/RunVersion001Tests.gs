function AKS_runVersion001Tests() {
  var tests = [
    { name: "API publique", run: AKS_testVersion001ApiExists_ },
    { name: "Structure des métadonnées", run: AKS_testVersion001ReleaseInfoStructure_ },
    { name: "Immuabilité", run: AKS_testVersion001ReleaseInfoIsImmutable_ },
    { name: "Copies défensives", run: AKS_testVersion001ReturnsDefensiveCopies_ },
    { name: "Provider invalide", run: AKS_testVersion001RejectsInvalidProvider_ },
    { name: "Métadonnées invalides", run: AKS_testVersion001RejectsInvalidProviderResult_ },
    { name: "Normalisation", run: AKS_testVersion001NormalizesRequiredStrings_ }
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
    feature: "VERSION-001",
    passed: passed,
    total: tests.length,
    failures: failures
  };

  Logger.log(JSON.stringify(result));
  return result;
}
