function test_HQ009_acceptsValidSignedContextRequest() {
  var fixture = createHQ009ApiFixture_();
  var response = fixture.api.handle(fixture.sign("context", {}));

  assertTrue_(response.ok);
  assertEquals_(1, fixture.contextCalls);
}

function test_HQ009_rejectsInvalidSignatureBeforePayloadParsing() {
  var fixture = createHQ009ApiFixture_();
  var envelope = JSON.parse(fixture.sign("submit", {}));
  envelope.payload = "{invalid-json";
  envelope.signature = "invalid";
  var response = fixture.api.handle(JSON.stringify(envelope));

  assertTrue_(!response.ok);
  assertEquals_("HQ_API_SIGNATURE_INVALID", response.error.code);
  assertEquals_(0, fixture.submitCalls);
}

function test_HQ009_rejectsExpiredRequest() {
  var fixture = createHQ009ApiFixture_();
  var response = fixture.api.handle(
    fixture.sign("context", {}, 1783939000)
  );

  assertTrue_(!response.ok);
  assertEquals_("HQ_API_REQUEST_EXPIRED", response.error.code);
}

function test_HQ009_rejectsNonceReplay() {
  var fixture = createHQ009ApiFixture_();
  var request = fixture.sign("prepare", { answers: {} });
  var first = fixture.api.handle(request);
  var second = fixture.api.handle(request);

  assertTrue_(first.ok);
  assertTrue_(!second.ok);
  assertEquals_("HQ_API_REPLAY_REJECTED", second.error.code);
}

function test_HQ009_routesSubmitWithoutPersistingPayloadInCache() {
  var fixture = createHQ009ApiFixture_();
  var payload = {
    requestId: "request-1",
    answers: { Q1: "YES" }
  };
  var response = fixture.api.handle(fixture.sign("submit", payload));

  assertTrue_(response.ok);
  assertEquals_(1, fixture.submitCalls);
  assertTrue_(JSON.stringify(fixture.cacheValues).indexOf("Q1") === -1);
  assertTrue_(JSON.stringify(fixture.cacheValues).indexOf("YES") === -1);
}

function createHQ009ApiFixture_() {
  var secret = "01234567890123456789012345678901";
  var fixture = {
    contextCalls: 0,
    prepareCalls: 0,
    submitCalls: 0,
    cacheValues: {}
  };
  var cache = {
    get: function (key) { return fixture.cacheValues[key] || null; },
    put: function (key, value) { fixture.cacheValues[key] = value; }
  };
  var replayLock = {
    waitLock: function () {},
    releaseLock: function () {}
  };
  var digest = function (value) {
    return "digest-" + String(value).length;
  };
  var hmac = function (value, key) {
    return "signature-" + key.length + "-" + value.length;
  };
  var controller = {
    getPublicViewModel: function () {
      fixture.contextCalls += 1;
      return AKS.Core.Result.success({ available: true });
    },
    prepareDeclaration: function () {
      fixture.prepareCalls += 1;
      return AKS.Core.Result.success({ result: "TEST" });
    }
  };

  fixture.api = AKS.Modules.HealthQuestionnaire.HealthQuestionnaireApi({
    now: function () { return new Date("2026-07-13T12:00:00Z"); },
    getSecret: function () { return secret; },
    cache: cache,
    replayLock: replayLock,
    digest: digest,
    hmac: hmac,
    install: function () { return AKS.Core.Result.success({}); },
    resolveController: function () { return controller; },
    submit: function () {
      fixture.submitCalls += 1;
      return AKS.Core.Result.success({ submissionId: "QS-TEST" });
    }
  });
  fixture.sign = function (action, payload, timestamp) {
    var payloadJson = JSON.stringify(payload || {});
    var issuedAt = timestamp || 1783944000;
    var nonce = "abcdefghijklmnopqrstuvwx";
    var canonical = [
      "1", action, issuedAt, nonce, digest(payloadJson)
    ].join("\n");
    return JSON.stringify({
      version: "1",
      action: action,
      timestamp: issuedAt,
      nonce: nonce,
      payload: payloadJson,
      signature: hmac(canonical, secret)
    });
  };
  return fixture;
}
