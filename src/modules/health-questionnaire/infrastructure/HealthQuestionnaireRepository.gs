var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Defines the repository contract expected by the application layer.
 * Detailed questionnaire answers are explicitly outside this contract.
 */
AKS.Modules.HealthQuestionnaire.RepositoryContract = Object.freeze({
  validate: function (repository) {
    var methods = [
      "saveSubmission",
      "findSubmissionById",
      "listSubmissionsByCampaign",
      "saveCampaign",
      "findCampaignById",
      "listCampaigns",
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
