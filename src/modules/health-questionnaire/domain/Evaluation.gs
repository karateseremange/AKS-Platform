var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.Evaluation = Object.freeze({
  ELIGIBLE: "ELIGIBLE",
  MEDICAL_REVIEW_REQUIRED: "MEDICAL_REVIEW_REQUIRED",
  INCOMPLETE: "INCOMPLETE",

  /**
   * Evaluates a submission against a questionnaire.
   *
   * @param {Object} questionnaire
   * @param {Object} submission
   * @returns {Object}
   */
  evaluate: function (questionnaire, submission) {
    if (questionnaire.id !== submission.questionnaireId) {
      throw new AKS.Core.Exception(
        "HEALTH_EVALUATION_QUESTIONNAIRE_MISMATCH",
        "Submission does not belong to the questionnaire."
      );
    }

    var missingQuestionIds = [];
    var positiveQuestionIds = [];

    questionnaire.questions.forEach(function (question) {
      var answer = submission.answers[question.id];

      if (question.required && answer !== "YES" && answer !== "NO") {
        missingQuestionIds.push(question.id);
      }

      if (answer === "YES") {
        positiveQuestionIds.push(question.id);
      }
    });

    if (!submission.declarationAccepted) {
      missingQuestionIds.push("DECLARATION");
    }

    var status = this.ELIGIBLE;

    if (missingQuestionIds.length > 0) {
      status = this.INCOMPLETE;
    } else if (positiveQuestionIds.length > 0) {
      status = this.MEDICAL_REVIEW_REQUIRED;
    }

    return Object.freeze({
      status: status,
      missingQuestionIds: Object.freeze(missingQuestionIds),
      positiveQuestionIds: Object.freeze(positiveQuestionIds),
      evaluatedAt: new Date()
    });
  }
});
