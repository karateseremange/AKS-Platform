function test_HealthQuestionnaire_allNoIsEligible() {
  var questionnaire = createHealthQuestionnaireForTests_();
  var repository = AKS.Modules.HealthQuestionnaire.InMemoryRepository();
  AKS.Modules.HealthQuestionnaire.Service.resetForTests();
  AKS.Modules.HealthQuestionnaire.Service.configure({repository: repository});

  var result = AKS.Modules.HealthQuestionnaire.Service.submit(questionnaire, {
    questionnaireId: questionnaire.id,
    memberId: "MEMBER-001",
    season: "2026-2027",
    answers: {Q1: "NO", Q2: "NO"},
    declarationAccepted: true
  });

  assertEquals_("ELIGIBLE", result.data.evaluation.status, "All NO answers should be eligible.");
}

function test_HealthQuestionnaire_yesRequiresMedicalReview() {
  var questionnaire = createHealthQuestionnaireForTests_();
  var repository = AKS.Modules.HealthQuestionnaire.InMemoryRepository();
  AKS.Modules.HealthQuestionnaire.Service.resetForTests();
  AKS.Modules.HealthQuestionnaire.Service.configure({repository: repository});

  var result = AKS.Modules.HealthQuestionnaire.Service.submit(questionnaire, {
    questionnaireId: questionnaire.id,
    memberId: "MEMBER-002",
    answers: {Q1: "YES", Q2: "NO"},
    declarationAccepted: true
  });

  assertEquals_("MEDICAL_REVIEW_REQUIRED", result.data.evaluation.status, "YES should require review.");
}

function test_HealthQuestionnaire_missingAnswerIsIncomplete() {
  var questionnaire = createHealthQuestionnaireForTests_();
  var repository = AKS.Modules.HealthQuestionnaire.InMemoryRepository();
  AKS.Modules.HealthQuestionnaire.Service.resetForTests();
  AKS.Modules.HealthQuestionnaire.Service.configure({repository: repository});

  var result = AKS.Modules.HealthQuestionnaire.Service.submit(questionnaire, {
    questionnaireId: questionnaire.id,
    memberId: "MEMBER-003",
    answers: {Q1: "NO"},
    declarationAccepted: true
  });

  assertEquals_("INCOMPLETE", result.data.evaluation.status, "Missing answer should be incomplete.");
}

function createHealthQuestionnaireForTests_() {
  return AKS.Modules.HealthQuestionnaire.Questionnaire({
    id: "TEST-HQ",
    title: "Test health questionnaire",
    questions: [
      {id: "Q1", label: "Question 1", required: true},
      {id: "Q2", label: "Question 2", required: true}
    ]
  });
}
