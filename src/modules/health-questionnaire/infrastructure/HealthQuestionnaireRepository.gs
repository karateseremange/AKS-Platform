var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Defines the repository contract expected by the application layer.
 *
 * Implementations must provide:
 * - saveSubmission(record)
 * - findLatestSubmissionByParticipant(participantId, campaignId)
 * - saveCampaign(campaign)
 * - findCampaignById(campaignId)
 * - saveQuestionnaire(questionnaire)
 * - findQuestionnaireById(questionnaireId)
 */
AKS.Modules.HealthQuestionnaire.RepositoryContract = Object.freeze({
  validate: function (repository) {
    var methods = [
      "saveSubmission",
      "findLatestSubmissionByParticipant",
      "saveCampaign",
      "findCampaignById",
      "saveQuestionnaire",
      "findQuestionnaireById"
    ];

    methods.forEach(function (methodName) {
      if (!repository || typeof repository[methodName] !== "function") {
        throw new AKS.Core.Exception(
          "HEALTH_REPOSITORY_INVALID",
          "Repository method is missing: " + methodName
        );
      }
    });

    return repository;
  }
});
