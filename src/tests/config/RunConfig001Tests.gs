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
    AKS_testConfig_rejectsDuplicateAdministratorEmailsAfterNormalization,
    AKS_testConfig001_registersImmutableDefinition_,
    AKS_testConfig001_rejectsDuplicateKey_,
    AKS_testConfig001_rejectsInvalidKey_,
    AKS_testConfig001_rejectsSecretValue_,
    AKS_testConfig001_resolvesExplicitValue_,
    AKS_testConfig001_resolvesDocumentedDefault_,
    AKS_testConfig001_rejectsMissingRequiredValue_,
    AKS_testConfig001_rejectsInvalidExplicitValue_
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
