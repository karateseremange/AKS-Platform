/** All D4 fixtures are synthetic. They never connect to Google or a deployment. */
function AKS_admin006D4Access_(options) {
  options = options || {};
  return {
    getCurrentIdentity: function () { return options.emptyIdentity ? "" : "reader@example.com"; },
    assertAdministrationCapability: function (capability) {
      assertEquals_("LOG_READ", capability);
      if (options.denied) throw new Error("internal ACCESS detail");
      return true;
    },
    getEffectiveAccessSnapshot: function () {
      if (options.accessFailure) throw new Error("internal registry detail");
      return { email: options.wrongIdentity ? "other@example.com" : "reader@example.com",
        bootstrap: options.bootstrap === true,
        assignments: [{ module: "ADMINISTRATION", capabilities: options.noLogRead ? ["CONFIG_READ"] : ["LOG_READ"] }] };
    }
  };
}

function AKS_admin006D4Response_(code, body, headers) {
  return { getResponseCode: function () { return code; },
    getContentText: function () { return body; },
    getAllHeaders: function () { return headers || { "Content-Type": "application/json; charset=utf-8" }; } };
}

function AKS_admin006D4Fixture_(options) {
  options = options || {};
  var secret = "synthetic-d4-test-secret-never-installed-0123456789";
  var values = {
    AKS_PRIVATE_PORTAL_ENABLED: "true", AKS_PRIVATE_PORTAL_ENVIRONMENT: "RECETTE",
    AKS_PRIVATE_CALLER_PROJECT: AKS_privatePortalRecipeId_(),
    AKS_PRIVATE_BACKEND_URL: "https://script.google.com/macros/s/SYNTHETIC_D4_TEST_ENDPOINT/exec",
    AKS_PRIVATE_SECRET_VERSION: "D4-TEST", AKS_PRIVATE_HMAC_CURRENT: secret
  };
  Object.keys(options.properties || {}).forEach(function (key) {
    if (options.properties[key] === null) delete values[key];
    else values[key] = options.properties[key];
  });
  var calls = { reads: [], fetches: [], signatures: 0, requests: [] };
  var crypto = AKS_createAppsScriptPrivateCrypto_();
  var protocol = AKS_createPrivateProtocol_({ crypto: crypto });
  var uuidIndex = 0;
  var access = options.access || AKS_admin006D4Access_(options);
  var runtime = AKS_createPrivatePortalRuntime_({
    scriptIdProvider: function () { return options.wrongProject ? "another-eIRxs4" : AKS_privatePortalRecipeId_(); },
    accessFactory: function () { return access; },
    properties: { getProperty: function (key) {
      calls.reads.push(key); return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    } },
    crypto: { sha256Hex: crypto.sha256Hex, hmacSha256Base64: function (text, key) {
      calls.signatures += 1; return crypto.hmacSha256Base64(text, key);
    } },
    uuidProvider: options.uuidProvider || function () {
      uuidIndex += 1;
      return "00000000-0000-4000-8000-" + ("000000000000" + uuidIndex).slice(-12);
    },
    nowProvider: function () { return new Date("2026-09-01T12:00:00.000Z").getTime(); },
    fetcher: function (url, parameters) {
      calls.fetches.push({ url: url, parameters: parameters });
      if (options.fetchFailure) throw new Error("sensitive URL or transport error");
      var request = JSON.parse(parameters.payload);
      calls.requests.push(request);
      var data = { events: options.events || [{ occurredAt: "2026-09-01T11:59:00.000Z",
        severity: "INFO", code: "SYNTHETIC", message: "visible", correlationId: "event-correlation",
        actor: "must disappear", context: { secret: "must disappear" } }], nextCursor: "row:10" };
      var response = protocol.createSignedResponse({ environment: options.responseEnvironment || "RECETTE",
        requestId: options.wrongCorrelation ? "wrong-request" : request.requestId,
        correlationId: request.correlationId, respondedAt: "2026-09-01T12:00:01.000Z",
        status: "OK", data: data }, secret);
      if (options.altered) { response = JSON.parse(JSON.stringify(response)); response.signature = "altered"; }
      return AKS_admin006D4Response_(200, options.rawBody || JSON.stringify(response));
    }
  });
  return { runtime: runtime, values: values, calls: calls, access: access };
}

function AKS_admin006D4AssertClosed_(fixture) {
  var result = fixture.runtime.readRecent({ limit: 5 });
  assertTrue_(!result.available);
  assertEquals_(0, fixture.calls.fetches.length);
  assertEquals_(0, fixture.calls.signatures);
  return result;
}

function AKS_testAdmin006D4_refusesWrongProjectBeforeProperties_() {
  var fixture = AKS_admin006D4Fixture_({ wrongProject: true });
  AKS_admin006D4AssertClosed_(fixture);
  assertEquals_(0, fixture.calls.reads.length);
}
function AKS_testAdmin006D4_refusesEmptyIdentityBeforeProperties_() {
  var fixture = AKS_admin006D4Fixture_({ emptyIdentity: true });
  AKS_admin006D4AssertClosed_(fixture);
  assertEquals_(0, fixture.calls.reads.length);
}
function AKS_testAdmin006D4_refusesAccessFailureBeforeProperties_() {
  [ { denied: true }, { accessFailure: true }, { noLogRead: true }, { wrongIdentity: true } ].forEach(function (options) {
    var fixture = AKS_admin006D4Fixture_(options);
    AKS_admin006D4AssertClosed_(fixture);
    assertEquals_(0, fixture.calls.reads.length);
  });
}
function AKS_testAdmin006D4_refusesBootstrapException_() {
  var fixture = AKS_admin006D4Fixture_({ bootstrap: true });
  AKS_admin006D4AssertClosed_(fixture);
  assertEquals_(0, fixture.calls.reads.length);
  assertEquals_("DENIED", AKS_privatePortalLogShell_(fixture.access, "widget", "").status);
}
function AKS_testAdmin006D4_disabledDoesNotReadSecret_() {
  [null, "false"].forEach(function (flag) {
    var fixture = AKS_admin006D4Fixture_({ properties: { AKS_PRIVATE_PORTAL_ENABLED: flag } });
    assertEquals_("DISABLED", AKS_admin006D4AssertClosed_(fixture).status);
    assertEquals_(-1, fixture.calls.reads.indexOf("AKS_PRIVATE_HMAC_CURRENT"));
  });
}
function AKS_testAdmin006D4_refusesInvalidServerConfiguration_() {
  [{ AKS_PRIVATE_PORTAL_ENABLED: "TRUE" }, { AKS_PRIVATE_PORTAL_ENVIRONMENT: "PRODUCTION" },
    { AKS_PRIVATE_CALLER_PROJECT: "eIRxs4" }, { AKS_PRIVATE_HMAC_PREVIOUS: "old" },
    { AKS_PRIVATE_TIMEOUT_MS: "1" }, { AKS_PRIVATE_SECRET_VERSION: null },
    { AKS_PRIVATE_BACKEND_URL: "https://attacker.invalid/exec" },
    { AKS_PRIVATE_BACKEND_URL: "https://script.google.com/macros/s/SYNTHETIC_D4_TEST_ENDPOINT/dev" },
    { AKS_PRIVATE_HMAC_CURRENT: "short" }].forEach(function (properties) {
      AKS_admin006D4AssertClosed_(AKS_admin006D4Fixture_({ properties: properties }));
    });
}
function AKS_testAdmin006D4_rejectsReservedPayloadFields_() {
  ["actor", "endpoint", "secret", "support", "cursor", "callerProject"].forEach(function (key) {
    var fixture = AKS_admin006D4Fixture_();
    var input = { limit: 5 }; input[key] = "forbidden";
    assertTrue_(!fixture.runtime.readRecent(input).available);
    assertEquals_(0, fixture.calls.signatures);
    assertEquals_(0, fixture.calls.reads.length);
  });
}
function AKS_testAdmin006D4_nominalSignedExchangeMinimizesDto_() {
  var fixture = AKS_admin006D4Fixture_();
  var result = fixture.runtime.readRecent({ limit: 5 });
  assertEquals_("AVAILABLE", result.status);
  assertEquals_("reader@example.com", fixture.calls.requests[0].actor);
  assertEquals_(AKS_privatePortalRecipeId_(), fixture.calls.requests[0].callerProject);
  assertEquals_("available,events,status", Object.keys(result).sort().join(","));
  assertEquals_("code,correlationId,message,occurredAt,severity", Object.keys(result.events[0]).sort().join(","));
  assertTrue_(JSON.stringify(result).indexOf("must disappear") === -1);
  assertTrue_(JSON.stringify(result).indexOf("script.google") === -1);
  assertTrue_(Object.isFrozen(result.events[0]));
}
function AKS_testAdmin006D4_rechecksAccessAfterRevocation_() {
  var options = {};
  var fixture = AKS_admin006D4Fixture_({ access: AKS_admin006D4Access_(options) });
  assertTrue_(fixture.runtime.readRecent({ limit: 5 }).available);
  var signatures = fixture.calls.signatures;
  options.denied = true;
  assertEquals_("DENIED", fixture.runtime.readRecent({ limit: 5 }).status);
  assertEquals_(signatures, fixture.calls.signatures);
  assertEquals_(1, fixture.calls.fetches.length);
}
function AKS_testAdmin006D4_rejectsAlteredOrUncorrelatedResponse_() {
  [{ altered: true }, { wrongCorrelation: true }, { responseEnvironment: "PRODUCTION" },
    { rawBody: "<html>login</html>" }, { rawBody: new Array(32770).join("x") }].forEach(function (options) {
      assertEquals_("UNAVAILABLE", AKS_admin006D4Fixture_(options).runtime.readRecent({ limit: 5 }).status);
    });
}
function AKS_testAdmin006D4_isolatesFetchException_() {
  var result = AKS_admin006D4Fixture_({ fetchFailure: true }).runtime.readRecent({ limit: 5 });
  assertEquals_("UNAVAILABLE", result.status);
  assertEquals_(-1, JSON.stringify(result).indexOf("sensitive"));
}
function AKS_testAdmin006D4_enforcesResultLimitAndSeverity_() {
  var event = { severity: "INFO", message: "synthetic" };
  var fixture = AKS_admin006D4Fixture_({ events: [event, event, event, event, event, event] });
  assertEquals_("UNAVAILABLE", fixture.runtime.readRecent({ limit: 5 }).status);
  assertEquals_("UNAVAILABLE", AKS_admin006D4Fixture_().runtime.readRecent({ limit: 20, severity: "ERROR" }).status);
}
function AKS_testAdmin006D4_usesFreshIdentifiersAndTwoUuidNonce_() {
  var fixture = AKS_admin006D4Fixture_();
  fixture.runtime.readRecent({ limit: 5 }); fixture.runtime.readRecent({ limit: 5 });
  var a = fixture.calls.requests[0], b = fixture.calls.requests[1];
  assertEquals_(64, a.nonce.length);
  assertTrue_(a.requestId !== a.correlationId && a.requestId !== b.requestId &&
    a.correlationId !== b.correlationId && a.nonce !== b.nonce);
}
function AKS_testAdmin006D4_rejectsInvalidOrRepeatedUuid_() {
  ["not-an-uuid", "00000000-0000-4000-8000-000000000001"].forEach(function (uuid) {
    var fixture = AKS_admin006D4Fixture_({ uuidProvider: function () { return uuid; } });
    AKS_admin006D4AssertClosed_(fixture);
  });
}
function AKS_testAdmin006D4_rpcSetsServerLimits_() {
  var queries = [];
  var factory = function () { return { readRecent: function (query) {
    queries.push(query); return { status: "EMPTY", events: [] };
  } }; };
  AKS_handlePrivatePortalLogsRpc_({ view: "widget" }, factory);
  AKS_handlePrivatePortalLogsRpc_({ view: "page", severity: "WARN" }, factory);
  assertEquals_(5, queries[0].limit); assertEquals_(20, queries[1].limit);
  assertEquals_("WARN", queries[1].severity);
}
function AKS_testAdmin006D4_rpcRejectsBrowserControlFields_() {
  [{ view: "widget", limit: 20 }, { view: "page", cursor: "row:10" },
    { view: "page", actor: "owner" }, { view: "widget", severity: "INFO" },
    { view: "page", severity: "INVALID" }, {}, null].forEach(function (input) {
      var result = AKS_handlePrivatePortalLogsRpc_(input, function () { throw new Error("must not construct"); });
      assertEquals_("DENIED", result.status);
    });
}
function AKS_testAdmin006D4_shellNeverLoadsEvents_() {
  var fixture = AKS_admin006D4Fixture_();
  var model = AKS_privatePortalLogShell_(fixture.access, "widget", "https://example.test");
  assertEquals_("LOADING", model.status);
  assertEquals_(0, fixture.calls.fetches.length);
  assertEquals_(0, fixture.calls.reads.length);
  assertEquals_(0, model.events.length);
}
function AKS_testAdmin006D4_templateStatesAndClosedFilters_() {
  var model = AKS_privatePortalLogShell_(AKS_admin006D4Access_(), "page", "");
  var html = AKS_renderPrivatePortalLogContent_(model);
  assertTrue_(html.indexOf("500 dernières lignes") !== -1);
  assertTrue_(html.indexOf("historique non exhaustif") !== -1);
  assertTrue_(html.indexOf("Chargement") !== -1);
  assertEquals_(-1, html.indexOf('name="cursor"'));
  assertEquals_(-1, html.indexOf('name="category"'));
  assertEquals_(-1, html.indexOf('name="limit"'));
  var denied = AKS_renderPrivatePortalLogContent_(AKS_privatePortalLogShell_(null, "page", ""));
  assertTrue_(denied.indexOf("non autorisé") !== -1);
  assertEquals_(-1, denied.indexOf("data-private-retry"));
}
function AKS_testAdmin006D4_realAccessRejectsExpiredAndSuspended_() {
  var registry = AKS_access002ExplicitManagerRegistry_({ module: "ADMINISTRATION", extraCapabilities: ["LOG_READ"] });
  registry.schemaVersion = "access/1.2";
  var access = AKS_createAccessService_({ identityProvider: function () { return "manager@example.com"; },
    registryStore: { load: function () { return registry; } }, legacyAdminEmails: [],
    clock: function () { return new Date("2026-09-01T10:00:00Z"); } });
  assertEquals_("manager@example.com", AKS_authorizePrivatePortal_(access));
  registry.accounts[0].assignments[0].validUntil = "2026-08-31";
  assertThrows_(function () { AKS_authorizePrivatePortal_(access); });
  delete registry.accounts[0].assignments[0].validUntil;
  registry.accounts[0].status = "INACTIVE";
  assertThrows_(function () { AKS_authorizePrivatePortal_(access); });
}

function AKS_admin006D4TransportFixture_(responses) {
  var calls = [];
  return { calls: calls, transport: AKS_createPrivatePortalTransport_({
    endpoint: "https://script.google.com/macros/s/SYNTHETIC_D4_TEST_ENDPOINT/exec",
    guard: function () {}, fetcher: function (url, parameters) {
      calls.push({ url: url, parameters: parameters }); return responses[calls.length - 1];
    }
  }) };
}
function AKS_testAdmin006D4_transportUsesExactPostWithoutUserToken_() {
  var fixture = AKS_admin006D4TransportFixture_([AKS_admin006D4Response_(200, "{}")]);
  fixture.transport.send("{}");
  var parameters = fixture.calls[0].parameters;
  assertEquals_("post", parameters.method); assertEquals_(false, parameters.followRedirects);
  assertEquals_(true, parameters.validateHttpsCertificates);
  assertEquals_(undefined, parameters.timeout); assertEquals_(undefined, parameters.headers);
}
function AKS_testAdmin006D4_transportFollowsOnlyResponseGet_() {
  var url = "https://script.googleusercontent.com/macros/echo?user_content_key=test_key&lib=test_lib";
  var fixture = AKS_admin006D4TransportFixture_([
    AKS_admin006D4Response_(302, "", { Location: url }), AKS_admin006D4Response_(200, "{}")]);
  assertEquals_("{}", fixture.transport.send("signed-body"));
  assertEquals_(2, fixture.calls.length);
  assertEquals_("get", fixture.calls[1].parameters.method);
  assertEquals_(undefined, fixture.calls[1].parameters.payload);
  assertEquals_(undefined, fixture.calls[1].parameters.headers);
  assertEquals_(false, fixture.calls[1].parameters.followRedirects);
}
function AKS_testAdmin006D4_transportRejectsArbitraryRedirects_() {
  ["https://evil.invalid/", "https://script.googleusercontent.com.evil.invalid/macros/echo?user_content_key=x",
    "https://script.googleusercontent.com/macros/echo?user_content_key=x&url=https%3A%2F%2Fevil.invalid",
    "http://script.googleusercontent.com/macros/echo?user_content_key=x",
    "https://script.googleusercontent.com/macros/echo?user_content_key=x&user_content_key=y"].forEach(function (url) {
      var fixture = AKS_admin006D4TransportFixture_([AKS_admin006D4Response_(302, "", { Location: url })]);
      assertThrows_(function () { fixture.transport.send("{}"); }, "PRIVATE_BACKEND_UNAVAILABLE");
      assertEquals_(1, fixture.calls.length);
    });
}
function AKS_testAdmin006D4_transportRejectsHttpHtmlAndRedirectChains_() {
  [AKS_admin006D4Response_(500, "{}"), AKS_admin006D4Response_(307, "{}"),
    AKS_admin006D4Response_(200, "<html>", { "Content-Type": "text/html" })].forEach(function (response) {
      var fixture = AKS_admin006D4TransportFixture_([response]);
      assertThrows_(function () { fixture.transport.send("{}"); }, "PRIVATE_BACKEND_UNAVAILABLE");
    });
  var redirect = AKS_admin006D4Response_(302, "", { Location: "https://script.googleusercontent.com/macros/echo?user_content_key=x" });
  var chain = AKS_admin006D4TransportFixture_([redirect, redirect]);
  assertThrows_(function () { chain.transport.send("{}"); }, "PRIVATE_BACKEND_UNAVAILABLE");
  assertEquals_(2, chain.calls.length);
}
function AKS_testAdmin006D4_transportEnforcesUtf8ByteBounds_() {
  var fixture = AKS_admin006D4TransportFixture_([AKS_admin006D4Response_(200, "{}")]);
  assertThrows_(function () { fixture.transport.send(new Array(8194).join("é")); }, "PRIVATE_BACKEND_UNAVAILABLE");
  assertEquals_(0, fixture.calls.length);
  fixture = AKS_admin006D4TransportFixture_([AKS_admin006D4Response_(200, new Array(16386).join("é"))]);
  assertThrows_(function () { fixture.transport.send("{}"); }, "PRIVATE_BACKEND_UNAVAILABLE");
}

function AKS_admin006D4Window_(count, matching, limit) {
  var source = AKS_admin006D3ARuntimeFixture_();
  var rows = [source.logRows[0]];
  for (var index = 1; index <= count; index += 1) {
    var row = source.logRows[1].slice();
    row[4] = "row-" + index; row[5] = matching(index) ? "ERROR" : "INFO";
    rows.push(row);
  }
  var fixture = AKS_admin006D3ARuntimeFixture_({ logRows: rows, payload: { limit: limit, severity: "ERROR" } });
  return fixture.runtime.backend.process(JSON.stringify(fixture.request)).data.events;
}
function AKS_testAdmin006D4_windowIncludes499And500DataRows_() {
  [499, 500].forEach(function (count) {
    var events = AKS_admin006D4Window_(count, function (index) { return index === 1 || index === count; }, 20);
    assertEquals_(2, events.length);
    assertEquals_("row-" + count, events[0].correlationId);
    assertEquals_("row-1", events[1].correlationId);
  });
}
function AKS_testAdmin006D4_window501ExcludesOnlyOlderRow_() {
  var events = AKS_admin006D4Window_(501, function (index) { return index <= 2 || index === 501; }, 20);
  assertEquals_(2, events.length);
  assertEquals_("row-501", events[0].correlationId);
  assertEquals_("row-2", events[1].correlationId);
}
function AKS_testAdmin006D4_outsideMatchCanProduceEmptyResult_() {
  assertEquals_(0, AKS_admin006D4Window_(501, function (index) { return index === 1; }, 20).length);
}
function AKS_testAdmin006D4_filtersBeforeLimitingFiveAndTwenty_() {
  [5, 20].forEach(function (limit) {
    var events = AKS_admin006D4Window_(500, function (index) { return index <= 470; }, limit);
    assertEquals_(limit, events.length);
    assertEquals_("row-470", events[0].correlationId);
    assertEquals_("row-" + (471 - limit), events[limit - 1].correlationId);
  });
}

function AKS_admin006D4WithPortalRoutes_(recipe, access, callback) {
  var originalGuard = AKS_privatePortalIsRecipe_;
  var originalAccess = AKS_createAccessService_;
  var originalLegacy = AKS_createProductionAdminLogController_;
  var originalClient = AKS_createProductionPrivatePortalLogClient_;
  var legacyCalls = 0;
  try {
    AKS_privatePortalIsRecipe_ = function () { return recipe; };
    AKS_createAccessService_ = function () { return access; };
    AKS_createProductionPrivatePortalLogClient_ = function () {
      throw new Error("A shell must not build the private client");
    };
    AKS_createProductionAdminLogController_ = function () {
      legacyCalls += 1;
      if (recipe) throw new Error("Direct repository forbidden in recipe");
      return { getViewModel: function () { return { legacy: true }; },
        getDashboardModel: function () { return { legacy: true }; } };
    };
    callback(function () { return legacyCalls; });
  } finally {
    AKS_privatePortalIsRecipe_ = originalGuard;
    AKS_createAccessService_ = originalAccess;
    AKS_createProductionAdminLogController_ = originalLegacy;
    AKS_createProductionPrivatePortalLogClient_ = originalClient;
  }
}
function AKS_testAdmin006D4_recipePageAndGettersNeverUseDirectRepository_() {
  AKS_admin006D4WithPortalRoutes_(true, AKS_admin006D4Access_(), function (legacyCalls) {
    assertEquals_("LOADING", AKS.Admin.Logs.getViewModel({ cursor: "row:10" }).status);
    assertEquals_("LOADING", AKS.Admin.Logs.getDashboardModel().status);
    var html = doGet({ parameter: { app: "logs", actor: "ignored", severity: "ERROR" } }).getContent();
    assertTrue_(html.indexOf("data-private-filter") !== -1);
    assertTrue_(html.indexOf("500 dernières lignes") !== -1);
    assertEquals_(0, legacyCalls());
  });
}
function AKS_testAdmin006D4_recipeDashboardRendersBeforePrivateClient_() {
  AKS_admin006D4WithPortalRoutes_(true, AKS_admin006D4Access_(), function (legacyCalls) {
    var model = AKS.Admin.Dashboard.getViewModel();
    assertEquals_("LOADING", model.recentLogs.status);
    assertEquals_(true, model.recentLogs.privateAsync);
    assertTrue_(model.actions.some(function (entry) { return entry.id === "access.my-access"; }));
    assertEquals_(false, model.actions.some(function (entry) { return entry.id === "admin.config"; }));
    assertEquals_(0, legacyCalls());
  });
}
function AKS_testAdmin006D4_recipeWithoutLogReadDoesNotLoadWidget_() {
  AKS_admin006D4WithPortalRoutes_(true, AKS_admin006D4Access_({ noLogRead: true }), function (legacyCalls) {
    var model = AKS.Admin.Dashboard.getViewModel();
    assertEquals_(null, model.recentLogs);
    assertTrue_(model.actions.some(function (entry) { return entry.id === "admin.config"; }));
    assertEquals_(0, legacyCalls());
  });
}
function AKS_testAdmin006D4_unrelatedProjectPreservesLegacyGetters_() {
  AKS_admin006D4WithPortalRoutes_(false, AKS_admin006D4Access_(), function (legacyCalls) {
    assertTrue_(AKS.Admin.Logs.getViewModel({ limit: 100 }).legacy);
    assertTrue_(AKS.Admin.Logs.getDashboardModel().legacy);
    assertEquals_(2, legacyCalls());
  });
}
