function AKS_testLogger_exposesStablePublicApi() {
  assertTrue_(typeof AKS.Logger === "object", "AKS.Logger must exist.");
  assertTrue_(typeof AKS.Logger.info === "function", "AKS.Logger.info must exist.");
  assertTrue_(typeof AKS.Logger.warn === "function", "AKS.Logger.warn must exist.");
  assertTrue_(typeof AKS.Logger.error === "function", "AKS.Logger.error must exist.");
  assertTrue_(Object.isFrozen(AKS.Logger), "AKS.Logger public API must be immutable.");
}

function AKS_testLogger_acceptsCallsWithoutContext() {
  var api = AKS_createLoggerApi_(function () {});

  api.info("Information");
  api.warn("Warning");
  api.error("Error");
}

function AKS_testLogger_acceptsOptionalContext() {
  var api = AKS_createLoggerApi_(function () {});
  var context = {
    module: "LOGGER-001",
    requestId: "request-001",
    user: "admin@example.com"
  };

  api.info("Information", context);
  api.warn("Warning", context);
  api.error("Error", context);
}

function AKS_testLogger_delegatesToInternalProvider() {
  var events = [];
  var context = { module: "LOGGER-001" };
  var api = AKS_createLoggerApi_(function (level, message, receivedContext) {
    events.push({
      level: level,
      message: message,
      context: receivedContext
    });
  });

  api.info("Information", context);
  api.warn("Warning", context);
  api.error("Error", context);

  assertEquals_(3, events.length);
  assertEquals_("INFO", events[0].level);
  assertEquals_("WARN", events[1].level);
  assertEquals_("ERROR", events[2].level);
  assertEquals_("LOGGER-001", events[0].context.module);
  assertEquals_("LOGGER-001", events[1].context.module);
  assertEquals_("LOGGER-001", events[2].context.module);
}

function AKS_createLog001Fixture_(options) {
  options = options || {};
  var events = [];
  var sequence = 0;
  var service = AKS_createLoggingService_(
    options.provider || function (entry) { events.push(entry); },
    {
      clock: function () { return new Date("2026-07-25T12:00:00.000Z"); },
      idProvider: function () {
        sequence += 1;
        return "id-" + sequence;
      },
      environment: "test"
    }
  );
  return { events: events, service: service };
}

function AKS_testLog001_buildsStructuredImmutableEvent_() {
  var fixture = AKS_createLog001Fixture_();
  var result = fixture.service.emit({
    level: "info",
    category: "functional",
    source: "HealthQuestionnaire",
    module: "health-questionnaire",
    eventType: "questionnaire.completed",
    message: "Questionnaire terminé.",
    outcome: "success"
  });

  assertEquals_(true, result.ok);
  assertEquals_("1.0", result.event.schemaVersion);
  assertEquals_("evt-id-1", result.event.eventId);
  assertEquals_("corr-id-2", result.event.correlationId);
  assertEquals_("2026-07-25T12:00:00.000Z", result.event.timestamp);
  assertEquals_("INFO", result.event.level);
  assertEquals_("functional", result.event.category);
  assertTrue_(Object.isFrozen(result.event));
  assertTrue_(Object.isFrozen(result.event.context));
}

function AKS_testLog001_propagatesValidCorrelationId_() {
  var fixture = AKS_createLog001Fixture_();
  var result = fixture.service.emit({
    level: "INFO",
    category: "technical",
    source: "AKS.Core",
    eventType: "treatment.started",
    message: "Traitement démarré.",
    correlationId: "corr-existing-001"
  });

  assertEquals_("corr-existing-001", result.event.correlationId);
}

function AKS_testLog001_replacesInvalidCorrelationId_() {
  var fixture = AKS_createLog001Fixture_();
  var result = fixture.service.emit({
    level: "INFO",
    category: "technical",
    source: "AKS.Core",
    eventType: "treatment.started",
    message: "Traitement démarré.",
    correlationId: "bad id"
  });

  assertEquals_("corr-id-2", result.event.correlationId);
}

function AKS_testLog001_masksSensitiveDataBeforeProvider_() {
  var fixture = AKS_createLog001Fixture_();
  var original = {
    token: "secret-token",
    nested: {
      questionnaireAnswers: ["oui", "non"],
      harmless: "visible"
    }
  };

  fixture.service.emit({
    level: "WARN",
    category: "security",
    source: "AKS.Security",
    eventType: "security.control",
    message: "Contrôle effectué.",
    context: original
  });

  assertEquals_("[MASQUÉ]", fixture.events[0].context.token);
  assertEquals_("[MASQUÉ]", fixture.events[0].context.nested.questionnaireAnswers);
  assertEquals_("visible", fixture.events[0].context.nested.harmless);
  assertEquals_("secret-token", original.token);
}

function AKS_testLog001_rejectsUnknownLevel_() {
  var fixture = AKS_createLog001Fixture_();
  assertThrows_(function () {
    fixture.service.emit({
      level: "TRACE",
      category: "technical",
      source: "AKS.Core",
      eventType: "invalid.level",
      message: "Niveau invalide."
    });
  }, "LOG001_INVALID_LEVEL");
}

function AKS_testLog001_rejectsUnknownCategory_() {
  var fixture = AKS_createLog001Fixture_();
  assertThrows_(function () {
    fixture.service.emit({
      level: "INFO",
      category: "business-data",
      source: "AKS.Core",
      eventType: "invalid.category",
      message: "Catégorie invalide."
    });
  }, "LOG001_INVALID_CATEGORY");
}

function AKS_testLog001_requiresStableEventType_() {
  var fixture = AKS_createLog001Fixture_();
  assertThrows_(function () {
    fixture.service.emit({
      level: "INFO",
      category: "technical",
      source: "AKS.Core",
      message: "Type absent."
    });
  }, "LOG001_EVENT_TYPE_REQUIRED");
}

function AKS_testLog001_isolatesProviderFailure_() {
  var fixture = AKS_createLog001Fixture_({
    provider: function () { throw new Error("Stockage indisponible"); }
  });
  var result = fixture.service.emit({
    level: "ERROR",
    category: "technical",
    source: "AKS.Core",
    eventType: "provider.failure",
    message: "Échec simulé."
  });

  assertEquals_(false, result.ok);
  assertEquals_("LOG001_PROVIDER_FAILURE", result.errorCode);
}
