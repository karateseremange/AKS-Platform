var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Creates an immutable questionnaire question.
 *
 * @param {Object} data
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.Question = function (data) {
  validateRequired_(data, "HEALTH_QUESTION_REQUIRED", "Question data is required.");

  var id = requireText_(data.id, "Question id");
  var label = requireText_(data.label, "Question label");

  var order = Number(data.order);
  if (!Number.isFinite(order) || order < 1) {
    throw new AKS.Core.Exception(
      "HEALTH_QUESTION_ORDER_INVALID",
      "Question order must be a positive number."
    );
  }

  return Object.freeze({
    id: id,
    label: label,
    order: order,
    required: data.required !== false,
    category: data.category || null
  });
};
