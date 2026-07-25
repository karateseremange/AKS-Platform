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

function AKS_createLog001RepositoryFixture_(options) {
  options = options || {};
  var rows = options.rows || [];
  var lockReleased = false;
  var sheet = {
    getLastColumn: function () {
      return rows.length ? rows[0].length : 0;
    },
    getLastRow: function () { return rows.length; },
    getRange: function (row, column, rowCount, columnCount) {
      return {
        setValues: function (values) {
          rows[row - 1] = values[0].slice();
        },
        getValues: function () {
          return rows.slice(row - 1, row - 1 + rowCount).map(function (value) {
            return value.slice(column - 1, column - 1 + columnCount);
          });
        }
      };
    },
    setFrozenRows: function () {},
    appendRow: function (row) {
      if (options.failOnAppend) {
        throw new Error("Écriture impossible");
      }
      rows.push(row.slice());
    }
  };
  var spreadsheet = {
    getSheetByName: function () {
      return rows.length ? sheet : null;
    },
    insertSheet: function () { return sheet; }
  };
  var repository = AKS_createLogEventRepository_({
    getSpreadsheet: function () { return spreadsheet; },
    lock: {
      tryLock: function () {
        return options.lockAvailable !== false;
      },
      releaseLock: function () { lockReleased = true; }
    }
  });
  return {
    repository: repository,
    rows: rows,
    wasLockReleased: function () { return lockReleased; }
  };
}

function AKS_createLog001PersistedEvent_() {
  return Object.freeze({
    schemaVersion: "1.0",
    eventId: "evt-persist-001",
    timestamp: "2026-07-25T15:00:00.000Z",
    environment: "test",
    correlationId: "corr-persist-001",
    level: "WARN",
    category: "administration",
    source: "AKS.Configuration",
    module: "core",
    eventType: "configuration.updated",
    message: "Paramètre modifié.",
    outcome: "success",
    actor: Object.freeze({ type: "administrator", id: "admin@example.com" }),
    reference: "platform.activeSeason",
    durationMs: 12,
    context: Object.freeze({ previousSource: "default" })
  });
}

function AKS_testLog001Repository_createsDedicatedStorage_() {
  var fixture = AKS_createLog001RepositoryFixture_();
  fixture.repository.ensureStorage();

  assertEquals_("AKS_Logs", fixture.repository.getSheetName());
  assertEquals_(16, fixture.rows[0].length);
  assertEquals_("schemaVersion", fixture.rows[0][0]);
  assertEquals_("contextJson", fixture.rows[0][15]);
}

function AKS_testLog001Repository_persistsCompleteEvent_() {
  var fixture = AKS_createLog001RepositoryFixture_();
  var event = AKS_createLog001PersistedEvent_();
  var eventId = fixture.repository.append(event);

  assertEquals_("evt-persist-001", eventId);
  assertEquals_(2, fixture.rows.length);
  assertEquals_("configuration.updated", fixture.rows[1][9]);
  assertEquals_(
    "admin@example.com",
    JSON.parse(fixture.rows[1][12]).id
  );
  assertEquals_("default", JSON.parse(fixture.rows[1][15]).previousSource);
}

function AKS_testLog001Repository_readsNewestEventsFirst_() {
  var fixture = AKS_createLog001RepositoryFixture_();
  var first = AKS_createLog001PersistedEvent_();
  var second = {};
  Object.keys(first).forEach(function (key) { second[key] = first[key]; });
  second.eventId = "evt-persist-002";

  fixture.repository.append(first);
  fixture.repository.append(second);
  var events = fixture.repository.listRecent(2);

  assertEquals_(2, events.length);
  assertEquals_("evt-persist-002", events[0].eventId);
  assertEquals_("evt-persist-001", events[1].eventId);
  assertEquals_("default", events[0].context.previousSource);
}

function AKS_testLog001Repository_rejectsIncompatibleSchema_() {
  var fixture = AKS_createLog001RepositoryFixture_({
    rows: [["wrong", "schema"]]
  });
  assertThrows_(function () {
    fixture.repository.ensureStorage();
  }, "LOG001_STORAGE_SCHEMA_INVALID");
}

function AKS_testLog001Repository_rejectsUnavailableLock_() {
  var fixture = AKS_createLog001RepositoryFixture_({
    lockAvailable: false
  });
  assertThrows_(function () {
    fixture.repository.append(AKS_createLog001PersistedEvent_());
  }, "LOG001_STORAGE_LOCK_TIMEOUT");
}

function AKS_testLog001Repository_releasesLockAfterFailure_() {
  var fixture = AKS_createLog001RepositoryFixture_({
    failOnAppend: true
  });
  try {
    fixture.repository.append(AKS_createLog001PersistedEvent_());
  } catch (expected) {}

  assertEquals_(true, fixture.wasLockReleased());
}

function AKS_testLog001CoreLogger_delegatesToPersistentPipeline_() {
  var events = [];
  var logger = AKS_createCoreLoggerApi_({
    emit: function (event) {
      events.push(event);
      return { ok: true };
    }
  });

  logger.info("Traitement démarré.", {
    module: "health-questionnaire",
    eventType: "questionnaire.started",
    correlationId: "corr-core-001"
  });

  assertEquals_(1, events.length);
  assertEquals_("AKS.Core", events[0].source);
  assertEquals_("questionnaire.started", events[0].eventType);
  assertEquals_("corr-core-001", events[0].correlationId);
}
