var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire = AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.Submission = function (data) {
  if (!data || !data.questionnaireId || !data.memberId) {
    throw new AKS.Core.Exception("HEALTH_SUBMISSION_INVALID", "Questionnaire id and member id are required.");
  }

  return Object.freeze({
    id: data.id || Utilities.getUuid(),
    questionnaireId: String(data.questionnaireId),
    memberId: String(data.memberId),
    season: data.season || null,
    respondentType: data.respondentType || "member",
    answers: Object.freeze(Object.assign({}, data.answers || {})),
    declarationAccepted: data.declarationAccepted === true,
    submittedAt: data.submittedAt || new Date(),
    createdBy: data.createdBy || null
  });
};
