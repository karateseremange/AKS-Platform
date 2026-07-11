var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Creates an immutable questionnaire submission.
 *
 * @param {Object} data
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.Submission = function (data) {
  validateRequired_(
    data,
    "HEALTH_SUBMISSION_REQUIRED",
    "Submission data is required."
  );

  var id = requireText_(data.id, "Submission id");
  var campaignId = requireText_(data.campaignId, "Campaign id");
  var questionnaireId = requireText_(
    data.questionnaireId,
    "Questionnaire id"
  );
  var participantId = requireText_(
    data.participantId,
    "Participant id"
  );

  var answers = Object.assign({}, data.answers || {});

  Object.keys(answers).forEach(function (questionId) {
    var answer = answers[questionId];

    if (answer !== "YES" && answer !== "NO") {
      throw new AKS.Core.Exception(
        "HEALTH_SUBMISSION_ANSWER_INVALID",
        "Answer must be YES or NO for question: " + questionId
      );
    }
  });

  return Object.freeze({
    id: id,
    campaignId: campaignId,
    questionnaireId: questionnaireId,
    participantId: participantId,
    respondentType: data.respondentType || "PARTICIPANT",
    answers: Object.freeze(answers),
    declarationAccepted: data.declarationAccepted === true,
    submittedAt: normalizeDate_(data.submittedAt) || new Date()
  });
};
