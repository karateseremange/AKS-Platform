/**
 * Runs HQ-003 user interface tests.
 *
 * @returns {Object}
 */
function AKS_runHQ003Tests() {
  var tests = [
    test_HQ003_contextFailsWithoutActiveCampaign,
    test_HQ003_contextLoadsOpenCampaign,
    test_HQ003_contextRejectsClosedCampaign,
    test_HQ003_submitPersistsAdministrativeResultOnly,
    test_HQ003_listsCampaignOptionsWithoutTechnicalInput,
    test_HQ003_listsNoCampaignWhenRepositoryIsEmpty,
    test_HQ003_createsAndActivatesCampaign,
    test_HQ003_rejectsDuplicateCampaignSeason
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
    feature: "HQ-003",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
