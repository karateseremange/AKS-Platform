var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * ADMIN-006 D3-A — concrete Apps Script backend adapters.
 *
 * Merely loading this file performs no I/O. Google services are reached only
 * after an explicitly enabled, exact RECETTE configuration is read.
 */
function AKS_createPrivateBackendRuntime_(dependencies) {
  dependencies = dependencies || {};

  var properties = dependencies.properties ||
    PropertiesService.getScriptProperties();
  var openSpreadsheet = dependencies.openSpreadsheet || function (id) {
    return SpreadsheetApp.openById(id);
  };
  var nowProvider = dependencies.nowProvider || function () {
    return new Date().getTime();
  };
  var crypto = dependencies.crypto || AKS_createAppsScriptPrivateCrypto_();
  var replayGuardFactory = dependencies.replayGuardFactory ||
    AKS_createAppsScriptPrivateReplayGuard_;

  var PROPERTY_KEYS = Object.freeze({
    enabled: "AKS_PRIVATE_ENABLED",
    environment: "AKS_PRIVATE_ENVIRONMENT",
    callerProject: "AKS_PRIVATE_CALLER_PROJECT",
    currentSecret: "AKS_PRIVATE_HMAC_CURRENT",
    previousSecret: "AKS_PRIVATE_HMAC_PREVIOUS",
    secretVersion: "AKS_PRIVATE_SECRET_VERSION",
    logSpreadsheetId: "AKS_PRIVATE_LOG_SPREADSHEET_ID",
    proofSpreadsheetId: "AKS_PRIVATE_PROOF_SPREADSHEET_ID",
    backendVersion: "AKS_PRIVATE_BACKEND_VERSION",
    lockWaitMs: "AKS_PRIVATE_REPLAY_LOCK_WAIT_MS",
    purgeLimit: "AKS_PRIVATE_REPLAY_PURGE_LIMIT",
    retentionSkewMs: "AKS_PRIVATE_REPLAY_RETENTION_SKEW_MS"
  });
  var LOG_HEADERS = Object.freeze([
    "schemaVersion", "eventId", "timestamp", "environment",
    "correlationId", "level", "category", "source", "module",
    "eventType", "message", "outcome", "actorJson", "reference",
    "durationMs", "contextJson"
  ]);
  var PROOF_HEADERS = Object.freeze([
    "environment", "command", "actorHash", "requestId",
    "correlationId", "result", "durationMs", "returnedCount",
    "backendVersion", "recordedAt"
  ]);

  function fail_(message) {
    var error = new Error(message);
    error.code = "PRIVATE_BACKEND_UNAVAILABLE";
    throw error;
  }

  function exactText_(values, key, maximum) {
    var value = values[key];
    if (typeof value !== "string" || value === "" ||
        value !== value.trim() || value.length > maximum) {
      fail_("Configuration privée invalide.");
    }
    return value;
  }

  function identifier_(values, key) {
    var value = exactText_(values, key, 256);
    if (!/^[A-Za-z0-9_-]+$/.test(value)) {
      fail_("Configuration privée invalide.");
    }
    return value;
  }

  function integer_(values, key, minimum, maximum) {
    var text = exactText_(values, key, 16);
    if (!/^(0|[1-9][0-9]*)$/.test(text)) {
      fail_("Configuration privée invalide.");
    }
    var value = Number(text);
    if (value < minimum || value > maximum) {
      fail_("Configuration privée invalide.");
    }
    return value;
  }

  function configuration_() {
    return Object.freeze({
      get: function () {
        var values = properties.getProperties();
        var known = {};
        Object.keys(PROPERTY_KEYS).forEach(function (name) {
          known[PROPERTY_KEYS[name]] = true;
        });
        Object.keys(values).forEach(function (key) {
          var replayKey = key.indexOf("AKS_PRIVATE_REPLAY_REQ_") === 0 ||
            key.indexOf("AKS_PRIVATE_REPLAY_NONCE_") === 0;
          if (key.indexOf("AKS_PRIVATE_") === 0 && !known[key] &&
              !replayKey) {
            fail_("Configuration privée invalide.");
          }
        });

        var enabledText = values[PROPERTY_KEYS.enabled];
        if (typeof enabledText === "undefined" || enabledText === "false") {
          return Object.freeze({ enabled: false, environment: "RECETTE" });
        }
        if (enabledText !== "true") {
          fail_("Configuration privée invalide.");
        }
        if (exactText_(values, PROPERTY_KEYS.environment, 16) !== "RECETTE") {
          fail_("Configuration privée invalide.");
        }

        var previousSecret = null;
        if (typeof values[PROPERTY_KEYS.previousSecret] !== "undefined") {
          previousSecret = exactText_(
            values,
            PROPERTY_KEYS.previousSecret,
            4096
          );
        }
        return Object.freeze({
          enabled: true,
          environment: "RECETTE",
          callerProject: identifier_(values, PROPERTY_KEYS.callerProject),
          currentSecret: exactText_(values, PROPERTY_KEYS.currentSecret, 4096),
          previousSecret: previousSecret,
          secretVersion: exactText_(values, PROPERTY_KEYS.secretVersion, 128),
          logSpreadsheetId: identifier_(values, PROPERTY_KEYS.logSpreadsheetId),
          proofSpreadsheetId: identifier_(
            values,
            PROPERTY_KEYS.proofSpreadsheetId
          ),
          backendVersion: exactText_(values, PROPERTY_KEYS.backendVersion, 128),
          lockWaitMs: integer_(values, PROPERTY_KEYS.lockWaitMs, 1, 30000),
          purgeLimit: integer_(values, PROPERTY_KEYS.purgeLimit, 1, 500),
          retentionSkewMs: integer_(
            values,
            PROPERTY_KEYS.retentionSkewMs,
            0,
            300000
          )
        });
      }
    });
  }

  function requireSheet_(spreadsheetId, sheetName, headers) {
    var spreadsheet;
    try {
      spreadsheet = openSpreadsheet(spreadsheetId);
    } catch (error) {
      fail_("Support privé indisponible.");
    }
    if (!spreadsheet || typeof spreadsheet.getId !== "function" ||
        String(spreadsheet.getId()) !== spreadsheetId) {
      fail_("Support privé invalide.");
    }
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet || sheet.getLastColumn() !== headers.length ||
        sheet.getLastRow() < 1) {
      fail_("Schéma privé invalide.");
    }
    var actual = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var valid = headers.every(function (header, index) {
      return String(actual[index]) === header;
    });
    if (!valid) fail_("Schéma privé invalide.");
    return sheet;
  }

  function logReader_(config) {
    return Object.freeze({
      readRecent: function (query) {
        query = query || {};
        var limit = Number(query.limit);
        if (!isFinite(limit) || limit % 1 !== 0 || limit < 1 || limit > 20) {
          fail_("Lecture LOG privée invalide.");
        }
        var sheet = requireSheet_(
          config.logSpreadsheetId,
          "AKS_Logs",
          LOG_HEADERS
        );
        var lastRow = sheet.getLastRow();
        if (lastRow <= 1) {
          return Object.freeze({ events: Object.freeze([]), nextCursor: null });
        }
        var startRow = lastRow;
        if (query.cursor) {
          var match = /^row:([2-9][0-9]*)$/.exec(String(query.cursor));
          if (!match || Number(match[1]) > lastRow) {
            fail_("Curseur LOG privé invalide.");
          }
          startRow = Number(match[1]);
        }
        var count = Math.min(startRow - 1, 500);
        var firstRow = startRow - count + 1;
        var rows = sheet.getRange(
          firstRow,
          1,
          count,
          LOG_HEADERS.length
        ).getValues();
        var events = [];
        var nextCursor = null;
        for (var index = rows.length - 1; index >= 0; index -= 1) {
          var row = rows[index];
          if (String(row[3]) !== "RECETTE") {
            fail_("Environnement LOG privé invalide.");
          }
          var severity = String(row[5]);
          if (query.severity && severity !== query.severity) continue;
          events.push(Object.freeze({
            occurredAt: String(row[2]),
            severity: severity,
            code: String(row[9]),
            message: String(row[10]),
            correlationId: String(row[4])
          }));
          if (events.length === limit) {
            var sourceRow = firstRow + index;
            nextCursor = sourceRow > 2 ? "row:" + (sourceRow - 1) : null;
            break;
          }
        }
        return Object.freeze({
          events: Object.freeze(events),
          nextCursor: nextCursor
        });
      }
    });
  }

  function proofWriter_(config) {
    return Object.freeze({
      write: function (proof) {
        var sheet = requireSheet_(
          config.proofSpreadsheetId,
          "AKS_Private_Proofs",
          PROOF_HEADERS
        );
        var row = [
          proof.environment,
          proof.command,
          proof.actorHash,
          proof.requestId,
          proof.correlationId,
          proof.result,
          proof.durationMs,
          proof.returnedCount,
          proof.backendVersion,
          new Date(Number(nowProvider())).toISOString()
        ].map(function (value) { return String(value); });
        var proofLock = dependencies.proofLock || LockService.getScriptLock();
        var acquired = false;
        try {
          acquired = proofLock.tryLock(config.lockWaitMs) === true;
          if (!acquired) fail_("Preuve privée verrouillée.");
          sheet.appendRow(row);
          var persisted = sheet.getRange(
            sheet.getLastRow(),
            1,
            1,
            PROOF_HEADERS.length
          ).getValues()[0].map(function (value) { return String(value); });
          if (JSON.stringify(row) !== JSON.stringify(persisted)) {
            fail_("Preuve privée non confirmée.");
          }
        } finally {
          if (acquired) proofLock.releaseLock();
        }
        return true;
      }
    });
  }

  var configPort = configuration_();
  var snapshot = configPort.get();
  var inert = AKS_createInertPrivateBackendPorts_();
  var replayGuard = { consume: function () { fail_("Backend privé inactif."); } };
  var logReader = inert.logReader;
  var proofWriter = inert.proofWriter;

  if (snapshot.enabled === true) {
    replayGuard = replayGuardFactory({
      enabled: true,
      environment: snapshot.environment,
      crypto: crypto,
      nowProvider: nowProvider,
      lockWaitMs: snapshot.lockWaitMs,
      purgeLimit: snapshot.purgeLimit,
      retentionSkewMs: snapshot.retentionSkewMs
    });
    logReader = logReader_(snapshot);
    proofWriter = proofWriter_(snapshot);
  }

  return Object.freeze({
    backend: AKS_createPrivateBackend_({
      configuration: configPort,
      replayGuard: replayGuard,
      logReader: logReader,
      proofWriter: proofWriter,
      crypto: crypto,
      nowProvider: nowProvider
    }),
    configuration: snapshot,
    propertyKeys: PROPERTY_KEYS,
    logHeaders: LOG_HEADERS,
    proofHeaders: PROOF_HEADERS
  });
}

/**
 * Pure HTTP boundary. It always returns generic JSON on failure.
 */
function AKS_handlePrivateBackendPost_(event, dependencies) {
  var response;
  try {
    if (!event || !event.postData ||
        typeof event.postData.contents !== "string" ||
        event.postData.contents === "") {
      throw new Error("Corps absent.");
    }
    var runtime = dependencies && dependencies.runtime ?
      dependencies.runtime : AKS_createPrivateBackendRuntime_(dependencies);
    response = runtime.backend.process(event.postData.contents);
  } catch (error) {
    response = {
      protocol: "AKS-PRIVATE/1",
      status: "ERROR",
      code: "PRIVATE_BACKEND_UNAVAILABLE"
    };
  }
  return JSON.stringify(response);
}

AKS.Core.PrivateBackendRuntime = Object.freeze({
  create: AKS_createPrivateBackendRuntime_,
  handlePost: AKS_handlePrivateBackendPost_
});
