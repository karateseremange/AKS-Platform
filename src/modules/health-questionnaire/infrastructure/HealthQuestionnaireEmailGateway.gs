var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Infrastructure boundary for outbound questionnaire e-mails.
 *
 * The configured club address must be an authorized Gmail alias of the
 * account executing the Web App.
 *
 * @param {Object=} dependencies Test substitutes for Apps Script services.
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.HealthQuestionnaireEmailGateway =
  function (dependencies) {
    var services = dependencies || {};
    var sender = services.sender || sendWithGmail_;
    var attachmentProvider =
      services.attachmentProvider || getDriveAttachment_;
    var senderAddressesProvider =
      services.senderAddressesProvider || getAuthorizedSenderAddresses_;

    function send(message) {
      validateMessage_(message);

      var options = {
        from: message.from,
        name: message.senderName,
        replyTo: message.from,
        htmlBody: message.htmlBody
      };

      if (message.attachmentFileId) {
        options.attachments = [
          attachmentProvider(message.attachmentFileId)
        ];
      }

      sender(message.to, message.subject, message.textBody, options);
    }

    function validateMessage_(message) {
      validateRequired_(
        message,
        "HEALTH_EMAIL_MESSAGE_REQUIRED",
        "E-mail message is required."
      );

      ["to", "from", "senderName", "subject", "textBody", "htmlBody"]
        .forEach(function (field) {
          if (!String(message[field] || "").trim()) {
            throw new AKS.Core.Exception(
              "HEALTH_EMAIL_MESSAGE_INVALID",
              "E-mail field is required: " + field
            );
          }
        });
    }

    function sendWithGmail_(to, subject, textBody, options) {
      var authorizedAddresses = senderAddressesProvider();
      if (authorizedAddresses.indexOf(options.from) === -1) {
        throw new AKS.Core.Exception(
          "HEALTH_EMAIL_SENDER_ALIAS_NOT_CONFIGURED",
          "The club e-mail address is not an authorized Gmail alias."
        );
      }
      GmailApp.sendEmail(to, subject, textBody, options);
    }

    function getAuthorizedSenderAddresses_() {
      var addresses = GmailApp.getAliases().map(function (address) {
        return String(address).trim().toLowerCase();
      });
      var effectiveUserEmail = String(
        Session.getEffectiveUser().getEmail() || ""
      ).trim().toLowerCase();

      if (effectiveUserEmail && addresses.indexOf(effectiveUserEmail) === -1) {
        addresses.push(effectiveUserEmail);
      }
      return addresses;
    }

    function getDriveAttachment_(fileId) {
      return DriveApp.getFileById(fileId).getBlob();
    }

    return Object.freeze({ send: send });
  };
