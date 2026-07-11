function test_runCoreSuite() {
  var tests = [
    test_ServiceRegistry_registerAndGet,
    test_ServiceRegistry_rejectsDuplicate,
    test_ModuleRegistry_registerAndGet,
    test_ModuleRegistry_rejectsInvalidDescriptor,
    test_Application_start,
    test_Application_start_isIdempotent
  ];
  var passed = 0;
  tests.forEach(function (testCase) {
    testCase();
    passed += 1;
  });
  return { ok: true, passed: passed, total: tests.length };
}
