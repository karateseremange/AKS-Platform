var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Generates and stores the official minor attestation.
 * It accepts an administrative Submission only; questionnaire answers are
 * deliberately outside this boundary.
 *
 * @param {Object=} dependencies Test substitutes for Apps Script services.
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.HealthQuestionnaireAttestationGenerator =
  function (dependencies) {
    var services = dependencies || {};
    var pdfRenderer = services.pdfRenderer || renderPdf_;
    var fileStore = services.fileStore || storePdf_;
    var qrProvider = services.qrProvider || createQrDataUri_;

    function generate(submission) {
      validateSubmission_(submission);

      var verificationPayload = createVerificationPayload_(submission.id);
      var pdfBlob = pdfRenderer({
        submissionId: submission.id,
        legalRepresentativeName: joinName_(
          submission.legalRepresentativeFirstName,
          submission.legalRepresentativeLastName
        ),
        minorName: joinName_(submission.firstName, submission.lastName),
        qrCodeDataUri: qrProvider(verificationPayload)
      });
      var storedFile = fileStore(pdfBlob, createFileName_(submission));

      return Object.freeze({
        fileId: String(storedFile.fileId),
        fileUrl: String(storedFile.fileUrl),
        verificationPayload: verificationPayload
      });
    }

    function validateSubmission_(submission) {
      validateRequired_(
        submission,
        "HEALTH_ATTESTATION_SUBMISSION_REQUIRED",
        "Submission is required to generate an attestation."
      );

      if (
        submission.result !== "NO_MEDICAL_CERTIFICATE_REQUIRED"
      ) {
        throw new AKS.Core.Exception(
          "HEALTH_ATTESTATION_NOT_ALLOWED",
          "An attestation may only be generated when no medical certificate is required."
        );
      }

      ["answers", "answersJson", "responses", "responsesJson"].forEach(
        function (field) {
          if (Object.prototype.hasOwnProperty.call(submission, field)) {
            throw new AKS.Core.Exception(
              "HEALTH_ATTESTATION_ANSWERS_FORBIDDEN",
              "Detailed answers must not enter the attestation generator."
            );
          }
        }
      );
    }

    function createVerificationPayload_(submissionId) {
      return "AKS-QS|1|" + String(submissionId);
    }

    function createFileName_(submission) {
      return "Attestation-FFKDA-" + submission.id + ".pdf";
    }

    function joinName_(firstName, lastName) {
      return String(firstName).trim() + " " + String(lastName).trim();
    }

    function renderPdf_(viewModel) {
      var template = HtmlService.createTemplateFromFile(
        "modules/health-questionnaire/infrastructure/HealthQuestionnaireAttestationTemplate"
      );
      template.attestation = viewModel;

      return template
        .evaluate()
        .getBlob()
        .getAs(MimeType.PDF)
        .setName("attestation.pdf");
    }

    function createQrDataUri_(payload) {
      var response = UrlFetchApp.fetch(
        "https://quickchart.io/qr?size=120&margin=0&ecLevel=M&text=" +
          encodeURIComponent(payload),
        { muteHttpExceptions: true }
      );

      if (response.getResponseCode() !== 200) {
        throw new AKS.Core.Exception(
          "HEALTH_ATTESTATION_QR_UNAVAILABLE",
          "The verification QR code could not be generated."
        );
      }

      return "data:image/png;base64," +
        Utilities.base64Encode(response.getBlob().getBytes());
    }

    function storePdf_(blob, fileName) {
      var properties = PropertiesService.getScriptProperties();
      var folderId = properties.getProperty(
        "AKS_HEALTH_QUESTIONNAIRE_ATTESTATION_FOLDER_ID"
      );

      if (!folderId) {
        throw new AKS.Core.Exception(
          "HEALTH_ATTESTATION_FOLDER_NOT_CONFIGURED",
          "The Drive folder used for attestations is not configured."
        );
      }

      var file = DriveApp.getFolderById(folderId).createFile(
        blob.setName(fileName)
      );
      return { fileId: file.getId(), fileUrl: file.getUrl() };
    }

    return Object.freeze({ generate: generate });
  };
