var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire = AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.Definition = function () {
  return AKS.Modules.HealthQuestionnaire.Questionnaire({
    id: "FFK-HEALTH-QUESTIONNAIRE",
    title: "Questionnaire santé",
    audience: "ALL",
    version: "0.1.0",
    season: "2026-2027",
    questions: [
      {
        id: "Q1",
        label: "Question officielle à intégrer",
        order: 1,
        required: true
      }
    ]
  });
};
