/** Runs HQ-008 birth date UX contract tests. */
function AKS_runHQ008Tests() {
  var tests = [
    test_HQ008_acceptsValidLeapDayForMinor,
    test_HQ008_rejectsImpossibleCalendarDate,
    test_HQ008_keepsIsoDateContract
  ];
  var results = [];

  tests.forEach(function (testCase) {
    testCase();
    results.push({ name: testCase.name, status: "PASSED" });
  });

  var report = {
    ok: true,
    feature: "HQ-008",
    passed: results.length,
    total: tests.length,
    results: results
  };
  console.log(JSON.stringify(report));
  return report;
}
