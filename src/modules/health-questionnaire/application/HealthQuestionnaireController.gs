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
    function getContext(participantId) {
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

      var latestSubmission = null;

      if (participantId) {
        latestSubmission =
          repository.findLatestSubmissionByParticipant(
            participantId,
            campaign.id
          );
      }

      return AKS.Core.Result.success({
        campaign: campaign,
        questionnaire: questionnaire,
        latestSubmission: latestSubmission
      });
    }

    function submit(payload) {
      if (!payload || typeof payload !== "object") {
        return AKS.Core.Result.failure(
          "HEALTH_UI_PAYLOAD_REQUIRED",
          "Les données du formulaire sont requises."
        );
      }

      var contextResult = getContext(
        payload.participantId
      );

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
          participantId: payload.participantId,
          respondentType:
            payload.respondentType || "PARTICIPANT",
          answers: payload.answers || {},
          declarationAccepted:
            payload.declarationAccepted === true,
          submittedAt: new Date()
        }
      );
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
      setActiveCampaign: setActiveCampaign
    });
  };
