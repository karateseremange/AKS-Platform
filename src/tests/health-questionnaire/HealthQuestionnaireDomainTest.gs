function test_HQ001_questionnaireSortsQuestions() {
  var questionnaire = createHQ001Questionnaire_();

  assertEquals_("Q1", questionnaire.questions[0].id);
  assertEquals_("Q2", questionnaire.questions[1].id);
}

function test_HQ001_questionnaireRejectsDuplicateQuestionIds() {
  assertThrows_(
    function () {
      AKS.Modules.HealthQuestionnaire.Questionnaire({
        id: "HQ-DUPLICATE",
        title: "Duplicate",
        version: "1.0.0",
        audience: "ALL",
        questions: [
          { id: "Q1", label: "First", order: 1 },
          { id: "Q1", label: "Second", order: 2 }
        ]
      });
    },
    "HEALTH_QUESTION_DUPLICATE_ID"
  );
}

function test_HQ001_allNoIsEligible() {
  var questionnaire = createHQ001Questionnaire_();
  var submission = createHQ001Submission_({
    Q1: "NO",
    Q2: "NO"
  }, true);

  var evaluation =
    AKS.Modules.HealthQuestionnaire.Evaluation.evaluate(
      questionnaire,
      submission
    );

  assertEquals_(
    "NO_MEDICAL_CERTIFICATE_REQUIRED",
    evaluation.status,
    "All NO answers should be eligible."
  );
}

function test_HQ001_yesRequiresMedicalReview() {
  var questionnaire = createHQ001Questionnaire_();
  var submission = createHQ001Submission_({
    Q1: "YES",
    Q2: "NO"
  }, true);

  var evaluation =
    AKS.Modules.HealthQuestionnaire.Evaluation.evaluate(
      questionnaire,
      submission
    );

  assertEquals_(
    "MEDICAL_CERTIFICATE_REQUIRED",
    evaluation.status,
    "A YES answer should require medical review."
  );
}

function test_HQ001_missingAnswerIsIncomplete() {
  var questionnaire = createHQ001Questionnaire_();
  var submission = createHQ001Submission_({
    Q1: "NO"
  }, true);

  var evaluation =
    AKS.Modules.HealthQuestionnaire.Evaluation.evaluate(
      questionnaire,
      submission
    );

  assertEquals_(
    "INCOMPLETE",
    evaluation.status,
    "A missing required answer should be incomplete."
  );
}

function test_HQ001_missingDeclarationIsIncomplete() {
  var questionnaire = createHQ001Questionnaire_();
  var submission = createHQ001Submission_({
    Q1: "NO",
    Q2: "NO"
  }, false);

  var evaluation =
    AKS.Modules.HealthQuestionnaire.Evaluation.evaluate(
      questionnaire,
      submission
    );

  assertEquals_(
    "INCOMPLETE",
    evaluation.status,
    "Missing declaration should be incomplete."
  );
}

function test_HQ001_campaignRejectsInvalidStatus() {
  assertThrows_(
    function () {
      AKS.Modules.HealthQuestionnaire.HealthCampaign({
        id: "CAMPAIGN-1",
        name: "Campaign",
        season: "2026-2027",
        questionnaireId: "HQ-1",
        status: "INVALID"
      });
    },
    "HEALTH_CAMPAIGN_STATUS_INVALID"
  );
}

function test_HQ001_evaluationRejectsInvalidAnswer() {
  var questionnaire = createHQ001Questionnaire_();
  var evaluation =
    AKS.Modules.HealthQuestionnaire.Evaluation.evaluate(
      questionnaire,
      {
        questionnaireId: "HQ-1",
        answers: { Q1: "MAYBE", Q2: "NO" },
        declarationAccepted: true
      }
    );

  assertEquals_(
    "INCOMPLETE",
    evaluation.status,
    "An invalid answer should make the assessment incomplete."
  );
}

function createHQ001Questionnaire_() {
  return AKS.Modules.HealthQuestionnaire.Questionnaire({
    id: "HQ-1",
    title: "Health questionnaire",
    version: "1.0.0",
    audience: "ALL",
    questions: [
      { id: "Q2", label: "Question 2", order: 2 },
      { id: "Q1", label: "Question 1", order: 1 }
    ]
  });
}

function createHQ001Submission_(answers, declarationAccepted) {
  return {
    questionnaireId: "HQ-1",
    answers: answers,
    declarationAccepted: declarationAccepted
  };
}
