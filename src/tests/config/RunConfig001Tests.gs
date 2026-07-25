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
    AKS_testConfig001_rejectsInvalidExplicitValue_,
    AKS_testConfig001_persistsTypedValue_,
    AKS_testConfig001_rejectsInvalidValueBeforePersistence_,
    AKS_testConfig001_rejectsNonAdministrableWrite_,
    AKS_testConfig001_requiresMutationActor_,
    AKS_testConfig001_removesExplicitValueAndRestoresDefault_,
    AKS_testConfig001_protectsRequiredValueFromDeletion_,
    AKS_testConfig001_detectsCorruptedPersistentValue_,
    AKS_testConfig001_releasesPersistenceLockAfterFailure_,
    AKS_testConfig001AdminUi_buildsAuthorizedViewModel_,
    AKS_testConfig001AdminUi_rejectsUnauthorizedUser_,
    AKS_testConfig001AdminUi_reportsInvalidRequiredParameter_,
    AKS_testConfig001AdminUi_marksReadOnlyParameter_,
    AKS_testConfig001AdminUi_usesAuthenticatedActor_,
    AKS_testConfig001AdminUi_restoresDefault_,
    AKS_testConfig001AdminUi_publishesNavigationDestination_,
    AKS_testConfig001AdminUi_masksSensitiveValue_
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
