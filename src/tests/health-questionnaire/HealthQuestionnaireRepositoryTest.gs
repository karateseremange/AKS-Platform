function test_HQ002_repositoryContractRejectsIncompleteRepository() {
  assertThrows_(
    function () {
      AKS.Modules.HealthQuestionnaire.RepositoryContract.validate({
        saveSubmission: function () {}
      });
    },
    "HEALTH_REPOSITORY_INVALID"
  );
}

function test_HQ002_inMemoryRepositoryStoresCampaign() {
  var repository =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireInMemoryRepository();

  var campaign =
    AKS.Modules.HealthQuestionnaire.HealthCampaign({
      id: "CAMPAIGN-1",
      name: "Campaign",
      season: "2026-2027",
      questionnaireId: "HQ-1",
      status: "DRAFT"
    });

  repository.saveCampaign(campaign);

  assertEquals_(
    "CAMPAIGN-1",
    repository.findCampaignById("CAMPAIGN-1").id,
    "Campaign should be stored."
  );
}

function test_HQ002_inMemoryRepositoryStoresQuestionnaire() {
  var repository =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireInMemoryRepository();

  var questionnaire = createHQ002Questionnaire_();
  repository.saveQuestionnaire(questionnaire);

  assertEquals_(
    "HQ-1",
    repository.findQuestionnaireById("HQ-1").id,
    "Questionnaire should be stored."
  );
}

function test_HQ002_serviceStoresSubmission() {
  var repository =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireInMemoryRepository();

  var service =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireApplicationService(repository);

  var questionnaire = createHQ002Questionnaire_();

  var result = service.submit(
    questionnaire,
    {
      id: "SUBMISSION-1",
      campaignId: "CAMPAIGN-1",
      questionnaireId: "HQ-1",
      participantId: "MEMBER-1",
      answers: {
        Q1: "NO",
        Q2: "NO"
      },
      declarationAccepted: true
    }
  );

  assertTrue_(result.ok, "Submission should succeed.");

  var stored = repository.findLatestSubmissionByParticipant(
    "MEMBER-1",
    "CAMPAIGN-1"
  );

  assertEquals_(
    "SUBMISSION-1",
    stored.submission.id,
    "Submission should be stored."
  );
}

function test_HQ002_repositoryReturnsLatestSubmission() {
  var repository =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireInMemoryRepository();

  var service =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireApplicationService(repository);

  var questionnaire = createHQ002Questionnaire_();

  service.submit(questionnaire, {
    id: "SUBMISSION-1",
    campaignId: "CAMPAIGN-1",
    questionnaireId: "HQ-1",
    participantId: "MEMBER-1",
    answers: { Q1: "NO", Q2: "NO" },
    declarationAccepted: true
  });

  service.submit(questionnaire, {
    id: "SUBMISSION-2",
    campaignId: "CAMPAIGN-1",
    questionnaireId: "HQ-1",
    participantId: "MEMBER-1",
    answers: { Q1: "YES", Q2: "NO" },
    declarationAccepted: true
  });

  var latest = repository.findLatestSubmissionByParticipant(
    "MEMBER-1",
    "CAMPAIGN-1"
  );

  assertEquals_(
    "SUBMISSION-2",
    latest.submission.id,
    "Latest submission should be returned."
  );
}

function createHQ002Questionnaire_() {
  return AKS.Modules.HealthQuestionnaire.Questionnaire({
    id: "HQ-1",
    title: "Health questionnaire",
    version: "1.0.0",
    audience: "ALL",
    questions: [
      { id: "Q1", label: "Question 1", order: 1 },
      { id: "Q2", label: "Question 2", order: 2 }
    ]
  });
}
