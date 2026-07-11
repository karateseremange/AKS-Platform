/**
 * Runs Feature F-002 tests.
 *
 * @returns {Object}
 */
function AKS_runFeatureF002Tests() {
  var tests = [
    test_Container_registerAndResolveValue,
    test_Container_resolvesSingletonFactoryOnce,
    test_Container_resolvesTransientFactoryEachTime,
    test_Container_rejectsDuplicateEntry,
    test_Container_rejectsUnknownEntry,
    test_ServiceRegistry_usesContainerFacade,
    test_ApplicationLifecycle_start,
    test_ApplicationLifecycle_startIsIdempotent,
    test_ApplicationLifecycle_moduleLoaderRejectsInvalidDefinition
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
    feature: "F-002",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
