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

function AKS_testConfig001_registersImmutableDefinition_() {
  var registry = AKS_createParameterRegistry_();
  var definition = registry.register({
    key: "club.contact.email",
    label: "Adresse de contact",
    type: "email",
    scope: "platform",
    required: true,
    administrable: true
  });

  assertEquals_("club.contact.email", definition.key);
  assertTrue_(Object.isFrozen(definition));
  assertEquals_(1, registry.list().length);
}

function AKS_testConfig001_rejectsDuplicateKey_() {
  var registry = AKS_createParameterRegistry_();
  var definition = {
    key: "platform.activeSeason",
    label: "Saison active",
    type: "string",
    scope: "platform"
  };

  registry.register(definition);
  assertThrows_(function () {
    registry.register(definition);
  }, "CONFIG001_DUPLICATE_KEY");
}

function AKS_testConfig001_rejectsInvalidKey_() {
  var registry = AKS_createParameterRegistry_();

  assertThrows_(function () {
    registry.register({
      key: "ACTIVE_SEASON",
      label: "Saison active",
      type: "string",
      scope: "platform"
    });
  }, "CONFIG001_INVALID_KEY");
}

function AKS_testConfig001_rejectsSecretValue_() {
  var registry = AKS_createParameterRegistry_();

  assertThrows_(function () {
    registry.register({
      key: "integration.apiToken",
      label: "Jeton API",
      type: "string",
      scope: "integration",
      secretValue: "never-store-this"
    });
  }, "CONFIG001_SECRET_FORBIDDEN");
}

function AKS_testConfig001_resolvesExplicitValue_() {
  var registry = AKS_createParameterRegistry_();
  registry.register({
    key: "club.contact.email",
    label: "Adresse de contact",
    type: "email",
    scope: "platform",
    required: true
  });
  var service = AKS_createConfigurationService_(registry, {
    has: function (key) { return key === "club.contact.email"; },
    get: function () { return "contact@karate-seremange.fr"; }
  });

  var result = service.resolve("club.contact.email");
  assertEquals_("contact@karate-seremange.fr", result.value);
  assertEquals_("explicit", result.source);
  assertTrue_(result.explicit);
  assertTrue_(Object.isFrozen(result));
}

function AKS_testConfig001_resolvesDocumentedDefault_() {
  var registry = AKS_createParameterRegistry_();
  registry.register({
    key: "platform.language",
    label: "Langue",
    type: "string",
    scope: "platform",
    defaultValue: "fr"
  });
  var service = AKS_createConfigurationService_(registry, {
    has: function () { return false; },
    get: function () { return null; }
  });

  var result = service.resolve("platform.language");
  assertEquals_("fr", result.value);
  assertEquals_("default", result.source);
  assertEquals_(false, result.explicit);
}

function AKS_testConfig001_rejectsMissingRequiredValue_() {
  var registry = AKS_createParameterRegistry_();
  registry.register({
    key: "platform.activeSeason",
    label: "Saison active",
    type: "string",
    scope: "platform",
    required: true
  });
  var service = AKS_createConfigurationService_(registry, {
    has: function () { return false; },
    get: function () { return null; }
  });

  assertThrows_(function () {
    service.resolve("platform.activeSeason");
  }, "CONFIG001_REQUIRED_PARAMETER_MISSING");
}

function AKS_testConfig001_rejectsInvalidExplicitValue_() {
  var registry = AKS_createParameterRegistry_();
  registry.register({
    key: "notification.sender.email",
    label: "Adresse d'expédition",
    type: "email",
    scope: "platform"
  });
  var service = AKS_createConfigurationService_(registry, {
    has: function () { return true; },
    get: function () { return "invalid-email"; }
  });

  assertThrows_(function () {
    service.resolve("notification.sender.email");
  }, "CONFIG001_INVALID_VALUE");
}
