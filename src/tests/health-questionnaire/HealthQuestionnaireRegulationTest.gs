function test_HQ0052Sprint31_officialDefinitionContainsFourSections() {
  var regulation =
    AKS.Modules.HealthQuestionnaire.MinorQuestionnaire2021;

  assertEquals_(4, regulation.sections.length);
  assertEquals_("SINCE_LAST_YEAR", regulation.sections[0].id);
  assertEquals_("MORE_THAN_TWO_WEEKS", regulation.sections[1].id);
  assertEquals_("TODAY", regulation.sections[2].id);
  assertEquals_("PARENTS", regulation.sections[3].id);
}

function test_HQ0052Sprint31_officialDefinitionContainsTwentyFourQuestions() {
  var questionnaire =
    AKS.Modules.HealthQuestionnaire.Definition();

  assertEquals_(24, questionnaire.questions.length);
  assertEquals_("Q1", questionnaire.questions[0].id);
  assertEquals_("Q24", questionnaire.questions[23].id);
}

function test_HQ0052Sprint31_questionsKeepOfficialSectionOrder() {
  var questionnaire =
    AKS.Modules.HealthQuestionnaire.Definition();

  assertEquals_("SINCE_LAST_YEAR", questionnaire.questions[0].category);
  assertEquals_("MORE_THAN_TWO_WEEKS", questionnaire.questions[12].category);
  assertEquals_("TODAY", questionnaire.questions[18].category);
  assertEquals_("PARENTS", questionnaire.questions[21].category);
}

function test_HQ0052Sprint31_regulatoryMetadataIsPresent() {
  var regulation =
    AKS.Modules.HealthQuestionnaire.MinorQuestionnaire2021;

  assertEquals_("ANNEXE II-23", regulation.reference);
  assertEquals_("Art. A. 231-3", regulation.article);
  assertEquals_("2021-05-07", regulation.version);
  assertTrue_(regulation.parentWarning.length > 100);
  assertTrue_(regulation.childIntroduction.length > 100);
}

function test_HQ0052Sprint31_answersRemainOutsidePersistentDefinition() {
  var questionnaire =
    AKS.Modules.HealthQuestionnaire.Definition();
  var serialized = JSON.stringify(questionnaire);

  assertEquals_(-1, serialized.indexOf("answersJson"));
  assertEquals_(-1, serialized.indexOf("answers\""));
}
