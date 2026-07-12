/** Runs HQ-006 attestation generation tests. */
function AKS_runHQ006Tests() {
  var tests = [
    test_HQ006_generatesOnlyForEligibleSubmission,
    test_HQ006_rejectsMedicalCertificateResult,
    test_HQ006_qrContainsOpaqueReferenceOnly,
    test_HQ006_prefillsNamesAndKeepsAnswersOutsideGenerator
  ];
  var results = [];

  tests.forEach(function (testCase) {
    testCase();
    results.push({ name: testCase.name, status: "PASSED" });
  });

  var report = {
    ok: true,
    feature: "HQ-006",
    passed: results.length,
    total: tests.length,
    results: results
  };
  console.log(JSON.stringify(report));
  return report;
}
