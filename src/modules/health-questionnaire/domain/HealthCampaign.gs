var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Creates an immutable health campaign.
 *
 * @param {Object} data
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.HealthCampaign = function (data) {
  validateRequired_(data, "HEALTH_CAMPAIGN_REQUIRED", "Campaign data is required.");

  var id = requireText_(data.id, "Campaign id");
  var name = requireText_(data.name, "Campaign name");
  var season = requireText_(data.season, "Campaign season");
  var questionnaireId = requireText_(
    data.questionnaireId,
    "Questionnaire id"
  );

  var allowedStatuses = ["DRAFT", "OPEN", "CLOSED", "ARCHIVED"];
  var status = data.status || "DRAFT";

  if (allowedStatuses.indexOf(status) === -1) {
    throw new AKS.Core.Exception(
      "HEALTH_CAMPAIGN_STATUS_INVALID",
      "Invalid campaign status: " + status
    );
  }

  return Object.freeze({
    id: id,
    name: name,
    season: season,
    questionnaireId: questionnaireId,
    status: status,
    opensAt: normalizeDate_(data.opensAt),
    closesAt: normalizeDate_(data.closesAt),
    createdAt: normalizeDate_(data.createdAt) || new Date()
  });
};
