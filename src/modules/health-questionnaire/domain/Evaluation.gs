var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire = AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.Evaluation = Object.freeze({
  STATUS_ELIGIBLE: "ELIGIBLE",
  STATUS_MEDICAL_REVIEW_REQUIRED: "MEDICAL_REVIEW_REQUIRED",
  STATUS_INCOMPLETE: "INCOMPLETE",

  evaluate: function (questionnaire, submission) {
    var missing = [];
    var positive = [];

    questionnaire.questions.forEach(function (question) {
      var answer = submission.answers[question.id];
      if (question.required && answer !== "YES" && answer !== "NO") {
        missing.push(question.id);
      }
      if (answer === "YES") {
        positive.push(question.id);
      }
    });

    if (!submission.declarationAccepted) {
      missing.push("DECLARATION");
    }

    if (missing.length > 0) {
      return Object.freeze({status: this.STATUS_INCOMPLETE, missingQuestionIds: missing, positiveQuestionIds: positive});
    }
    if (positive.length > 0) {
      return Object.freeze({status: this.STATUS_MEDICAL_REVIEW_REQUIRED, missingQuestionIds: [], positiveQuestionIds: positive});
    }
    return Object.freeze({status: this.STATUS_ELIGIBLE, missingQuestionIds: [], positiveQuestionIds: []});
  }
});
