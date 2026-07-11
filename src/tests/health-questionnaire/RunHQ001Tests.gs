/**
 * Runs HQ-001 domain tests.
 *
 * @returns {Object}
 */
function AKS_runHQ001Tests() {
  var tests = [
    test_HQ001_questionnaireSortsQuestions,
    test_HQ001_questionnaireRejectsDuplicateQuestionIds,
    test_HQ001_allNoIsEligible,
    test_HQ001_yesRequiresMedicalReview,
    test_HQ001_missingAnswerIsIncomplete,
    test_HQ001_missingDeclarationIsIncomplete,
    test_HQ001_campaignRejectsInvalidStatus,
    test_HQ001_evaluationRejectsInvalidAnswer
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
    feature: "HQ-001",
    passed: passed,
    total: tests.length,
    results: results
  };

  console.log(JSON.stringify(report));
  return report;
}
