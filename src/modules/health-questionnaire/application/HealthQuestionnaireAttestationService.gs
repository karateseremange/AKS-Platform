var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.HealthQuestionnaireAttestationService =
  function (repository, generator) {
    AKS.Modules.HealthQuestionnaire.RepositoryContract.validate(repository);

    function generateForSubmission(submission) {
      var generated = generator.generate(submission);
      var updated = AKS.Modules.HealthQuestionnaire.Submission({
        id: submission.id,
        campaignId: submission.campaignId,
        questionnaireId: submission.questionnaireId,
        questionnaireVersion: submission.questionnaireVersion,
        email: submission.email,
        lastName: submission.lastName,
        firstName: submission.firstName,
        birthDate: submission.birthDate,
        sex: submission.sex,
        legalRepresentativeLastName: submission.legalRepresentativeLastName,
        legalRepresentativeFirstName: submission.legalRepresentativeFirstName,
        result: submission.result,
        status: "PDF_GENERATED",
        processingVersion: submission.processingVersion,
        submittedAt: submission.submittedAt,
        respondentEmailSentAt: submission.respondentEmailSentAt,
        clubEmailSentAt: submission.clubEmailSentAt,
        attestationFileId: generated.fileId,
        attestationFileUrl: generated.fileUrl
      });

      repository.saveSubmission(updated);
      return updated;
    }

    return Object.freeze({ generateForSubmission: generateForSubmission });
  };
