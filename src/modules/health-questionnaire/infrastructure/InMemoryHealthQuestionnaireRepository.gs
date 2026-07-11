var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * In-memory repository used by tests.
 *
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.HealthQuestionnaireInMemoryRepository =
  function () {
    var submissions = [];
    var campaigns = Object.create(null);
    var questionnaires = Object.create(null);

    return AKS.Modules.HealthQuestionnaire.RepositoryContract.validate(
      Object.freeze({
        saveSubmission: function (record) {
          submissions.push(record);
          return record;
        },

        findLatestSubmissionByParticipant: function (
          participantId,
          campaignId
        ) {
          for (
            var index = submissions.length - 1;
            index >= 0;
            index -= 1
          ) {
            var submission = submissions[index].submission;

            if (
              submission.participantId === String(participantId) &&
              submission.campaignId === String(campaignId)
            ) {
              return submissions[index];
            }
          }

          return null;
        },

        saveCampaign: function (campaign) {
          campaigns[campaign.id] = campaign;
          return campaign;
        },

        findCampaignById: function (campaignId) {
          return campaigns[campaignId] || null;
        },

        saveQuestionnaire: function (questionnaire) {
          questionnaires[questionnaire.id] = questionnaire;
          return questionnaire;
        },

        findQuestionnaireById: function (questionnaireId) {
          return questionnaires[questionnaireId] || null;
        },

        clear: function () {
          submissions = [];
          campaigns = Object.create(null);
          questionnaires = Object.create(null);
        }
      })
    );
  };
