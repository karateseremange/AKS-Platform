var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Stores module settings in Script Properties.
 */
AKS.Modules.HealthQuestionnaire.HealthQuestionnaireSettings =
  function () {
    var ACTIVE_CAMPAIGN_KEY =
      "AKS_HEALTH_QUESTIONNAIRE_ACTIVE_CAMPAIGN_ID";

    return Object.freeze({
      getActiveCampaignId: function () {
        return PropertiesService
          .getScriptProperties()
          .getProperty(ACTIVE_CAMPAIGN_KEY);
      },

      setActiveCampaignId: function (campaignId) {
        if (
          typeof campaignId !== "string" ||
          campaignId.trim() === ""
        ) {
          throw new AKS.Core.Exception(
            "HEALTH_ACTIVE_CAMPAIGN_REQUIRED",
            "Active campaign id is required."
          );
        }

        PropertiesService
          .getScriptProperties()
          .setProperty(
            ACTIVE_CAMPAIGN_KEY,
            campaignId.trim()
          );

        return campaignId.trim();
      },

      clearActiveCampaignId: function () {
        PropertiesService
          .getScriptProperties()
          .deleteProperty(ACTIVE_CAMPAIGN_KEY);
      }
    });
  };
