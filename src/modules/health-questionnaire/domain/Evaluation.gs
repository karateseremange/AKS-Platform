var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.Evaluation = Object.freeze({
  NO_MEDICAL_CERTIFICATE_REQUIRED:
    "NO_MEDICAL_CERTIFICATE_REQUIRED",
  MEDICAL_CERTIFICATE_REQUIRED:
    "MEDICAL_CERTIFICATE_REQUIRED",
  INCOMPLETE: "INCOMPLETE",

  /**
   * Evaluates transient answers. The returned details must not be persisted.
   *
   * @param {Object} questionnaire
   * @param {Object} assessment
   * @returns {Object}
   */
  evaluate: function (questionnaire, assessment) {
    validateRequired_(
      assessment,
      "HEALTH_ASSESSMENT_REQUIRED",
      "Assessment data is required."
    );

    if (questionnaire.id !== assessment.questionnaireId) {
      throw new AKS.Core.Exception(
        "HEALTH_EVALUATION_QUESTIONNAIRE_MISMATCH",
        "Assessment does not belong to the questionnaire."
      );
    }

    var answers = Object.assign({}, assessment.answers || {});
    var missingQuestionIds = [];
    var positiveQuestionIds = [];

    questionnaire.questions.forEach(function (question) {
      var answer = answers[question.id];

      if (question.required && answer !== "YES" && answer !== "NO") {
        missingQuestionIds.push(question.id);
      }

      if (answer === "YES") {
        positiveQuestionIds.push(question.id);
      }
    });

    if (assessment.declarationAccepted !== true) {
      missingQuestionIds.push("DECLARATION");
    }

    var status = this.NO_MEDICAL_CERTIFICATE_REQUIRED;

    if (missingQuestionIds.length > 0) {
      status = this.INCOMPLETE;
    } else if (positiveQuestionIds.length > 0) {
      status = this.MEDICAL_CERTIFICATE_REQUIRED;
    }

    return Object.freeze({
      status: status,
      missingQuestionIds: Object.freeze(missingQuestionIds),
      positiveQuestionIds: Object.freeze(positiveQuestionIds),
      evaluatedAt: new Date()
    });
  }
});
