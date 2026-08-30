function AKS_admin006D3AProperties_(changes) {
  var values = {
    AKS_PRIVATE_ENABLED: "true",
    AKS_PRIVATE_ENVIRONMENT: "RECETTE",
    AKS_PRIVATE_CALLER_PROJECT: "AKS_PORTAL_RECETTE",
    AKS_PRIVATE_HMAC_CURRENT: "recipe-secret",
    AKS_PRIVATE_SECRET_VERSION: "RECETTE-20260830-192805",
    AKS_PRIVATE_LOG_SPREADSHEET_ID: "LOG_RECIPE_ID",
    AKS_PRIVATE_PROOF_SPREADSHEET_ID: "PROOF_RECIPE_ID",
    AKS_PRIVATE_BACKEND_VERSION: "ADMIN-006-D3A",
    AKS_PRIVATE_REPLAY_LOCK_WAIT_MS: "5000",
    AKS_PRIVATE_REPLAY_PURGE_LIMIT: "50",
    AKS_PRIVATE_REPLAY_RETENTION_SKEW_MS: "30000"
  };
  Object.keys(changes || {}).forEach(function (key) {
    if (changes[key] === null) delete values[key];
    else values[key] = changes[key];
  });
  return values;
}

function AKS_admin006D3APropertyStore_(values) {
  return {
    getProperties: function () {
      var copy = {};
      Object.keys(values || {}).forEach(function (key) { copy[key] = values[key]; });
      return copy;
    }
  };
}

function AKS_admin006D3ASheet_(rows, options) {
  rows = rows || [];
  options = options || {};
  return {
    rows: rows,
    getLastColumn: function () { return rows[0] ? rows[0].length : 0; },
    getLastRow: function () { return rows.length; },
    getRange: function (row, column, count, width) {
      return {
        getValues: function () {
          var result = [];
          for (var index = 0; index < count; index += 1) {
            result.push(rows[row - 1 + index].slice(
              column - 1,
              column - 1 + width
            ));
          }
          if (options.alterReadback && row === rows.length) {
            result[0][0] = "ALTERED";
          }
          return result;
        }
      };
    },
    appendRow: function (row) { rows.push(row.slice()); }
  };
}

function AKS_admin006D3ASpreadsheet_(id, sheets) {
  return {
    getId: function () { return id; },
    getSheetByName: function (name) { return sheets[name] || null; }
  };
}

function AKS_admin006D3ARuntimeFixture_(options) {
  options = options || {};
  var protocol = AKS_admin006PrivateProtocolFixture_();
  var logHeaders = [
    "schemaVersion", "eventId", "timestamp", "environment",
    "correlationId", "level", "category", "source", "module",
    "eventType", "message", "outcome", "actorJson", "reference",
    "durationMs", "contextJson"
  ];
  var proofHeaders = [
    "environment", "command", "actorHash", "requestId",
    "correlationId", "result", "durationMs", "returnedCount",
    "backendVersion", "recordedAt"
  ];
  var logRows = options.logRows || [
    logHeaders,
    [
      "aks-log/1.0", "event-001", "2026-08-28T11:59:00.000Z",
      "RECETTE", "event-correlation", "WARN", "SECURITY", "TEST",
      "ADMIN", "TEST_EVENT", "visible", "OK", "{}", "ref", 1, "{}"
    ]
  ];
  var proofRows = options.proofRows || [proofHeaders];
  var logSheet = AKS_admin006D3ASheet_(logRows, options.logOptions);
  var proofSheet = AKS_admin006D3ASheet_(proofRows, options.proofOptions);
  var spreadsheets = {
    LOG_RECIPE_ID: AKS_admin006D3ASpreadsheet_("LOG_RECIPE_ID", {
      AKS_Logs: logSheet
    }),
    PROOF_RECIPE_ID: AKS_admin006D3ASpreadsheet_("PROOF_RECIPE_ID", {
      AKS_Private_Proofs: proofSheet
    })
  };
  var runtime = AKS_createPrivateBackendRuntime_({
    properties: AKS_admin006D3APropertyStore_(
      options.properties || AKS_admin006D3AProperties_()
    ),
    openSpreadsheet: function (id) {
      if (!spreadsheets[id]) throw new Error("not found");
      return spreadsheets[id];
    },
    crypto: AKS_admin006PrivateProtocolCryptoFixture_(),
    nowProvider: AKS_admin006LotBNow_,
    replayGuardFactory: function () {
      return { consume: function () { return true; } };
    },
    proofLock: {
      tryLock: function () { return options.proofLockAvailable !== false; },
      releaseLock: function () {}
    }
  });
  var request = protocol.createSignedRequest({
    environment: "RECETTE",
    callerProject: "AKS_PORTAL_RECETTE",
    actor: "teacher@example.com",
    requestId: "request-d3a",
    correlationId: "correlation-d3a",
    issuedAt: "2026-08-28T12:00:00.000Z",
    expiresAt: "2026-08-28T12:01:00.000Z",
    nonce: "nonce-d3a",
    payload: options.payload || { limit: 5 }
  }, "recipe-secret");
  return {
    runtime: runtime,
    request: request,
    logRows: logRows,
    proofRows: proofRows
  };
}

function AKS_testAdmin006D3A_runtimeIsClosedWhenDisabled_() {
  var opened = 0;
  var runtime = AKS_createPrivateBackendRuntime_({
    properties: AKS_admin006D3APropertyStore_({}),
    openSpreadsheet: function () { opened += 1; }
  });
  assertTrue_(!runtime.configuration.enabled);
  assertEquals_(0, opened);
  assertThrows_(function () { runtime.backend.process("{}"); },
    "PRIVATE_BACKEND_UNAVAILABLE");
}

function AKS_testAdmin006D3A_readsExactNonSecretConfiguration_() {
  var fixture = AKS_admin006D3ARuntimeFixture_();
  assertTrue_(fixture.runtime.configuration.enabled);
  assertEquals_("RECETTE", fixture.runtime.configuration.environment);
  assertEquals_("LOG_RECIPE_ID", fixture.runtime.configuration.logSpreadsheetId);
  assertEquals_(5000, fixture.runtime.configuration.lockWaitMs);
}

function AKS_testAdmin006D3A_rejectsUnknownPrivateProperty_() {
  var values = AKS_admin006D3AProperties_({
    AKS_PRIVATE_UNEXPECTED: "forbidden"
  });
  assertThrows_(function () {
    AKS_createPrivateBackendRuntime_({
      properties: AKS_admin006D3APropertyStore_(values)
    });
  }, "PRIVATE_BACKEND_UNAVAILABLE");
}

function AKS_testAdmin006D3A_rejectsInvalidBounds_() {
  var values = AKS_admin006D3AProperties_({
    AKS_PRIVATE_REPLAY_PURGE_LIMIT: "501"
  });
  assertThrows_(function () {
    AKS_createPrivateBackendRuntime_({
      properties: AKS_admin006D3APropertyStore_(values)
    });
  }, "PRIVATE_BACKEND_UNAVAILABLE");
}

function AKS_testAdmin006D3A_processesDedicatedLogAndProof_() {
  var fixture = AKS_admin006D3ARuntimeFixture_();
  var response = fixture.runtime.backend.process(JSON.stringify(fixture.request));
  assertEquals_("OK", response.status);
  assertEquals_(1, response.data.events.length);
  assertEquals_("TEST_EVENT", response.data.events[0].code);
  assertEquals_(2, fixture.proofRows.length);
  assertEquals_("LOG_READ_RECENT_V1", fixture.proofRows[1][1]);
  assertEquals_(10, fixture.proofRows[1].length);
}

function AKS_testAdmin006D3A_filtersSeverity_() {
  var fixture = AKS_admin006D3ARuntimeFixture_({
    payload: { limit: 5, severity: "ERROR" }
  });
  var response = fixture.runtime.backend.process(JSON.stringify(fixture.request));
  assertEquals_(0, response.data.events.length);
}

function AKS_testAdmin006D3A_rejectsCrossEnvironmentLog_() {
  var headers = AKS_admin006D3ARuntimeFixture_().logRows[0];
  var fixture = AKS_admin006D3ARuntimeFixture_({
    logRows: [headers, [
      "aks-log/1.0", "event-001", "2026-08-28T11:59:00.000Z",
      "PRODUCTION", "corr", "WARN", "SECURITY", "TEST", "ADMIN",
      "TEST_EVENT", "forbidden", "OK", "{}", "ref", 1, "{}"
    ]]
  });
  assertThrows_(function () {
    fixture.runtime.backend.process(JSON.stringify(fixture.request));
  }, "PRIVATE_BACKEND_UNAVAILABLE");
  assertEquals_(1, fixture.proofRows.length);
}

function AKS_testAdmin006D3A_rejectsLogSchemaDrift_() {
  var fixture = AKS_admin006D3ARuntimeFixture_();
  fixture.logRows[0][0] = "altered";
  assertThrows_(function () {
    fixture.runtime.backend.process(JSON.stringify(fixture.request));
  }, "PRIVATE_BACKEND_UNAVAILABLE");
}

function AKS_testAdmin006D3A_requiresProofReadback_() {
  var fixture = AKS_admin006D3ARuntimeFixture_({
    proofOptions: { alterReadback: true }
  });
  assertThrows_(function () {
    fixture.runtime.backend.process(JSON.stringify(fixture.request));
  }, "PRIVATE_BACKEND_UNAVAILABLE");
}

function AKS_testAdmin006D3A_rejectsUnavailableProofLock_() {
  var fixture = AKS_admin006D3ARuntimeFixture_({
    proofLockAvailable: false
  });
  assertThrows_(function () {
    fixture.runtime.backend.process(JSON.stringify(fixture.request));
  }, "PRIVATE_BACKEND_UNAVAILABLE");
  assertEquals_(1, fixture.proofRows.length);
}

function AKS_testAdmin006D3A_endpointReturnsGenericFailure_() {
  var body = AKS_handlePrivateBackendPost_({
    postData: { contents: "secret material" }
  }, {
    runtime: { backend: { process: function () {
      throw new Error("sensitive internal detail");
    } } }
  });
  var result = JSON.parse(body);
  assertEquals_("ERROR", result.status);
  assertEquals_("PRIVATE_BACKEND_UNAVAILABLE", result.code);
  assertTrue_(body.indexOf("sensitive") === -1);
  assertTrue_(body.indexOf("secret material") === -1);
}

function AKS_testAdmin006D3A_endpointRejectsMissingBody_() {
  var result = JSON.parse(AKS_handlePrivateBackendPost_({}, {}));
  assertEquals_("ERROR", result.status);
  assertEquals_("AKS-PRIVATE/1", result.protocol);
}

function AKS_testAdmin006D3A_exportsFrozenRuntimeFactory_() {
  assertTrue_(Object.isFrozen(AKS.Core.PrivateBackendRuntime));
  assertTrue_(typeof AKS.Core.PrivateBackendRuntime.create === "function");
  assertTrue_(typeof AKS.Core.PrivateBackendRuntime.handlePost === "function");
}

function AKS_runAdmin006D3APrivateBackendRuntimeSuite() {
  return AKS_runNamedTestSuite_("ADMIN-006 — D3-A runtime backend", [
    { name: "inactif sans configuration", test: AKS_testAdmin006D3A_runtimeIsClosedWhenDisabled_ },
    { name: "configuration exacte", test: AKS_testAdmin006D3A_readsExactNonSecretConfiguration_ },
    { name: "propriété privée inconnue", test: AKS_testAdmin006D3A_rejectsUnknownPrivateProperty_ },
    { name: "bornes anti-rejeu", test: AKS_testAdmin006D3A_rejectsInvalidBounds_ },
    { name: "lecture LOG et preuve dédiées", test: AKS_testAdmin006D3A_processesDedicatedLogAndProof_ },
    { name: "filtre de sévérité", test: AKS_testAdmin006D3A_filtersSeverity_ },
    { name: "environnement LOG croisé", test: AKS_testAdmin006D3A_rejectsCrossEnvironmentLog_ },
    { name: "dérive du schéma LOG", test: AKS_testAdmin006D3A_rejectsLogSchemaDrift_ },
    { name: "relecture de la preuve", test: AKS_testAdmin006D3A_requiresProofReadback_ },
    { name: "verrou de preuve indisponible", test: AKS_testAdmin006D3A_rejectsUnavailableProofLock_ },
    { name: "erreur HTTP générique", test: AKS_testAdmin006D3A_endpointReturnsGenericFailure_ },
    { name: "corps HTTP obligatoire", test: AKS_testAdmin006D3A_endpointRejectsMissingBody_ },
    { name: "fabrique runtime gelée", test: AKS_testAdmin006D3A_exportsFrozenRuntimeFactory_ }
  ]);
}
