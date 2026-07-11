function test_HQ0052Sprint3_questionnaireValidationAcceptsCompleteAnswers() {
  var fixture = createHQ0051Fixture_();
  var questionnaire = createHQ0051Questionnaire_();
  var answers = {};

  questionnaire.questions.forEach(function (question) {
    answers[question.id] = "NO";
  });

  var result = fixture.controller.validateAnswers(questionnaire, answers);

  assertTrue_(result.ok);
  assertEquals_(questionnaire.questions.length, Object.keys(result.data).length);
}

function test_HQ0052Sprint3_questionnaireValidationRejectsMissingAnswer() {
  var fixture = createHQ0051Fixture_();
  var questionnaire = createHQ0051Questionnaire_();
  var answers = {};

  questionnaire.questions.forEach(function (question, index) {
    if (index !== 0) {
      answers[question.id] = "NO";
    }
  });

  var result = fixture.controller.validateAnswers(questionnaire, answers);

  assertTrue_(!result.ok);
  assertEquals_("HEALTH_ANSWERS_INCOMPLETE", result.error.code);
  assertEquals_(questionnaire.questions[0].id,
    result.error.details.missingQuestionIds[0]);
}

function test_HQ0052Sprint3_questionnaireValidationRejectsInvalidValue() {
  var fixture = createHQ0051Fixture_();
  var questionnaire = createHQ0051Questionnaire_();
  var answers = {};

  questionnaire.questions.forEach(function (question) {
    answers[question.id] = "NO";
  });
  answers[questionnaire.questions[0].id] = "MAYBE";

  var result = fixture.controller.validateAnswers(questionnaire, answers);

  assertTrue_(!result.ok);
  assertEquals_(questionnaire.questions[0].id,
    result.error.details.missingQuestionIds[0]);
}

function test_HQ0052Sprint3_questionnaireViewModelKeepsQuestionOrder() {
  var fixture = createHQ0051Fixture_();
  fixture.repository.saveQuestionnaire(createHQ0051Questionnaire_());
  fixture.repository.saveCampaign(createHQ0051Campaign_("OPEN"));
  fixture.settings.setActiveCampaignId("CAMPAIGN-WEB-1");

  var result = fixture.controller.getPublicViewModel();

  assertTrue_(result.ok);
  assertEquals_(1, result.data.questionnaire.questions[0].order);
  assertTrue_(result.data.questionnaire.questions[0].required);
}

function test_HQ0052Sprint3_questionnaireValidationDoesNotPersistAnswers() {
  var fixture = createHQ0051Fixture_();
  var questionnaire = createHQ0051Questionnaire_();
  var answers = {};

  questionnaire.questions.forEach(function (question) {
    answers[question.id] = "YES";
  });

  var result = fixture.controller.validateAnswers(questionnaire, answers);

  assertTrue_(result.ok);
  assertEquals_(0, fixture.repository.listSubmissionsByCampaign(
    "CAMPAIGN-WEB-1"
  ).length);
}
