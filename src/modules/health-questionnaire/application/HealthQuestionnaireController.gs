var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Coordinates the health questionnaire user interface.
 *
 * @param {Object} repository
 * @param {Object} service
 * @param {Object} settings
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.HealthQuestionnaireController =
  function (repository, service, settings) {
    function getContext() {
      var activeCampaignId =
        settings.getActiveCampaignId();

      if (!activeCampaignId) {
        return AKS.Core.Result.failure(
          "HEALTH_ACTIVE_CAMPAIGN_NOT_CONFIGURED",
          "Aucune campagne de questionnaire santé n'est active."
        );
      }

      var campaign =
        repository.findCampaignById(activeCampaignId);

      if (!campaign) {
        return AKS.Core.Result.failure(
          "HEALTH_CAMPAIGN_NOT_FOUND",
          "La campagne active est introuvable."
        );
      }

      if (campaign.status !== "OPEN") {
        return AKS.Core.Result.failure(
          "HEALTH_CAMPAIGN_NOT_OPEN",
          "La campagne n'est pas ouverte."
        );
      }

      var questionnaire =
        repository.findQuestionnaireById(
          campaign.questionnaireId
        );

      if (!questionnaire) {
        return AKS.Core.Result.failure(
          "HEALTH_QUESTIONNAIRE_NOT_FOUND",
          "Le questionnaire associé est introuvable."
        );
      }

      return AKS.Core.Result.success({
        campaign: campaign,
        questionnaire: questionnaire
      });
    }

    function submit(payload) {
      if (!payload || typeof payload !== "object") {
        return AKS.Core.Result.failure(
          "HEALTH_UI_PAYLOAD_REQUIRED",
          "Les données du formulaire sont requises."
        );
      }

      var contextResult = getContext();

      if (!contextResult.ok) {
        return contextResult;
      }

      var context = contextResult.data;

      return service.submit(
        context.questionnaire,
        {
          id: Utilities.getUuid(),
          campaignId: context.campaign.id,
          questionnaireId:
            context.questionnaire.id,
          email: payload.email,
          lastName: payload.lastName,
          firstName: payload.firstName,
          birthDate: payload.birthDate,
          sex: payload.sex,
          legalRepresentativeLastName:
            payload.legalRepresentativeLastName,
          legalRepresentativeFirstName:
            payload.legalRepresentativeFirstName,
          answers: payload.answers || {},
          declarationAccepted:
            payload.declarationAccepted === true,
          submittedAt: new Date()
        }
      );
    }

    function getCampaignOptions() {
      var campaigns = repository.listCampaigns();
      var activeCampaignId = settings.getActiveCampaignId();

      return AKS.Core.Result.success({
        activeCampaignId: activeCampaignId || null,
        campaigns: campaigns.map(function (campaign) {
          return {
            id: campaign.id,
            name: campaign.name,
            season: campaign.season,
            status: campaign.status,
            isActive: campaign.id === activeCampaignId
          };
        })
      });
    }

    function createCampaign(campaignData) {
      if (!campaignData || typeof campaignData !== "object") {
        return AKS.Core.Result.failure(
          "HEALTH_CAMPAIGN_DATA_REQUIRED",
          "Les informations de la campagne sont requises."
        );
      }

      var season = String(campaignData.season || "").trim();
      var name = String(campaignData.name || "").trim();

      if (!season) {
        return AKS.Core.Result.failure(
          "HEALTH_CAMPAIGN_SEASON_REQUIRED",
          "La saison de la campagne est requise."
        );
      }

      if (!name) {
        name = "Campagne santé " + season;
      }

      var campaignId = "HQ-CAMPAIGN-" + season
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (repository.findCampaignById(campaignId)) {
        return AKS.Core.Result.failure(
          "HEALTH_CAMPAIGN_ALREADY_EXISTS",
          "Une campagne existe déjà pour cette saison."
        );
      }

      var questionnaire =
        AKS.Modules.HealthQuestionnaire.Definition();

      service.saveQuestionnaire(questionnaire);

      var campaignResult = service.saveCampaign({
        id: campaignId,
        name: name,
        season: season,
        questionnaireId: questionnaire.id,
        status: "OPEN",
        opensAt: new Date(),
        closesAt: null,
        createdAt: new Date()
      });

      if (!campaignResult.ok) {
        return campaignResult;
      }

      settings.setActiveCampaignId(campaignId);

      return AKS.Core.Result.success({
        campaign: campaignResult.data,
        questionnaire: questionnaire,
        activeCampaignId: campaignId
      });
    }

    function setActiveCampaign(campaignId) {
      var campaign =
        repository.findCampaignById(campaignId);

      if (!campaign) {
        return AKS.Core.Result.failure(
          "HEALTH_CAMPAIGN_NOT_FOUND",
          "La campagne indiquée est introuvable."
        );
      }

      settings.setActiveCampaignId(campaign.id);

      return AKS.Core.Result.success({
        campaignId: campaign.id
      });
    }

    return Object.freeze({
      getContext: getContext,
      submit: submit,
      getCampaignOptions: getCampaignOptions,
      createCampaign: createCampaign,
      setActiveCampaign: setActiveCampaign
    });
  };
