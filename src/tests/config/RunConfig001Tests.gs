/**
 * Runs CONFIG-001 tests.
 *
 * @returns {Object}
 */
function AKS_runConfig001Tests() {
  var tests = [
    AKS_testConfig_returnsNormalizedImmutableAdministratorEmails,
    AKS_testConfig_rejectsMissingAdministratorConfiguration,
    AKS_testConfig_rejectsEmptyAdministratorConfiguration,
    AKS_testConfig_rejectsInvalidAdministratorEmail,
    AKS_testConfig_rejectsDuplicateAdministratorEmailsAfterNormalization
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
    feature: "CONFIG-001",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
