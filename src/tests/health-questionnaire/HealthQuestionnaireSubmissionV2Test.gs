function test_HQ004_submissionRejectsDetailedAnswers() {
  var data = createHQ004AdministrativeSubmissionData_();
  data.answers = { Q1: "NO" };

  assertThrows_(
    function () {
      AKS.Modules.HealthQuestionnaire.Submission(data);
    },
    "HEALTH_SUBMISSION_ANSWERS_FORBIDDEN"
  );
}

function test_HQ004_submissionCalculatesMinorAge() {
  var submission = AKS.Modules.HealthQuestionnaire.Submission(
    createHQ004AdministrativeSubmissionData_()
  );

  assertEquals_(12, submission.ageAtSubmission);
}

function test_HQ004_submissionRejectsAdult() {
  var data = createHQ004AdministrativeSubmissionData_();
  data.birthDate = "2000-01-01";

  assertThrows_(
    function () {
      AKS.Modules.HealthQuestionnaire.Submission(data);
    },
    "HEALTH_SUBMISSION_MINOR_REQUIRED"
  );
}

function test_HQ004_positiveAnswerStoresOnlyAdministrativeResult() {
  var repository =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireInMemoryRepository();
  var service =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireApplicationService(repository);
  var data = createHQ004AdministrativeSubmissionData_();

  data.answers = { Q1: "YES", Q2: "NO" };
  data.declarationAccepted = true;

  var result = service.submit(createHQ004Questionnaire_(), data);
  var stored = repository.findSubmissionById(data.id);

  assertTrue_(result.ok, "Submission should succeed.");
  assertEquals_(
    "MEDICAL_CERTIFICATE_REQUIRED",
    stored.result
  );
  assertTrue_(
    !Object.prototype.hasOwnProperty.call(stored, "answers"),
    "No answer may remain in the repository."
  );
}

function test_HQ004_incompleteAssessmentIsNotPersisted() {
  var repository =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireInMemoryRepository();
  var service =
    AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireApplicationService(repository);
  var data = createHQ004AdministrativeSubmissionData_();

  data.answers = { Q1: "NO" };
  data.declarationAccepted = true;

  var result = service.submit(createHQ004Questionnaire_(), data);

  assertTrue_(!result.ok, "Incomplete submission must fail.");
  assertEquals_("HEALTH_SUBMISSION_INCOMPLETE", result.error.code);
  assertEquals_(null, repository.findSubmissionById(data.id));
}

function createHQ004AdministrativeSubmissionData_() {
  return {
    id: "SUBMISSION-HQ004-1",
    campaignId: "CAMPAIGN-1",
    questionnaireId: "HQ-1",
    email: "parent@example.org",
    lastName: "DUPONT",
    firstName: "Alice",
    birthDate: "2014-05-12",
    sex: "FEMALE",
    legalRepresentativeLastName: "DUPONT",
    legalRepresentativeFirstName: "Marie",
    result: "NO_MEDICAL_CERTIFICATE_REQUIRED",
    submittedAt: new Date("2026-07-11T12:00:00Z")
  };
}

function createHQ004Questionnaire_() {
  return AKS.Modules.HealthQuestionnaire.Questionnaire({
    id: "HQ-1",
    title: "Questionnaire santé",
    version: "1.0.0",
    audience: "MINOR",
    questions: [
      { id: "Q1", label: "Question 1", order: 1 },
      { id: "Q2", label: "Question 2", order: 2 }
    ]
  });
}
