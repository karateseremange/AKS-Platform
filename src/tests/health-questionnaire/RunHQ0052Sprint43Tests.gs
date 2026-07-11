/** Runs RC 0.3.0 - HQ-005.2 Sprint 4.3 tests. */
function AKS_runHQ0052Sprint43Tests() {
  var tests = [
    test_HQ0052_S43_submissionIdStartsAtOne,
    test_HQ0052_S43_submissionIdIncrements,
    test_HQ0052_S43_allNoStoresAdministrativeResultOnly,
    test_HQ0052_S43_yesStoresCertificateRequired,
    test_HQ0052_S43_confirmationDtoIsWebSerializable,
    test_HQ0052_S43_rejectsUnconfirmedDeclaration,
    test_HQ0052_S43_submissionHeadersContainNoAnswerColumns
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
    feature: "HQ-005.2-SPRINT-4.3",
    passed: passed,
    total: tests.length,
    results: results
  };
  console.log(JSON.stringify(report));
  return report;
}
