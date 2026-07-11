/**
 * Runs Feature F-001 tests.
 *
 * @returns {Object}
 */
function AKS_runFeatureF001Tests() {
  var tests = [
    test_ApplicationLifecycle_start,
    test_ApplicationLifecycle_startIsIdempotent,
    test_ApplicationLifecycle_moduleLoaderRejectsInvalidDefinition
  ];

  var passed = 0;

  tests.forEach(function (testCase) {
    testCase();
    passed += 1;
  });

  return {
    ok: true,
    feature: "F-001",
    passed: passed,
    total: tests.length
  };
}
