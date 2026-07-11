var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire = AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.Definition = function () {
  var regulation =
    AKS.Modules.HealthQuestionnaire.MinorQuestionnaire2021;
  var questions = [];
  var order = 1;

  regulation.sections.forEach(function (section) {
    section.questions.forEach(function (label) {
      questions.push({
        id: "Q" + order,
        label: label,
        order: order,
        required: true,
        category: section.id
      });
      order += 1;
    });
  });

  return AKS.Modules.HealthQuestionnaire.Questionnaire({
    id: regulation.id,
    title: "Questionnaire relatif à l’état de santé du sportif mineur",
    audience: "MINOR",
    version: regulation.version,
    source: regulation.source,
    effectiveFrom: regulation.effectiveFrom,
    questions: questions
  });
};
