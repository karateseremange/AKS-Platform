var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire = AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.Definition = function () {
  return AKS.Modules.HealthQuestionnaire.Questionnaire({
    id: "FFK-HEALTH-QUESTIONNAIRE",
    title: "Questionnaire santé",
    audience: "to-be-confirmed",
    version: "0.1.0",
    season: "2026-2027",
    questions: [
      {id: "Q1", label: "Official question text to be inserted", required: true}
    ]
  });
};
