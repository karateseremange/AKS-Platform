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

function AKS_testConfig001_persistsTypedValue_() {
  var fixture = AKS_createConfig001PersistenceFixture_();
  var result = fixture.service.set(
    "platform.activeSeason",
    "2026-2027",
    { actor: " ADMIN@EXAMPLE.COM " }
  );

  assertEquals_("2026-2027", result.value);
  assertEquals_("explicit", result.source);
  assertEquals_("2026-07-25T08:00:00.000Z",
    fixture.store.metadata("platform.activeSeason").updatedAt);
  assertEquals_("admin@example.com",
    fixture.store.metadata("platform.activeSeason").updatedBy);
  assertEquals_("2026-07-25T08:00:00.000Z", result.lastModifiedAt);
  assertEquals_("admin@example.com", result.modifiedBy);
}

function AKS_testConfig001_rejectsInvalidValueBeforePersistence_() {
  var fixture = AKS_createConfig001PersistenceFixture_();

  assertThrows_(function () {
    fixture.service.set(
      "club.contact.email",
      "invalid-email",
      { actor: "admin@example.com" }
    );
  }, "CONFIG001_INVALID_VALUE");
  assertEquals_(false, fixture.store.has("club.contact.email"));
}

function AKS_testConfig001_rejectsNonAdministrableWrite_() {
  var fixture = AKS_createConfig001PersistenceFixture_();

  assertThrows_(function () {
    fixture.service.set(
      "platform.internalMode",
      true,
      { actor: "admin@example.com" }
    );
  }, "CONFIG001_PARAMETER_NOT_ADMINISTRABLE");
}

function AKS_testConfig001_requiresMutationActor_() {
  var fixture = AKS_createConfig001PersistenceFixture_();

  assertThrows_(function () {
    fixture.service.set("platform.activeSeason", "2026-2027", {});
  }, "CONFIG001_ACTOR_REQUIRED");
}

function AKS_testConfig001_removesExplicitValueAndRestoresDefault_() {
  var fixture = AKS_createConfig001PersistenceFixture_();
  fixture.service.set(
    "platform.language",
    "en",
    { actor: "admin@example.com" }
  );

  var result = fixture.service.remove(
    "platform.language",
    { actor: "admin@example.com" }
  );

  assertEquals_("fr", result.value);
  assertEquals_("default", result.source);
  assertEquals_(false, fixture.store.has("platform.language"));
}

function AKS_testConfig001_protectsRequiredValueFromDeletion_() {
  var fixture = AKS_createConfig001PersistenceFixture_();
  fixture.service.set(
    "platform.activeSeason",
    "2026-2027",
    { actor: "admin@example.com" }
  );

  assertThrows_(function () {
    fixture.service.remove(
      "platform.activeSeason",
      { actor: "admin@example.com" }
    );
  }, "CONFIG001_REQUIRED_PARAMETER_DELETE_FORBIDDEN");
  assertEquals_("2026-2027", fixture.store.get("platform.activeSeason"));
}

function AKS_testConfig001_detectsCorruptedPersistentValue_() {
  var properties = AKS_createConfig001MemoryProperties_();
  properties.setProperty("AKS_CONFIG_VALUE.platform.language", "{broken");
  var store = AKS_createParameterValueStore_(properties);

  assertThrows_(function () {
    store.get("platform.language");
  }, "CONFIG001_CORRUPTED_VALUE");
}

function AKS_testConfig001_releasesPersistenceLockAfterFailure_() {
  var properties = AKS_createConfig001MemoryProperties_(true);
  var lock = AKS_createConfig001MemoryLock_();
  var store = AKS_createParameterValueStore_(properties, lock);

  assertThrows_(function () {
    store.set("platform.language", "fr", {
      updatedAt: "2026-07-25T08:00:00.000Z",
      updatedBy: "admin@example.com"
    });
  });
  assertEquals_(1, lock.waitCount());
  assertEquals_(1, lock.releaseCount());
}

function AKS_createConfig001PersistenceFixture_() {
  var registry = AKS_createParameterRegistry_();
  registry.register({
    key: "platform.activeSeason",
    label: "Saison active",
    type: "string",
    scope: "platform",
    required: true,
    administrable: true
  });
  registry.register({
    key: "club.contact.email",
    label: "Adresse de contact",
    type: "email",
    scope: "platform",
    administrable: true
  });
  registry.register({
    key: "platform.language",
    label: "Langue",
    type: "string",
    scope: "platform",
    administrable: true,
    defaultValue: "fr"
  });
  registry.register({
    key: "platform.internalMode",
    label: "Mode interne",
    type: "boolean",
    scope: "platform",
    administrable: false
  });

  var store = AKS_createParameterValueStore_(
    AKS_createConfig001MemoryProperties_(),
    AKS_createConfig001MemoryLock_()
  );
  var service = AKS_createConfigurationService_(
    registry,
    store,
    function () { return new Date("2026-07-25T08:00:00.000Z"); }
  );

  return {
    registry: registry,
    store: store,
    service: service
  };
}

function AKS_createConfig001MemoryProperties_(failOnWrite) {
  var values = Object.create(null);
  return {
    getProperty: function (key) {
      return Object.prototype.hasOwnProperty.call(values, key)
        ? values[key]
        : null;
    },
    setProperty: function (key, value) {
      if (failOnWrite) {
        throw new Error("simulated write failure");
      }
      values[key] = value;
    },
    deleteProperty: function (key) {
      delete values[key];
    }
  };
}

function AKS_createConfig001MemoryLock_() {
  var waits = 0;
  var releases = 0;
  return {
    waitLock: function () { waits += 1; },
    releaseLock: function () { releases += 1; },
    waitCount: function () { return waits; },
    releaseCount: function () { return releases; }
  };
}
