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

function test_HQ003_submitPersistsAdministrativeResultOnly() {
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
    email: "parent@example.org",
    lastName: "DUPONT",
    firstName: "Alice",
    birthDate: "2014-05-12",
    sex: "FEMALE",
    legalRepresentativeLastName: "DUPONT",
    legalRepresentativeFirstName: "Marie",
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
    "NO_MEDICAL_CERTIFICATE_REQUIRED",
    result.data.evaluation.status
  );
  assertTrue_(
    !Object.prototype.hasOwnProperty.call(
      result.data.submission,
      "answers"
    ),
    "The persisted submission must not expose detailed answers."
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

function test_HQ003_listsCampaignOptionsWithoutTechnicalInput() {
  var fixture = createHQ003Fixture_();

  fixture.repository.saveCampaign(
    AKS.Modules.HealthQuestionnaire.HealthCampaign({
      id: "CAMPAIGN-OLD",
      name: "Campagne santé 2025-2026",
      season: "2025-2026",
      questionnaireId: "HQ-1",
      status: "CLOSED"
    })
  );

  fixture.repository.saveCampaign(
    createHQ003Campaign_("OPEN")
  );

  fixture.settings.setActiveCampaignId("CAMPAIGN-1");

  var result = fixture.controller.getCampaignOptions();

  assertTrue_(result.ok, "Campaign options should load.");
  assertEquals_(2, result.data.campaigns.length);
  assertEquals_("CAMPAIGN-1", result.data.campaigns[0].id);
  assertTrue_(
    result.data.campaigns[0].isActive,
    "Active campaign should be identified."
  );
}

function test_HQ003_listsNoCampaignWhenRepositoryIsEmpty() {
  var fixture = createHQ003Fixture_();
  var result = fixture.controller.getCampaignOptions();

  assertTrue_(result.ok, "Empty campaign list should be valid.");
  assertEquals_(0, result.data.campaigns.length);
}

function test_HQ003_createsAndActivatesCampaign() {
  var fixture = createHQ003Fixture_();

  var result = fixture.controller.createCampaign({
    season: "2026-2027",
    name: "Campagne santé 2026-2027"
  });

  assertTrue_(result.ok, "Campaign creation should succeed.");
  assertEquals_(
    "HQ-CAMPAIGN-2026-2027",
    result.data.campaign.id
  );
  assertEquals_("OPEN", result.data.campaign.status);
  assertEquals_(
    "HQ-CAMPAIGN-2026-2027",
    fixture.settings.getActiveCampaignId()
  );
  assertTrue_(
    fixture.repository.findQuestionnaireById(
      result.data.questionnaire.id
    ) !== null,
    "Questionnaire definition should be persisted."
  );
}

function test_HQ003_rejectsDuplicateCampaignSeason() {
  var fixture = createHQ003Fixture_();

  fixture.controller.createCampaign({
    season: "2026-2027",
    name: "Campagne santé 2026-2027"
  });

  var result = fixture.controller.createCampaign({
    season: "2026-2027",
    name: "Autre nom"
  });

  assertTrue_(!result.ok, "Duplicate campaign should be rejected.");
  assertEquals_(
    "HEALTH_CAMPAIGN_ALREADY_EXISTS",
    result.error.code
  );
}
