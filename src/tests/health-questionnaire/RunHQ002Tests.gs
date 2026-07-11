/**
 * Runs HQ-002 repository tests.
 *
 * @returns {Object}
 */
function AKS_runHQ002Tests() {
  var tests = [
    test_HQ002_repositoryContractRejectsIncompleteRepository,
    test_HQ002_inMemoryRepositoryStoresCampaign,
    test_HQ002_inMemoryRepositoryStoresQuestionnaire,
    test_HQ002_serviceStoresSubmissionWithoutAnswers,
    test_HQ002_repositoryListsSubmissionsByCampaign
  ];

  var results = [];
  var passed = 0;

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
    feature: "HQ-002",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
