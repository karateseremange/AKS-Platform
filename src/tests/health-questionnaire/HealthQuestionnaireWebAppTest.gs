function test_HQ0051_webContextFailsWithoutActiveCampaign() {
  var fixture = createHQ0051Fixture_();
  var result = fixture.controller.getPublicViewModel();

  assertTrue_(!result.ok);
  assertEquals_(
    "HEALTH_ACTIVE_CAMPAIGN_NOT_CONFIGURED",
    result.error.code
  );
}

function test_HQ0051_webContextRejectsClosedCampaign() {
  var fixture = createHQ0051Fixture_();
  fixture.repository.saveQuestionnaire(createHQ0051Questionnaire_());
  fixture.repository.saveCampaign(createHQ0051Campaign_("CLOSED"));
  fixture.settings.setActiveCampaignId("CAMPAIGN-WEB-1");

  var result = fixture.controller.getPublicViewModel();

  assertTrue_(!result.ok);
  assertEquals_("HEALTH_CAMPAIGN_NOT_OPEN", result.error.code);
}

function test_HQ0051_webContextLoadsActiveQuestionnaire() {
  var fixture = createHQ0051Fixture_();
  fixture.repository.saveQuestionnaire(createHQ0051Questionnaire_());
  fixture.repository.saveCampaign(createHQ0051Campaign_("OPEN"));
  fixture.settings.setActiveCampaignId("CAMPAIGN-WEB-1");

  var result = fixture.controller.getPublicViewModel();

  assertTrue_(result.ok);
  assertEquals_("2026-2027", result.data.campaign.season);
  assertEquals_(2, result.data.questionnaire.questions.length);
  assertEquals_("Question 1", result.data.questionnaire.questions[0].label);
}

function test_HQ0051_webContextExposesNoTechnicalIdentifiers() {
  var fixture = createHQ0051Fixture_();
  fixture.repository.saveQuestionnaire(createHQ0051Questionnaire_());
  fixture.repository.saveCampaign(createHQ0051Campaign_("OPEN"));
  fixture.settings.setActiveCampaignId("CAMPAIGN-WEB-1");

  var result = fixture.controller.getPublicViewModel();

  assertTrue_(result.ok);
  assertTrue_(
    !Object.prototype.hasOwnProperty.call(result.data.campaign, "id"),
    "Campaign technical id must not be exposed to the public view."
  );
  assertTrue_(
    !Object.prototype.hasOwnProperty.call(
      result.data.questionnaire,
      "id"
    ),
    "Questionnaire technical id must not be exposed to the public view."
  );
}

function test_HQ0051_webContextUsesAksBrandingAndThreeSteps() {
  var fixture = createHQ0051Fixture_();
  fixture.repository.saveQuestionnaire(createHQ0051Questionnaire_());
  fixture.repository.saveCampaign(createHQ0051Campaign_("OPEN"));
  fixture.settings.setActiveCampaignId("CAMPAIGN-WEB-1");

  var result = fixture.controller.getPublicViewModel();

  assertEquals_("#2a4b9b", result.data.brand.primaryColor);
  assertEquals_("Association Karaté Serémange", result.data.brand.clubName);
  assertEquals_(4, result.data.steps.total);
}

function createHQ0051Fixture_() {
  var repository =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireInMemoryRepository();
  var activeCampaignId = null;
  var settings = {
    getActiveCampaignId: function () {
      return activeCampaignId;
    },
    setActiveCampaignId: function (campaignId) {
      activeCampaignId = campaignId;
    }
  };
  var controller =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireWebController(repository, settings);

  return {
    repository: repository,
    settings: settings,
    controller: controller
  };
}

function createHQ0051Campaign_(status) {
  return AKS.Modules.HealthQuestionnaire.HealthCampaign({
    id: "CAMPAIGN-WEB-1",
    name: "Questionnaire santé 2026-2027",
    season: "2026-2027",
    questionnaireId: "QUESTIONNAIRE-WEB-1",
    status: status
  });
}

function createHQ0051Questionnaire_() {
  return AKS.Modules.HealthQuestionnaire.Questionnaire({
    id: "QUESTIONNAIRE-WEB-1",
    title: "Questionnaire santé",
    version: "1.0.0",
    audience: "MINOR",
    source: "Annexe II-23",
    questions: [
      { id: "Q1", label: "Question 1", order: 1, required: true },
      { id: "Q2", label: "Question 2", order: 2, required: true }
    ]
  });
}
