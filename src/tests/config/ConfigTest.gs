function AKS_testConfig_returnsNormalizedImmutableAdministratorEmails() {
  var api = AKS_createConfigApi_(function () {
    return {
      ADMIN: {
        AUTHORIZED_ADMIN_EMAILS: ["  ADMIN@EXAMPLE.COM  "]
      }
    };
  });

  var emails = api.getAuthorizedAdminEmails();

  assertEquals_(1, emails.length);
  assertEquals_("admin@example.com", emails[0]);
  assertTrue_(Object.isFrozen(emails), "The returned configuration copy must be immutable.");
}

function AKS_testConfig_rejectsMissingAdministratorConfiguration() {
  var api = AKS_createConfigApi_(function () {
    return {};
  });

  assertThrows_(function () {
    api.getAuthorizedAdminEmails();
  }, "CONFIG001_INVALID_ADMIN_CONFIGURATION");
}

function AKS_testConfig_rejectsEmptyAdministratorConfiguration() {
  var api = AKS_createConfigApi_(function () {
    return { ADMIN: { AUTHORIZED_ADMIN_EMAILS: [] } };
  });

  assertThrows_(function () {
    api.getAuthorizedAdminEmails();
  }, "CONFIG001_INVALID_ADMIN_CONFIGURATION");
}

function AKS_testConfig_rejectsInvalidAdministratorEmail() {
  var api = AKS_createConfigApi_(function () {
    return { ADMIN: { AUTHORIZED_ADMIN_EMAILS: ["not-an-email"] } };
  });

  assertThrows_(function () {
    api.getAuthorizedAdminEmails();
  }, "CONFIG001_INVALID_ADMIN_CONFIGURATION");
}

function AKS_testConfig_rejectsDuplicateAdministratorEmailsAfterNormalization() {
  var api = AKS_createConfigApi_(function () {
    return {
      ADMIN: {
        AUTHORIZED_ADMIN_EMAILS: ["admin@example.com", " ADMIN@EXAMPLE.COM "]
      }
    };
  });

  assertThrows_(function () {
    api.getAuthorizedAdminEmails();
  }, "CONFIG001_INVALID_ADMIN_CONFIGURATION");
}
