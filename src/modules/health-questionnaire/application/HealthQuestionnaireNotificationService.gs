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

    function notify(submission, answerSummary) {
      validateSubmission_(submission);

      var current = submission;

      if (!current.respondentEmailSentAt) {
        validateAnswerSummary_(answerSummary);
        emailGateway.send(
          createRespondentMessage_(current, answerSummary)
        );
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

    function createRespondentMessage_(submission, answerSummary) {
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
          "Madame, Monsieur,\n\n" +
          "Nous vous confirmons l'enregistrement du questionnaire santé concernant :\n\n" +
          submission.firstName + " " + submission.lastName + "\n\n" +
          "Au regard de la déclaration effectuée, aucun certificat médical n'est requis.\n\n" +
          "Vous trouverez en pièce jointe l'attestation FFKDA préremplie. " +
          "Nous vous invitons à la dater, à la signer et à la transmettre à " +
          "l'Association Karaté Serémange afin de finaliser le dossier d'inscription.\n\n" +
          "Aucune réponse apportée au questionnaire n'a été enregistrée ni transmise au club.\n\n" +
          createAnswerSummaryText_(answerSummary) + "\n\n" +
          "Référence du dossier : " + submission.id + "\n\n" +
          "Cordialement,\n\nAssociation Karaté Serémange\n" + clubEmail;
        common.htmlBody =
          "<p>Madame, Monsieur,</p>" +
          "<p>Nous vous confirmons l’enregistrement du questionnaire santé concernant :</p>" +
          "<p><strong>" + minorName + "</strong></p>" +
          "<p>Au regard de la déclaration effectuée, aucun certificat médical n’est requis.</p>" +
          "<p>Vous trouverez en pièce jointe l’attestation FFKDA préremplie. " +
          "Nous vous invitons à la dater, à la signer et à la transmettre à " +
          "l’Association Karaté Serémange afin de finaliser le dossier d’inscription.</p>" +
          "<p>Aucune réponse apportée au questionnaire n’a été enregistrée ni transmise au club.</p>" +
          createAnswerSummaryHtml_(answerSummary) +
          "<p>Référence du dossier : <strong>" + reference + "</strong></p>" +
          "<p>Cordialement,</p><p>Association Karaté Serémange<br>" +
          escapeHtml_(clubEmail) + "</p>";
        common.attachmentFileId = submission.attestationFileId;
        return common;
      }

      common.subject = "Questionnaire santé — certificat médical requis";
      common.textBody =
        "Madame, Monsieur,\n\n" +
        "Nous vous confirmons l'enregistrement du questionnaire santé concernant :\n\n" +
        submission.firstName + " " + submission.lastName + "\n\n" +
        "Au regard de la déclaration effectuée, un certificat médical devra être " +
        "transmis à l'Association Karaté Serémange afin de finaliser le dossier d'inscription.\n\n" +
        "Aucune réponse apportée au questionnaire n'a été enregistrée ni transmise au club.\n\n" +
        createAnswerSummaryText_(answerSummary) + "\n\n" +
        "Référence du dossier : " + submission.id + "\n\n" +
        "Cordialement,\n\nAssociation Karaté Serémange\n" + clubEmail;
      common.htmlBody =
        "<p>Madame, Monsieur,</p>" +
        "<p>Nous vous confirmons l’enregistrement du questionnaire santé concernant :</p>" +
        "<p><strong>" + minorName + "</strong></p>" +
        "<p>Au regard de la déclaration effectuée, un certificat médical devra être " +
        "transmis à l’Association Karaté Serémange afin de finaliser le dossier d’inscription.</p>" +
        "<p>Aucune réponse apportée au questionnaire n’a été enregistrée ni transmise au club.</p>" +
        createAnswerSummaryHtml_(answerSummary) +
        "<p>Référence du dossier : <strong>" + reference + "</strong></p>" +
        "<p>Cordialement,</p><p>Association Karaté Serémange<br>" +
        escapeHtml_(clubEmail) + "</p>";
      return common;
    }

    function validateAnswerSummary_(answerSummary) {
      if (!Array.isArray(answerSummary) || answerSummary.length === 0) {
        throw new AKS.Core.Exception(
          "HEALTH_NOTIFICATION_ANSWER_SUMMARY_REQUIRED",
          "The ephemeral answer summary is required for the respondent e-mail."
        );
      }

      answerSummary.forEach(function (item) {
        if (
          !item ||
          !String(item.question || "").trim() ||
          ["Oui", "Non"].indexOf(item.answer) === -1
        ) {
          throw new AKS.Core.Exception(
            "HEALTH_NOTIFICATION_ANSWER_SUMMARY_INVALID",
            "The ephemeral answer summary is invalid."
          );
        }
      });
    }

    function createAnswerSummaryText_(answerSummary) {
      var lines = ["Récapitulatif du questionnaire"];
      answerSummary.forEach(function (item, index) {
        lines.push(
          (index + 1) + ". " + item.question + "\nRéponse : " + item.answer
        );
      });
      return lines.join("\n\n");
    }

    function createAnswerSummaryHtml_(answerSummary) {
      var items = answerSummary.map(function (item) {
        return "<li>" + escapeHtml_(item.question) +
          "<br><strong>Réponse : " + escapeHtml_(item.answer) +
          "</strong></li>";
      }).join("");
      return "<h3>Récapitulatif du questionnaire</h3><ol>" +
        items + "</ol>";
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
      var isUtcMidnight =
        date.getUTCHours() === 0 &&
        date.getUTCMinutes() === 0 &&
        date.getUTCSeconds() === 0;
      var day = isUtcMidnight ? date.getUTCDate() : date.getDate();
      var month = isUtcMidnight
        ? date.getUTCMonth() + 1
        : date.getMonth() + 1;
      var year = isUtcMidnight
        ? date.getUTCFullYear()
        : date.getFullYear();

      return String(day).padStart(2, "0") + "/" +
        String(month).padStart(2, "0") + "/" + year;
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
