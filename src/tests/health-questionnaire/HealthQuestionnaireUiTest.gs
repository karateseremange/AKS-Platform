function test_HQ003_contextFailsWithoutActiveCampaign() {
  var fixture = createHQ003Fixture_();

  var result = fixture.controller.getContext(
    "MEMBER-1"
  );

  assertTrue_(
    !result.ok,
    "Context should fail without active campaign."
  );

  assertEquals_(
    "HEALTH_ACTIVE_CAMPAIGN_NOT_CONFIGURED",
    result.error.code
  );
}

function test_HQ003_contextLoadsOpenCampaign() {
  var fixture = createHQ003Fixture_();

  fixture.repository.saveQuestionnaire(
    createHQ003Questionnaire_()
  );

  fixture.repository.saveCampaign(
    createHQ003Campaign_("OPEN")
  );

  fixture.settings.setActiveCampaignId(
    "CAMPAIGN-1"
  );

  var result = fixture.controller.getContext(
    "MEMBER-1"
  );

  assertTrue_(
    result.ok,
    "Context should load."
  );

  assertEquals_(
    "CAMPAIGN-1",
    result.data.campaign.id
  );
}

function test_HQ003_contextRejectsClosedCampaign() {
  var fixture = createHQ003Fixture_();

  fixture.repository.saveQuestionnaire(
    createHQ003Questionnaire_()
  );

  fixture.repository.saveCampaign(
    createHQ003Campaign_("CLOSED")
  );

  fixture.settings.setActiveCampaignId(
    "CAMPAIGN-1"
  );

  var result = fixture.controller.getContext(
    "MEMBER-1"
  );

  assertEquals_(
    "HEALTH_CAMPAIGN_NOT_OPEN",
    result.error.code
  );
}

function test_HQ003_submitPersistsAnswers() {
  var fixture = createHQ003Fixture_();

  fixture.repository.saveQuestionnaire(
    createHQ003Questionnaire_()
  );

  fixture.repository.saveCampaign(
    createHQ003Campaign_("OPEN")
  );

  fixture.settings.setActiveCampaignId(
    "CAMPAIGN-1"
  );

  var result = fixture.controller.submit({
    participantId: "MEMBER-1",
    answers: {
      Q1: "NO",
      Q2: "NO"
    },
    declarationAccepted: true
  });

  assertTrue_(
    result.ok,
    "Submission should succeed."
  );

  assertEquals_(
    "ELIGIBLE",
    result.data.evaluation.status
  );
}

function createHQ003Fixture_() {
  var repository =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireInMemoryRepository();

  var service =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireApplicationService(
        repository
      );

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
      .HealthQuestionnaireController(
        repository,
        service,
        settings
      );

  return {
    repository: repository,
    service: service,
    settings: settings,
    controller: controller
  };
}

function createHQ003Campaign_(status) {
  return AKS.Modules.HealthQuestionnaire
    .HealthCampaign({
      id: "CAMPAIGN-1",
      name: "Campagne santé 2026-2027",
      season: "2026-2027",
      questionnaireId: "HQ-1",
      status: status
    });
}

function createHQ003Questionnaire_() {
  return AKS.Modules.HealthQuestionnaire
    .Questionnaire({
      id: "HQ-1",
      title: "Questionnaire santé",
      version: "1.0.0",
      audience: "ALL",
      questions: [
        {
          id: "Q1",
          label: "Question 1",
          order: 1
        },
        {
          id: "Q2",
          label: "Question 2",
          order: 2
        }
      ]
    });
}
