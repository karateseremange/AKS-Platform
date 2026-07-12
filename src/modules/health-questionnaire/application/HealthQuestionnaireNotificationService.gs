var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Sends the two HQ-007 notifications from administrative data only.
 * Detailed questionnaire answers are forbidden at this boundary.
 *
 * @param {Object} repository
 * @param {Object} emailGateway
 * @param {Object=} configuration
 * @param {Object=} clock
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.HealthQuestionnaireNotificationService =
  function (repository, emailGateway, configuration, clock) {
    AKS.Modules.HealthQuestionnaire.RepositoryContract.validate(repository);

    if (!emailGateway || typeof emailGateway.send !== "function") {
      throw new AKS.Core.Exception(
        "HEALTH_EMAIL_GATEWAY_INVALID",
        "Health questionnaire e-mail gateway is required."
      );
    }

    var config = configuration || {};
    var clubEmail = String(
      config.clubEmail || "contact@karate-seremange.fr"
    ).trim().toLowerCase();
    var senderName = String(
      config.senderName || "Association Karaté Serémange"
    ).trim();
    var now = clock || function () { return new Date(); };

    function notify(submission) {
      validateSubmission_(submission);

      var current = submission;

      if (!current.respondentEmailSentAt) {
        emailGateway.send(createRespondentMessage_(current));
        current = copySubmission_(current, {
          status: "EMAIL_SENT",
          respondentEmailSentAt: now()
        });
        repository.saveSubmission(current);
      }

      if (!current.clubEmailSentAt) {
        emailGateway.send(createClubMessage_(current));
        current = copySubmission_(current, {
          status: "COMPLETED",
          clubEmailSentAt: now()
        });
        repository.saveSubmission(current);
      }

      return current;
    }

    function createRespondentMessage_(submission) {
      var reference = escapeHtml_(submission.id);
      var minorName = escapeHtml_(
        submission.firstName + " " + submission.lastName
      );
      var common = {
        to: submission.email,
        from: clubEmail,
        senderName: senderName
      };

      if (submission.result === "NO_MEDICAL_CERTIFICATE_REQUIRED") {
        common.subject = "Questionnaire santé — attestation " + submission.id;
        common.textBody =
          "Votre questionnaire santé a bien été enregistré pour " +
          submission.firstName + " " + submission.lastName + ".\n\n" +
          "Aucun certificat médical n'est requis. L'attestation FFKDA est jointe à ce message.\n\n" +
          "Référence : " + submission.id;
        common.htmlBody =
          "<p>Votre questionnaire santé a bien été enregistré pour <strong>" +
          minorName + "</strong>.</p>" +
          "<p>Aucun certificat médical n’est requis. L’attestation FFKDA est jointe à ce message.</p>" +
          "<p>Référence : <strong>" + reference + "</strong></p>";
        common.attachmentFileId = submission.attestationFileId;
        return common;
      }

      common.subject = "Questionnaire santé — certificat médical requis";
      common.textBody =
        "Votre questionnaire santé a bien été enregistré pour " +
        submission.firstName + " " + submission.lastName + ".\n\n" +
        "Un certificat médical doit être remis au club avant la pratique. Aucun document n'est joint à ce message.\n\n" +
        "Référence : " + submission.id;
      common.htmlBody =
        "<p>Votre questionnaire santé a bien été enregistré pour <strong>" +
        minorName + "</strong>.</p>" +
        "<p>Un certificat médical doit être remis au club avant la pratique. Aucun document n’est joint à ce message.</p>" +
        "<p>Référence : <strong>" + reference + "</strong></p>";
      return common;
    }

    function createClubMessage_(submission) {
      var reference = escapeHtml_(submission.id);
      var minorName = submission.firstName + " " + submission.lastName;
      var birthDate = formatDate_(submission.birthDate);
      var formality = submission.result === "MEDICAL_CERTIFICATE_REQUIRED"
        ? "Certificat médical requis"
        : "Aucun certificat médical requis";
      return {
        to: clubEmail,
        from: clubEmail,
        senderName: senderName,
        subject: "Nouvelle soumission questionnaire santé — " + submission.id,
        textBody:
          "Une nouvelle soumission a été enregistrée.\n\n" +
          "Licencié : " + minorName + "\n" +
          "Date de naissance : " + birthDate + "\n" +
          "Référence : " + submission.id + "\n" +
          "Formalité : " + formality,
        htmlBody:
          "<p>Une nouvelle soumission a été enregistrée.</p>" +
          "<p>Licencié : <strong>" + escapeHtml_(minorName) + "</strong><br>" +
          "Date de naissance : <strong>" + escapeHtml_(birthDate) + "</strong><br>" +
          "Référence : <strong>" + reference + "</strong><br>" +
          "Formalité : <strong>" + escapeHtml_(formality) + "</strong></p>"
      };
    }

    function formatDate_(value) {
      var date = value instanceof Date ? value : new Date(value);
      var day = String(date.getDate()).padStart(2, "0");
      var month = String(date.getMonth() + 1).padStart(2, "0");
      return day + "/" + month + "/" + date.getFullYear();
    }

    function validateSubmission_(submission) {
      validateRequired_(
        submission,
        "HEALTH_NOTIFICATION_SUBMISSION_REQUIRED",
        "Submission is required for notifications."
      );

      ["answers", "answersJson", "responses", "responsesJson"].forEach(
        function (field) {
          if (Object.prototype.hasOwnProperty.call(submission, field)) {
            throw new AKS.Core.Exception(
              "HEALTH_NOTIFICATION_ANSWERS_FORBIDDEN",
              "Detailed answers must not enter notifications."
            );
          }
        }
      );

      if (
        submission.result === "NO_MEDICAL_CERTIFICATE_REQUIRED" &&
        !submission.attestationFileId
      ) {
        throw new AKS.Core.Exception(
          "HEALTH_NOTIFICATION_ATTESTATION_REQUIRED",
          "The FFKDA attestation is required before sending notifications."
        );
      }
    }

    function copySubmission_(submission, changes) {
      return AKS.Modules.HealthQuestionnaire.Submission({
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
        status: changes.status || submission.status,
        processingVersion: submission.processingVersion,
        submittedAt: submission.submittedAt,
        respondentEmailSentAt:
          changes.respondentEmailSentAt || submission.respondentEmailSentAt,
        clubEmailSentAt: changes.clubEmailSentAt || submission.clubEmailSentAt,
        attestationFileId: submission.attestationFileId,
        attestationFileUrl: submission.attestationFileUrl
      });
    }

    function escapeHtml_(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    return Object.freeze({ notify: notify });
  };
