var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Application service for questionnaire operations.
 *
 * @param {Object} repository
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.HealthQuestionnaireApplicationService =
  function (repository) {
    AKS.Modules.HealthQuestionnaire.RepositoryContract.validate(
      repository
    );

    function submit(questionnaire, submissionData) {
      var submission =
        AKS.Modules.HealthQuestionnaire.Submission(submissionData);

      var evaluation =
        AKS.Modules.HealthQuestionnaire.Evaluation.evaluate(
          questionnaire,
          submission
        );

      var record = Object.freeze({
        submission: submission,
        evaluation: evaluation
      });

      repository.saveSubmission(record);

      return AKS.Core.Result.success(record);
    }

    function getLatestSubmission(participantId, campaignId) {
      return AKS.Core.Result.success(
        repository.findLatestSubmissionByParticipant(
          participantId,
          campaignId
        )
      );
    }

    function saveCampaign(campaignData) {
      var campaign =
        AKS.Modules.HealthQuestionnaire.HealthCampaign(
          campaignData
        );

      repository.saveCampaign(campaign);
      return AKS.Core.Result.success(campaign);
    }

    function saveQuestionnaire(questionnaireData) {
      var questionnaire =
        AKS.Modules.HealthQuestionnaire.Questionnaire(
          questionnaireData
        );

      repository.saveQuestionnaire(questionnaire);
      return AKS.Core.Result.success(questionnaire);
    }

    return Object.freeze({
      submit: submit,
      getLatestSubmission: getLatestSubmission,
      saveCampaign: saveCampaign,
      saveQuestionnaire: saveQuestionnaire
    });
  };
