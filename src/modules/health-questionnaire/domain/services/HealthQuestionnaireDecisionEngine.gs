var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};
AKS.Modules.HealthQuestionnaire.Services =
  AKS.Modules.HealthQuestionnaire.Services || {};

/**
 * Pure regulatory decision engine.
 *
 * Detailed answers are read transiently and are never copied to the result.
 */
AKS.Modules.HealthQuestionnaire.Services
  .HealthQuestionnaireDecisionEngine = Object.freeze({
    /**
     * @param {Array<string>|Object<string,string>} answers
     * @returns {Object}
     */
    evaluate: function (answers) {
      validateRequired_(
        answers,
        "HEALTH_DECISION_ANSWERS_REQUIRED",
        "Answers are required."
      );

      var values = normalizeAnswerValues_(answers);

      if (values.length === 0) {
        throw new AKS.Core.Exception(
          "HEALTH_DECISION_ANSWERS_EMPTY",
          "At least one answer is required."
        );
      }

      var positiveAnswerCount = 0;

      values.forEach(function (answer) {
        if (answer !== "YES" && answer !== "NO") {
          throw new AKS.Core.Exception(
            "HEALTH_DECISION_ANSWER_INVALID",
            "Each answer must be YES or NO."
          );
        }

        if (answer === "YES") {
          positiveAnswerCount += 1;
        }
      });

      var result =
        positiveAnswerCount > 0
          ? AKS.Modules.HealthQuestionnaire.Evaluation
              .MEDICAL_CERTIFICATE_REQUIRED
          : AKS.Modules.HealthQuestionnaire.Evaluation
              .NO_MEDICAL_CERTIFICATE_REQUIRED;

      return AKS.Modules.HealthQuestionnaire.DecisionResult({
        result: result,
        positiveAnswerCount: positiveAnswerCount,
        generatedAt: new Date()
      });
    }
  });

function normalizeAnswerValues_(answers) {
  if (Array.isArray(answers)) {
    return answers.slice();
  }

  if (typeof answers === "object") {
    return Object.keys(answers).map(function (questionId) {
      return answers[questionId];
    });
  }

  throw new AKS.Core.Exception(
    "HEALTH_DECISION_ANSWERS_INVALID",
    "Answers must be an array or an object."
  );
}
