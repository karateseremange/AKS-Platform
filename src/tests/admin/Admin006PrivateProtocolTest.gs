function AKS_admin006PrivateProtocolCryptoFixture_() {
  return {
    sha256Hex: function (text) {
      return "sha256:" + String(text);
    },
    hmacSha256Base64: function (text, secret) {
      return "hmac:" + String(secret) + ":" + String(text);
    }
  };
}

function AKS_admin006PrivateProtocolRequestInput_() {
  return {
    environment: "RECETTE",
    callerProject: "AKS-PORTAL-RECETTE",
    actor: " Teacher@Example.com ",
    requestId: "request-001",
    correlationId: "correlation-001",
    issuedAt: "2026-08-28T12:00:00.000Z",
    expiresAt: "2026-08-28T12:01:00.000Z",
    nonce: "0123456789abcdef0123456789abcdef",
    payload: { severity: "warn", limit: 5 }
  };
}

function AKS_admin006PrivateProtocolFixture_(replayGuard) {
  return AKS_createPrivateProtocol_({
    crypto: AKS_admin006PrivateProtocolCryptoFixture_(),
    nowProvider: function () {
      return new Date("2026-08-28T12:00:30.000Z").getTime();
    },
    replayGuard: replayGuard || {
      consume: function () { return true; }
    }
  });
}

function AKS_admin006PrivateProtocolClone_(value) {
  return JSON.parse(JSON.stringify(value));
}

function AKS_testAdmin006PrivateProtocol_exposesClosedContract_() {
  var protocol = AKS_admin006PrivateProtocolFixture_();
  assertEquals_("AKS-PRIVATE/1", protocol.protocol);
  assertEquals_("LOG_READ_RECENT_V1", protocol.command);
  assertEquals_(60000, protocol.maximumRequestAgeMs);
  assertEquals_(30000, protocol.clockSkewMs);
  assertEquals_(16384, protocol.maximumBodyBytes);
  assertEquals_(20, protocol.maximumLimit);
  assertTrue_(Object.isFrozen(protocol));
}

function AKS_testAdmin006PrivateProtocol_canonicalizesDeterministically_() {
  var protocol = AKS_admin006PrivateProtocolFixture_();
  assertEquals_(
    '{"a":{"x":1,"y":2},"b":[true,null,"value"]}',
    protocol.canonicalize({
      b: [true, null, "value"],
      a: { y: 2, x: 1 }
    })
  );
  assertEquals_(
    protocol.canonicalize({ z: 3, a: 1 }),
    protocol.canonicalize({ a: 1, z: 3 })
  );
}

function AKS_testAdmin006PrivateProtocol_rejectsUnsafeCanonicalValues_() {
  var protocol = AKS_admin006PrivateProtocolFixture_();
  assertThrows_(function () {
    protocol.canonicalize({ invalid: undefined });
  }, "PRIVATE_REQUEST_INVALID");
  assertThrows_(function () {
    protocol.canonicalize({ invalid: Infinity });
  }, "PRIVATE_REQUEST_INVALID");
  var circular = {};
  circular.self = circular;
  assertThrows_(function () {
    protocol.canonicalize(circular);
  }, "PRIVATE_REQUEST_INVALID");
}

function AKS_testAdmin006PrivateProtocol_normalizesActorAndPayload_() {
  var protocol = AKS_admin006PrivateProtocolFixture_();
  assertEquals_(
    "teacher@example.com",
    protocol.normalizeActor(" Teacher@Example.com ")
  );
  var payload = protocol.validatePayload({ severity: "error" });
  assertEquals_(5, payload.limit);
  assertEquals_("ERROR", payload.severity);
  assertTrue_(Object.isFrozen(payload));
}

function AKS_testAdmin006PrivateProtocol_rejectsUnknownPayloadFields_() {
  var protocol = AKS_admin006PrivateProtocolFixture_();
  assertThrows_(function () {
    protocol.validatePayload({ limit: 5, spreadsheetId: "forbidden" });
  }, "PRIVATE_REQUEST_INVALID");
  assertThrows_(function () {
    protocol.validatePayload({ limit: 21 });
  }, "PRIVATE_REQUEST_INVALID");
  assertThrows_(function () {
    protocol.validatePayload({ severity: "UNKNOWN" });
  }, "PRIVATE_REQUEST_INVALID");
}

function AKS_testAdmin006PrivateProtocol_createsImmutableSignedRequest_() {
  var protocol = AKS_admin006PrivateProtocolFixture_();
  var request = protocol.createSignedRequest(
    AKS_admin006PrivateProtocolRequestInput_(),
    "recipe-secret"
  );
  assertEquals_("teacher@example.com", request.actor);
  assertEquals_("WARN", request.payload.severity);
  assertTrue_(request.payloadHash.indexOf("sha256:") === 0);
  assertTrue_(request.signature.indexOf("hmac:recipe-secret:") === 0);
  assertTrue_(Object.isFrozen(request));
  assertTrue_(Object.isFrozen(request.payload));
}

function AKS_testAdmin006PrivateProtocol_validatesSignedRequest_() {
  var replay = [];
  var protocol = AKS_admin006PrivateProtocolFixture_({
    consume: function (requestId, nonce, expiresAtMs) {
      replay.push([requestId, nonce, expiresAtMs]);
      return true;
    }
  });
  var request = protocol.createSignedRequest(
    AKS_admin006PrivateProtocolRequestInput_(),
    "recipe-secret"
  );
  var validated = protocol.validateSignedRequest(
    request,
    "recipe-secret",
    {
      environment: "RECETTE",
      callerProject: "AKS-PORTAL-RECETTE"
    }
  );
  assertEquals_("LOG_READ_RECENT_V1", validated.command);
  assertEquals_(1, replay.length);
  assertEquals_("request-001", replay[0][0]);
  assertEquals_(
    new Date("2026-08-28T12:01:00.000Z").getTime(),
    replay[0][2]
  );
  assertTrue_(Object.isFrozen(validated));
}

function AKS_testAdmin006PrivateProtocol_rejectsPayloadTampering_() {
  var protocol = AKS_admin006PrivateProtocolFixture_();
  var request = AKS_admin006PrivateProtocolClone_(
    protocol.createSignedRequest(
      AKS_admin006PrivateProtocolRequestInput_(),
      "recipe-secret"
    )
  );
  request.payload.limit = 6;
  assertThrows_(function () {
    protocol.validateSignedRequest(request, "recipe-secret", {
      environment: "RECETTE",
      callerProject: "AKS-PORTAL-RECETTE"
    });
  }, "PRIVATE_REQUEST_INVALID");
}

function AKS_testAdmin006PrivateProtocol_rejectsSignatureTampering_() {
  var protocol = AKS_admin006PrivateProtocolFixture_();
  var request = AKS_admin006PrivateProtocolClone_(
    protocol.createSignedRequest(
      AKS_admin006PrivateProtocolRequestInput_(),
      "recipe-secret"
    )
  );
  request.signature += "x";
  assertThrows_(function () {
    protocol.validateSignedRequest(request, "recipe-secret", {
      environment: "RECETTE",
      callerProject: "AKS-PORTAL-RECETTE"
    });
  }, "PRIVATE_ACCESS_DENIED");
}

function AKS_testAdmin006PrivateProtocol_rejectsWrongEnvironment_() {
  var protocol = AKS_admin006PrivateProtocolFixture_();
  var request = protocol.createSignedRequest(
    AKS_admin006PrivateProtocolRequestInput_(),
    "recipe-secret"
  );
  assertThrows_(function () {
    protocol.validateSignedRequest(request, "recipe-secret", {
      environment: "PRODUCTION",
      callerProject: "AKS-PORTAL-RECETTE"
    });
  }, "PRIVATE_ACCESS_DENIED");
}

function AKS_testAdmin006PrivateProtocol_rejectsExpiredRequest_() {
  var protocol = AKS_createPrivateProtocol_({
    crypto: AKS_admin006PrivateProtocolCryptoFixture_(),
    nowProvider: function () {
      return new Date("2026-08-28T12:01:00.001Z").getTime();
    },
    replayGuard: { consume: function () { return true; } }
  });
  var request = protocol.createSignedRequest(
    AKS_admin006PrivateProtocolRequestInput_(),
    "recipe-secret"
  );
  assertThrows_(function () {
    protocol.validateSignedRequest(request, "recipe-secret", {
      environment: "RECETTE",
      callerProject: "AKS-PORTAL-RECETTE"
    });
  }, "PRIVATE_REQUEST_EXPIRED");
}

function AKS_testAdmin006PrivateProtocol_rejectsReplay_() {
  var consumed = false;
  var protocol = AKS_admin006PrivateProtocolFixture_({
    consume: function () {
      if (consumed) return false;
      consumed = true;
      return true;
    }
  });
  var request = protocol.createSignedRequest(
    AKS_admin006PrivateProtocolRequestInput_(),
    "recipe-secret"
  );
  var expected = {
    environment: "RECETTE",
    callerProject: "AKS-PORTAL-RECETTE"
  };
  protocol.validateSignedRequest(request, "recipe-secret", expected);
  assertThrows_(function () {
    protocol.validateSignedRequest(request, "recipe-secret", expected);
  }, "PRIVATE_REPLAY_REJECTED");
}

function AKS_testAdmin006PrivateProtocol_requiresReplayGuard_() {
  var protocol = AKS_createPrivateProtocol_({
    crypto: AKS_admin006PrivateProtocolCryptoFixture_(),
    nowProvider: function () {
      return new Date("2026-08-28T12:00:30.000Z").getTime();
    }
  });
  var request = protocol.createSignedRequest(
    AKS_admin006PrivateProtocolRequestInput_(),
    "recipe-secret"
  );
  assertThrows_(function () {
    protocol.validateSignedRequest(request, "recipe-secret", {
      environment: "RECETTE",
      callerProject: "AKS-PORTAL-RECETTE"
    });
  }, "PRIVATE_OPERATION_FAILED");
}

function AKS_testAdmin006PrivateProtocol_usesConstantWorkComparison_() {
  var protocol = AKS_admin006PrivateProtocolFixture_();
  assertTrue_(protocol.timingSafeEqual("same-value", "same-value"));
  assertTrue_(!protocol.timingSafeEqual("same-value", "other-value"));
  assertTrue_(!protocol.timingSafeEqual("short", "longer-value"));
}

function AKS_testAdmin006PrivateProtocol_matchesCryptoVectors_() {
  var crypto = AKS_createAppsScriptPrivateCrypto_();
  assertEquals_(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    crypto.sha256Hex("abc")
  );
  assertEquals_(
    "97yD9DBThCSxMpjmqm+xQ+9NWaFJRhdZl0edvC0aPNg=",
    crypto.hmacSha256Base64(
      "The quick brown fox jumps over the lazy dog",
      "key"
    )
  );
}

function AKS_testAdmin006PrivateProtocol_signsAndValidatesResponse_() {
  var protocol = AKS_admin006PrivateProtocolFixture_();
  var response = protocol.createSignedResponse({
    environment: "RECETTE",
    requestId: "request-001",
    correlationId: "correlation-001",
    respondedAt: "2026-08-28T12:00:31.000Z",
    status: "OK",
    data: { events: [], count: 0 }
  }, "recipe-secret");
  var validated = protocol.validateSignedResponse(
    response,
    "recipe-secret",
    {
      environment: "RECETTE",
      requestId: "request-001",
      correlationId: "correlation-001"
    }
  );
  assertEquals_("OK", validated.status);
  assertEquals_(0, validated.data.count);
  assertTrue_(Object.isFrozen(validated));
}

function AKS_testAdmin006PrivateProtocol_rejectsAlteredResponse_() {
  var protocol = AKS_admin006PrivateProtocolFixture_();
  var response = AKS_admin006PrivateProtocolClone_(
    protocol.createSignedResponse({
      environment: "RECETTE",
      requestId: "request-001",
      correlationId: "correlation-001",
      respondedAt: "2026-08-28T12:00:31.000Z",
      status: "OK",
      data: { events: [], count: 0 }
    }, "recipe-secret")
  );
  response.data.count = 1;
  assertThrows_(function () {
    protocol.validateSignedResponse(response, "recipe-secret", {
      environment: "RECETTE",
      requestId: "request-001",
      correlationId: "correlation-001"
    });
  }, "PRIVATE_BACKEND_UNAVAILABLE");
}

function AKS_testAdmin006PrivateProtocol_rejectsUncorrelatedResponse_() {
  var protocol = AKS_admin006PrivateProtocolFixture_();
  var response = protocol.createSignedResponse({
    environment: "RECETTE",
    requestId: "request-001",
    correlationId: "correlation-001",
    respondedAt: "2026-08-28T12:00:31.000Z",
    status: "OK",
    data: null
  }, "recipe-secret");
  assertThrows_(function () {
    protocol.validateSignedResponse(response, "recipe-secret", {
      environment: "RECETTE",
      requestId: "request-OTHER",
      correlationId: "correlation-001"
    });
  }, "PRIVATE_BACKEND_UNAVAILABLE");
}

function AKS_runAdmin006PrivateProtocolSuite() {
  return AKS_runNamedTestSuite_("ADMIN-006 — lot A protocole privé", [
    { name: "contrat fermé", test: AKS_testAdmin006PrivateProtocol_exposesClosedContract_ },
    { name: "canonicalisation déterministe", test: AKS_testAdmin006PrivateProtocol_canonicalizesDeterministically_ },
    { name: "valeurs canoniques interdites", test: AKS_testAdmin006PrivateProtocol_rejectsUnsafeCanonicalValues_ },
    { name: "normalisation acteur et payload", test: AKS_testAdmin006PrivateProtocol_normalizesActorAndPayload_ },
    { name: "champs payload fermés", test: AKS_testAdmin006PrivateProtocol_rejectsUnknownPayloadFields_ },
    { name: "requête signée immuable", test: AKS_testAdmin006PrivateProtocol_createsImmutableSignedRequest_ },
    { name: "validation nominale", test: AKS_testAdmin006PrivateProtocol_validatesSignedRequest_ },
    { name: "payload altéré", test: AKS_testAdmin006PrivateProtocol_rejectsPayloadTampering_ },
    { name: "signature altérée", test: AKS_testAdmin006PrivateProtocol_rejectsSignatureTampering_ },
    { name: "environnement erroné", test: AKS_testAdmin006PrivateProtocol_rejectsWrongEnvironment_ },
    { name: "requête expirée", test: AKS_testAdmin006PrivateProtocol_rejectsExpiredRequest_ },
    { name: "rejeu refusé", test: AKS_testAdmin006PrivateProtocol_rejectsReplay_ },
    { name: "garde anti-rejeu obligatoire", test: AKS_testAdmin006PrivateProtocol_requiresReplayGuard_ },
    { name: "comparaison de signature", test: AKS_testAdmin006PrivateProtocol_usesConstantWorkComparison_ },
    { name: "vecteurs SHA-256 et HMAC", test: AKS_testAdmin006PrivateProtocol_matchesCryptoVectors_ },
    { name: "réponse signée nominale", test: AKS_testAdmin006PrivateProtocol_signsAndValidatesResponse_ },
    { name: "réponse altérée", test: AKS_testAdmin006PrivateProtocol_rejectsAlteredResponse_ },
    { name: "réponse non corrélée", test: AKS_testAdmin006PrivateProtocol_rejectsUncorrelatedResponse_ }
  ]);
}
