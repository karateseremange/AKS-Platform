var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Creates an immutable questionnaire definition.
 *
 * @param {Object} data
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.Questionnaire = function (data) {
  validateRequired_(
    data,
    "HEALTH_QUESTIONNAIRE_REQUIRED",
    "Questionnaire data is required."
  );

  var id = requireText_(data.id, "Questionnaire id");
  var title = requireText_(data.title, "Questionnaire title");
  var version = requireText_(data.version, "Questionnaire version");
  var audience = requireText_(data.audience, "Questionnaire audience");

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new AKS.Core.Exception(
      "HEALTH_QUESTIONNAIRE_QUESTIONS_REQUIRED",
      "At least one question is required."
    );
  }

  var questions = data.questions
    .map(function (question) {
      return AKS.Modules.HealthQuestionnaire.Question(question);
    })
    .sort(function (left, right) {
      return left.order - right.order;
    });

  ensureUniqueQuestionIds_(questions);

  return Object.freeze({
    id: id,
    title: title,
    version: version,
    audience: audience,
    source: data.source || null,
    effectiveFrom: normalizeDate_(data.effectiveFrom),
    effectiveTo: normalizeDate_(data.effectiveTo),
    questions: Object.freeze(questions)
  });
};

function ensureUniqueQuestionIds_(questions) {
  var ids = Object.create(null);

  questions.forEach(function (question) {
    if (ids[question.id]) {
      throw new AKS.Core.Exception(
        "HEALTH_QUESTION_DUPLICATE_ID",
        "Duplicate question id: " + question.id
      );
    }

    ids[question.id] = true;
  });
}
