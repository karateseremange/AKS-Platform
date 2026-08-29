function AKS_admin006LotBCryptoFixture_() {
  return AKS_admin006PrivateProtocolCryptoFixture_();
}

function AKS_admin006LotBNow_() {
  return new Date("2026-08-28T12:00:30.000Z").getTime();
}

function AKS_admin006LotBRequest_(secret, changes) {
  var input = AKS_admin006PrivateProtocolRequestInput_();
  Object.keys(changes || {}).forEach(function (key) {
    input[key] = changes[key];
  });
  return AKS_createPrivateProtocol_({
    crypto: AKS_admin006LotBCryptoFixture_(),
    replayGuard: { consume: function () { return true; } }
  }).createSignedRequest(input, secret || "recipe-secret");
}

function AKS_admin006LotBMemoryGuardFixture_(options) {
  options = options || {};
  var values = options.values || {};
  var released = 0;
  var store = {
    get: function (key) {
      if (options.ignoreWrites) return null;
      return Object.prototype.hasOwnProperty.call(values, key) ?
        values[key] : null;
    },
    setMany: function (records) {
      if (options.ignoreWrites) return;
      Object.keys(records).forEach(function (key) {
        values[key] = records[key];
      });
    },
    removeMany: function (keys) {
      keys.forEach(function (key) { delete values[key]; });
    },
    listKeys: function () {
      return Object.keys(values);
    }
  };
  var lock = {
    tryLock: function () {
      return options.lockAvailable !== false;
    },
    release: function () {
      released += 1;
    }
  };
  return {
    values: values,
    released: function () { return released; },
    guard: AKS_createPrivateReplayGuard_({
      store: store,
      lock: lock,
      crypto: AKS_admin006LotBCryptoFixture_(),
      nowProvider: options.nowProvider || AKS_admin006LotBNow_,
      purgeLimit: options.purgeLimit || 50
    })
  };
}

function AKS_admin006LotBBackendFixture_(options) {
  options = options || {};
  var reads = [];
  var proofs = [];
  var replay = options.replayGuard ||
    AKS_admin006LotBMemoryGuardFixture_().guard;
  var adapters = AKS_createPrivateBackendAdapters_();
  var backend = AKS_createPrivateBackend_({
    crypto: AKS_admin006LotBCryptoFixture_(),
    nowProvider: AKS_admin006LotBNow_,
    replayGuard: replay,
    configuration: adapters.configuration({
      enabled: options.enabled !== false,
      environment: options.environment || "RECETTE",
      callerProject: "AKS-PORTAL-RECETTE",
      currentSecret: options.currentSecret || "recipe-secret",
      previousSecret: options.previousSecret,
      backendVersion: "ADMIN-006-B1"
    }),
    logReader: adapters.logReader(options.reader || function (query) {
      reads.push(query);
      return {
        events: [{
          occurredAt: "2026-08-28T11:59:00.000Z",
          severity: "WARN",
          code: "TEST",
          message: "visible",
          correlationId: "event-correlation",
          spreadsheetId: "forbidden",
          secret: "forbidden"
        }],
        nextCursor: "cursor-002"
      };
    }),
    proofWriter: adapters.proofWriter(options.writer || function (proof) {
      proofs.push(proof);
    })
  });
  return { backend: backend, reads: reads, proofs: proofs };
}

function AKS_testAdmin006LotB_backendIsInactiveByDefault_() {
  var backend = AKS_createPrivateBackend_({});
  assertTrue_(!backend.enabledByDefault);
  assertEquals_("LOG_READ_RECENT_V1", backend.command);
  assertThrows_(function () {
    backend.process("{}");
  }, "PRIVATE_BACKEND_UNAVAILABLE");
}

function AKS_testAdmin006LotB_processesValidSignedRequest_() {
  var fixture = AKS_admin006LotBBackendFixture_();
  var response = fixture.backend.process(JSON.stringify(
    AKS_admin006LotBRequest_("recipe-secret")
  ));
  assertEquals_("OK", response.status);
  assertEquals_(1, response.data.events.length);
  assertEquals_(1, fixture.reads.length);
  assertEquals_(1, fixture.proofs.length);
}

function AKS_testAdmin006LotB_rejectsInvalidSignatureBeforeLog_() {
  var fixture = AKS_admin006LotBBackendFixture_();
  var request = AKS_admin006PrivateProtocolClone_(
    AKS_admin006LotBRequest_("recipe-secret")
  );
  request.signature += "altered";
  assertThrows_(function () {
    fixture.backend.process(JSON.stringify(request));
  }, "PRIVATE_ACCESS_DENIED");
  assertEquals_(0, fixture.reads.length);
  assertEquals_(0, fixture.proofs.length);
}

function AKS_testAdmin006LotB_rejectsNonRecipeConfiguration_() {
  var fixture = AKS_admin006LotBBackendFixture_({
    environment: "PRODUCTION"
  });
  assertThrows_(function () {
    fixture.backend.process(JSON.stringify(
      AKS_admin006LotBRequest_("recipe-secret")
    ));
  }, "PRIVATE_BACKEND_UNAVAILABLE");
  assertEquals_(0, fixture.reads.length);
}

function AKS_testAdmin006LotB_acceptsPreviousSecretDuringRotation_() {
  var fixture = AKS_admin006LotBBackendFixture_({
    currentSecret: "new-secret",
    previousSecret: "old-secret"
  });
  var response = fixture.backend.process(JSON.stringify(
    AKS_admin006LotBRequest_("old-secret")
  ));
  var protocol = AKS_admin006PrivateProtocolFixture_();
  var validated = protocol.validateSignedResponse(
    response,
    "old-secret",
    {
      environment: "RECETTE",
      requestId: "request-001",
      correlationId: "correlation-001"
    }
  );
  assertEquals_("OK", validated.status);
}

function AKS_testAdmin006LotB_minimizesLogEvents_() {
  var fixture = AKS_admin006LotBBackendFixture_();
  var response = fixture.backend.process(JSON.stringify(
    AKS_admin006LotBRequest_("recipe-secret")
  ));
  var event = response.data.events[0];
  assertEquals_("visible", event.message);
  assertTrue_(typeof event.spreadsheetId === "undefined");
  assertTrue_(typeof event.secret === "undefined");
  assertTrue_(Object.isFrozen(event));
}

function AKS_testAdmin006LotB_writesMinimalProof_() {
  var fixture = AKS_admin006LotBBackendFixture_();
  fixture.backend.process(JSON.stringify(
    AKS_admin006LotBRequest_("recipe-secret")
  ));
  var proof = fixture.proofs[0];
  assertEquals_("LOG_READ_RECENT_V1", proof.command);
  assertTrue_(proof.actorHash.indexOf("sha256:") === 0);
  assertTrue_(typeof proof.actor === "undefined");
  assertTrue_(typeof proof.secret === "undefined");
}

function AKS_testAdmin006LotB_refusesMalformedBodyBeforeLog_() {
  var fixture = AKS_admin006LotBBackendFixture_();
  assertThrows_(function () {
    fixture.backend.process("{invalid");
  }, "PRIVATE_REQUEST_INVALID");
  assertEquals_(0, fixture.reads.length);
}

function AKS_testAdmin006LotB_replayGuardConsumesFirstRequest_() {
  var fixture = AKS_admin006LotBMemoryGuardFixture_();
  assertTrue_(fixture.guard.consume(
    "request-A",
    "nonce-A",
    new Date("2026-08-28T12:01:00.000Z").getTime()
  ));
  assertEquals_(2, Object.keys(fixture.values).length);
  assertEquals_(1, fixture.released());
}

function AKS_testAdmin006LotB_replayGuardRejectsRequestReplay_() {
  var fixture = AKS_admin006LotBMemoryGuardFixture_();
  var expiry = new Date("2026-08-28T12:01:00.000Z").getTime();
  assertTrue_(fixture.guard.consume("request-A", "nonce-A", expiry));
  assertTrue_(!fixture.guard.consume("request-A", "nonce-B", expiry));
}

function AKS_testAdmin006LotB_replayGuardRejectsNonceReplay_() {
  var fixture = AKS_admin006LotBMemoryGuardFixture_();
  var expiry = new Date("2026-08-28T12:01:00.000Z").getTime();
  assertTrue_(fixture.guard.consume("request-A", "nonce-A", expiry));
  assertTrue_(!fixture.guard.consume("request-B", "nonce-A", expiry));
}

function AKS_testAdmin006LotB_replayGuardPurgesExpiredRecords_() {
  var values = {
    AKS_PRIVATE_REPLAY_REQ_old: JSON.stringify({
      v: 1,
      expiresAtMs: AKS_admin006LotBNow_() - 1
    })
  };
  var fixture = AKS_admin006LotBMemoryGuardFixture_({ values: values });
  fixture.guard.consume(
    "request-A",
    "nonce-A",
    new Date("2026-08-28T12:01:00.000Z").getTime()
  );
  assertTrue_(
    typeof values.AKS_PRIVATE_REPLAY_REQ_old === "undefined"
  );
}

function AKS_testAdmin006LotB_replayGuardRejectsUnavailableLock_() {
  var fixture = AKS_admin006LotBMemoryGuardFixture_({
    lockAvailable: false
  });
  assertThrows_(function () {
    fixture.guard.consume(
      "request-A",
      "nonce-A",
      new Date("2026-08-28T12:01:00.000Z").getTime()
    );
  }, "PRIVATE_BACKEND_UNAVAILABLE");
  assertEquals_(0, fixture.released());
}

function AKS_testAdmin006LotB_replayGuardVerifiesPersistence_() {
  var fixture = AKS_admin006LotBMemoryGuardFixture_({
    ignoreWrites: true
  });
  assertThrows_(function () {
    fixture.guard.consume(
      "request-A",
      "nonce-A",
      new Date("2026-08-28T12:01:00.000Z").getTime()
    );
  }, "PRIVATE_BACKEND_UNAVAILABLE");
  assertEquals_(1, fixture.released());
}

function AKS_testAdmin006LotB_backendRejectsSecondProcessing_() {
  var fixture = AKS_admin006LotBBackendFixture_();
  var body = JSON.stringify(AKS_admin006LotBRequest_("recipe-secret"));
  fixture.backend.process(body);
  assertThrows_(function () {
    fixture.backend.process(body);
  }, "PRIVATE_REPLAY_REJECTED");
  assertEquals_(1, fixture.reads.length);
}

function AKS_testAdmin006LotB_appsScriptGuardRequiresExplicitEnablement_() {
  assertThrows_(function () {
    AKS_createAppsScriptPrivateReplayGuard_({
      enabled: false,
      environment: "RECETTE"
    });
  }, "PRIVATE_BACKEND_UNAVAILABLE");
}

function AKS_testAdmin006LotB_adaptersRequireExplicitConnections_() {
  var adapters = AKS_createPrivateBackendAdapters_();
  assertThrows_(function () {
    adapters.logReader().readRecent({ limit: 5 });
  }, "PRIVATE_BACKEND_UNAVAILABLE");
  assertThrows_(function () {
    adapters.proofWriter().write({});
  }, "PRIVATE_BACKEND_UNAVAILABLE");
}

function AKS_testAdmin006LotB_exportsFrozenFactoriesWithoutEndpoint_() {
  assertTrue_(Object.isFrozen(AKS.Core.PrivateBackend));
  assertTrue_(Object.isFrozen(AKS.Core.PrivateReplayGuard));
  assertTrue_(Object.isFrozen(AKS.Core.PrivateBackendAdapters));
  assertTrue_(
    typeof AKS.Core.PrivateBackend.create === "function"
  );
}

function AKS_runAdmin006LotBPrivateBackendSuite() {
  return AKS_runNamedTestSuite_(
    "ADMIN-006 — lot B backend privé",
    [
      { name: "backend inactif par défaut", test: AKS_testAdmin006LotB_backendIsInactiveByDefault_ },
      { name: "requête valide traitée", test: AKS_testAdmin006LotB_processesValidSignedRequest_ },
      { name: "signature invalide avant LOG", test: AKS_testAdmin006LotB_rejectsInvalidSignatureBeforeLog_ },
      { name: "configuration hors RECETTE", test: AKS_testAdmin006LotB_rejectsNonRecipeConfiguration_ },
      { name: "rotation du secret précédent", test: AKS_testAdmin006LotB_acceptsPreviousSecretDuringRotation_ },
      { name: "événements LOG minimisés", test: AKS_testAdmin006LotB_minimizesLogEvents_ },
      { name: "preuve technique minimale", test: AKS_testAdmin006LotB_writesMinimalProof_ },
      { name: "corps invalide avant LOG", test: AKS_testAdmin006LotB_refusesMalformedBodyBeforeLog_ },
      { name: "première consommation anti-rejeu", test: AKS_testAdmin006LotB_replayGuardConsumesFirstRequest_ },
      { name: "rejeu requestId refusé", test: AKS_testAdmin006LotB_replayGuardRejectsRequestReplay_ },
      { name: "rejeu nonce refusé", test: AKS_testAdmin006LotB_replayGuardRejectsNonceReplay_ },
      { name: "purge des entrées expirées", test: AKS_testAdmin006LotB_replayGuardPurgesExpiredRecords_ },
      { name: "verrou indisponible", test: AKS_testAdmin006LotB_replayGuardRejectsUnavailableLock_ },
      { name: "persistance relue", test: AKS_testAdmin006LotB_replayGuardVerifiesPersistence_ },
      { name: "second traitement refusé", test: AKS_testAdmin006LotB_backendRejectsSecondProcessing_ },
      { name: "activation Apps Script explicite", test: AKS_testAdmin006LotB_appsScriptGuardRequiresExplicitEnablement_ },
      { name: "adaptateurs non raccordés", test: AKS_testAdmin006LotB_adaptersRequireExplicitConnections_ },
      { name: "fabriques gelées sans endpoint", test: AKS_testAdmin006LotB_exportsFrozenFactoriesWithoutEndpoint_ }
    ]
  );
}
