var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire = AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.Questionnaire = function (data) {
  if (!data || typeof data !== "object") {
    throw new AKS.Core.Exception("HEALTH_QUESTIONNAIRE_REQUIRED", "Questionnaire data is required.");
  }
  if (!data.id || !data.title) {
    throw new AKS.Core.Exception("HEALTH_QUESTIONNAIRE_INVALID", "Questionnaire id and title are required.");
  }
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new AKS.Core.Exception("HEALTH_QUESTIONNAIRE_QUESTIONS_REQUIRED", "At least one question is required.");
  }

  return Object.freeze({
    id: String(data.id),
    title: String(data.title),
    audience: data.audience || "unspecified",
    version: data.version || "0.1.0",
    season: data.season || null,
    questions: data.questions.map(function (question, index) {
      return Object.freeze({
        id: String(question.id || ("Q" + (index + 1))),
        label: String(question.label || ""),
        required: question.required !== false
      });
    })
  });
};
