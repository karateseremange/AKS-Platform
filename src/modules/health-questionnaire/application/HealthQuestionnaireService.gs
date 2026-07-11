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
    AKS.Modules.HealthQuestionnaire.RepositoryContract.validate(repository);

    function submit(questionnaire, submissionData) {
      validateRequired_(
        submissionData,
        "HEALTH_SUBMISSION_REQUIRED",
        "Submission data is required."
      );

      var evaluation =
        AKS.Modules.HealthQuestionnaire.Evaluation.evaluate(
          questionnaire,
          {
            questionnaireId: submissionData.questionnaireId,
            answers: submissionData.answers || {},
            declarationAccepted:
              submissionData.declarationAccepted === true
          }
        );

      if (
        evaluation.status ===
        AKS.Modules.HealthQuestionnaire.Evaluation.INCOMPLETE
      ) {
        return AKS.Core.Result.failure(
          "HEALTH_SUBMISSION_INCOMPLETE",
          "The questionnaire is incomplete.",
          { missingQuestionIds: evaluation.missingQuestionIds }
        );
      }

      var submission = AKS.Modules.HealthQuestionnaire.Submission({
        id: submissionData.id,
        campaignId: submissionData.campaignId,
        questionnaireId: submissionData.questionnaireId,
        email: submissionData.email,
        lastName: submissionData.lastName,
        firstName: submissionData.firstName,
        birthDate: submissionData.birthDate,
        sex: submissionData.sex,
        legalRepresentativeLastName:
          submissionData.legalRepresentativeLastName,
        legalRepresentativeFirstName:
          submissionData.legalRepresentativeFirstName,
        result: evaluation.status,
        submittedAt: submissionData.submittedAt,
        respondentEmailSentAt:
          submissionData.respondentEmailSentAt,
        clubEmailSentAt: submissionData.clubEmailSentAt,
        attestationFileId: submissionData.attestationFileId,
        attestationFileUrl: submissionData.attestationFileUrl
      });

      repository.saveSubmission(submission);

      return AKS.Core.Result.success({
        submission: submission,
        evaluation: evaluation
      });
    }

    function getSubmissionById(submissionId) {
      return AKS.Core.Result.success(
        repository.findSubmissionById(submissionId)
      );
    }

    function saveCampaign(campaignData) {
      var campaign =
        AKS.Modules.HealthQuestionnaire.HealthCampaign(campaignData);

      repository.saveCampaign(campaign);
      return AKS.Core.Result.success(campaign);
    }

    function saveQuestionnaire(questionnaireData) {
      var questionnaire =
        AKS.Modules.HealthQuestionnaire.Questionnaire(questionnaireData);

      repository.saveQuestionnaire(questionnaire);
      return AKS.Core.Result.success(questionnaire);
    }

    return Object.freeze({
      submit: submit,
      getSubmissionById: getSubmissionById,
      saveCampaign: saveCampaign,
      saveQuestionnaire: saveQuestionnaire
    });
  };
