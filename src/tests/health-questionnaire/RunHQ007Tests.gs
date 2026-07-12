/** Runs HQ-007 e-mail notification tests. */
function AKS_runHQ007Tests() {
  var tests = [
    test_HQ007_eligibleRespondentReceivesPdfAndClubDoesNot,
    test_HQ007_certificateRequiredHasNoAttachment,
    test_HQ007_clubReceivesAdministrativeIdentityAndFormalityOnly,
    test_HQ007_persistsEachSuccessfulDelivery,
    test_HQ007_retrySkipsAlreadySentRespondentEmail,
    test_HQ007_rejectsDetailedAnswers,
    test_HQ007_gatewayLoadsAttachmentOnlyWhenRequested
  ];
  var results = [];

  tests.forEach(function (testCase) {
    testCase();
    results.push({ name: testCase.name, status: "PASSED" });
  });

  var report = {
    ok: true,
    feature: "HQ-007",
    passed: results.length,
    total: tests.length,
    results: results
  };
  console.log(JSON.stringify(report));
  return report;
}
