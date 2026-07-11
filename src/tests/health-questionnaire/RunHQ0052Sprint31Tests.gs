function AKS_runHQ0052Sprint31Tests() {
  var tests = [
    test_HQ0052Sprint31_officialDefinitionContainsFourSections,
    test_HQ0052Sprint31_officialDefinitionContainsTwentyFourQuestions,
    test_HQ0052Sprint31_questionsKeepOfficialSectionOrder,
    test_HQ0052Sprint31_regulatoryMetadataIsPresent,
    test_HQ0052Sprint31_answersRemainOutsidePersistentDefinition
  ];
  var passed = 0;

  tests.forEach(function (test) {
    test();
    passed += 1;
  });

  Logger.log("HQ-005.2 Sprint 3.1 : " + passed + "/" + tests.length);
  return { passed: passed, total: tests.length };
}
