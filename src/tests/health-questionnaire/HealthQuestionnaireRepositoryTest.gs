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

function test_HQ002_serviceStoresSubmissionWithoutAnswers() {
  var repository =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireInMemoryRepository();

  var service =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireApplicationService(repository);

  var result = service.submit(
    createHQ002Questionnaire_(),
    createHQ002SubmissionData_("SUBMISSION-1", {
      Q1: "NO",
      Q2: "NO"
    })
  );

  assertTrue_(result.ok, "Submission should succeed.");

  var stored = repository.findSubmissionById("SUBMISSION-1");

  assertEquals_("SUBMISSION-1", stored.id);
  assertEquals_(
    "NO_MEDICAL_CERTIFICATE_REQUIRED",
    stored.result
  );
  assertTrue_(
    !Object.prototype.hasOwnProperty.call(stored, "answers"),
    "Detailed answers must not be persisted."
  );
}

function test_HQ002_repositoryListsSubmissionsByCampaign() {
  var repository =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireInMemoryRepository();

  var service =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireApplicationService(repository);

  service.submit(
    createHQ002Questionnaire_(),
    createHQ002SubmissionData_("SUBMISSION-1", {
      Q1: "NO",
      Q2: "NO"
    })
  );

  var second = createHQ002SubmissionData_("SUBMISSION-2", {
    Q1: "YES",
    Q2: "NO"
  });
  second.campaignId = "CAMPAIGN-2";
  service.submit(createHQ002Questionnaire_(), second);

  assertEquals_(
    1,
    repository.listSubmissionsByCampaign("CAMPAIGN-1").length
  );
}

function createHQ002SubmissionData_(id, answers) {
  return {
    id: id,
    campaignId: "CAMPAIGN-1",
    questionnaireId: "HQ-1",
    questionnaireVersion: "1.0.0",
    email: "parent@example.org",
    lastName: "DUPONT",
    firstName: "Alice",
    birthDate: "2014-05-12",
    sex: "FEMALE",
    legalRepresentativeLastName: "DUPONT",
    legalRepresentativeFirstName: "Marie",
    answers: answers,
    declarationAccepted: true,
    status: "CREATED",
    processingVersion: "0.3.0-rc",
    submittedAt: new Date("2026-07-11T12:00:00Z")
  };
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
