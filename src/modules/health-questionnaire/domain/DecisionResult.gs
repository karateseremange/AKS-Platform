var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Immutable result produced by the questionnaire decision engine.
 * It intentionally contains no detailed answer.
 *
 * @param {Object} data
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.DecisionResult = function (data) {
  validateRequired_(
    data,
    "HEALTH_DECISION_RESULT_REQUIRED",
    "Decision result data is required."
  );

  var allowedResults = [
    AKS.Modules.HealthQuestionnaire.Evaluation
      .NO_MEDICAL_CERTIFICATE_REQUIRED,
    AKS.Modules.HealthQuestionnaire.Evaluation
      .MEDICAL_CERTIFICATE_REQUIRED
  ];

  if (allowedResults.indexOf(data.result) === -1) {
    throw new AKS.Core.Exception(
      "HEALTH_DECISION_RESULT_INVALID",
      "Decision result is invalid."
    );
  }

  var positiveAnswerCount = Number(data.positiveAnswerCount);

  if (
    !isFinite(positiveAnswerCount) ||
    positiveAnswerCount < 0 ||
    Math.floor(positiveAnswerCount) !== positiveAnswerCount
  ) {
    throw new AKS.Core.Exception(
      "HEALTH_POSITIVE_ANSWER_COUNT_INVALID",
      "Positive answer count must be a non-negative integer."
    );
  }

  return Object.freeze({
    result: data.result,
    positiveAnswerCount: positiveAnswerCount,
    generatedAt: normalizeDate_(data.generatedAt || new Date())
  });
};
