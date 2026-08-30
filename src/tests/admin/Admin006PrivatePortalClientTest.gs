function AKS_admin006LotCCryptoFixture_() {
  return {
    sha256Hex: function (text) { return "sha256:" + String(text); },
    hmacSha256Base64: function (text, secret) {
      return "hmac:" + String(secret) + ":" + String(text);
    }
  };
}

function AKS_admin006LotCFixture_(options) {
  options = options || {};
  var calls = { access: 0, identity: 0, configuration: 0, transport: 0 };
  var identifiers = options.identifiers || [
    "request-001", "correlation-001",
    "0123456789abcdef0123456789abcdef"
  ];
  var identifierIndex = 0;
  var crypto = AKS_admin006LotCCryptoFixture_();
  var protocol = AKS_createPrivateProtocol_({ crypto: crypto });
  var client = AKS_createPrivatePortalLogClient_({
    crypto: crypto,
    nowProvider: function () {
      return new Date("2026-08-30T08:00:00.000Z").getTime();
    },
    identifierProvider: {
      create: function () { return identifiers[identifierIndex++]; }
    },
    accessApi: {
      assertAdministrationCapability: function (capability) {
        calls.access += 1;
        if (options.denied) {
          var error = new Error("refus");
          error.code = "ACCESS_CAPABILITY_REQUIRED";
          throw error;
        }
        assertEquals_("LOG_READ", capability);
      },
      getCurrentIdentity: function () {
        calls.identity += 1;
        return { email: Object.prototype.hasOwnProperty.call(options, "email")
          ? options.email : " Reader@Example.com " };
      }
    },
    configuration: {
      get: function () {
        calls.configuration += 1;
        if (options.configurationFailure) throw new Error("configuration");
        return {
          enabled: options.enabled === true,
          environment: options.environment || "RECETTE",
          callerProject: "AKS-PORTAL-RECETTE",
          currentSecret: "recipe-secret"
        };
      }
    },
    transport: {
      send: function (rawBody, context) {
        calls.transport += 1;
        if (options.transportFailure) throw new Error("network");
        var request = JSON.parse(rawBody);
        assertEquals_("reader@example.com", request.actor);
        assertTrue_(typeof context.currentSecret === "undefined");
        var response = protocol.createSignedResponse({
          environment: "RECETTE",
          requestId: request.requestId,
          correlationId: request.correlationId,
          respondedAt: "2026-08-30T08:00:01.000Z",
          status: options.responseStatus || "OK",
          data: options.data || {
            events: [{
              occurredAt: "2026-08-30T07:59:00.000Z",
              severity: "WARN",
              code: "LOG_TEST",
              message: "Événement visible",
              correlationId: "event-001",
              forbidden: "secret"
            }],
            nextCursor: "cursor-002"
          }
        }, "recipe-secret");
        if (options.alteredResponse) response = JSON.parse(JSON.stringify(response));
        if (options.alteredResponse) response.data.events[0].message = "altéré";
        return JSON.stringify(response);
      }
    }
  });
  return { client: client, calls: calls };
}

function AKS_testAdmin006LotC_clientIsInactiveByDefault_() {
  var client = AKS_createPrivatePortalLogClient_({});
  assertTrue_(!client.enabledByDefault);
  assertEquals_("LOG_READ_RECENT_V1", client.command);
  assertTrue_(Object.isFrozen(client));
}

function AKS_testAdmin006LotC_checksLogReadBeforeConfiguration_() {
  var fixture = AKS_admin006LotCFixture_({ denied: true, enabled: true });
  assertThrows_(function () {
    fixture.client.readRecent({ limit: 5 });
  }, "ACCESS_CAPABILITY_REQUIRED");
  assertEquals_(0, fixture.calls.configuration);
  assertEquals_(0, fixture.calls.transport);
}

function AKS_testAdmin006LotC_requiresServerIdentityBeforeTransport_() {
  var fixture = AKS_admin006LotCFixture_({
    enabled: true,
    email: ""
  });
  assertThrows_(function () {
    fixture.client.readRecent({ limit: 5 });
  }, "PRIVATE_AUTH_REQUIRED");
  assertEquals_(0, fixture.calls.configuration);
  assertEquals_(0, fixture.calls.transport);
}

function AKS_testAdmin006LotC_disabledConfigurationDoesNotCallTransport_() {
  var fixture = AKS_admin006LotCFixture_({ enabled: false });
  var result = fixture.client.readRecent({ limit: 5 });
  assertEquals_("DISABLED", result.status);
  assertTrue_(!result.available);
  assertEquals_(0, fixture.calls.transport);
}

function AKS_testAdmin006LotC_configurationFailureIsIsolated_() {
  var fixture = AKS_admin006LotCFixture_({
    enabled: true,
    configurationFailure: true
  });
  var result = fixture.client.readRecent({ limit: 5 });
  assertEquals_("UNAVAILABLE", result.status);
  assertEquals_(0, fixture.calls.transport);
}

function AKS_testAdmin006LotC_createsAndValidatesSignedExchange_() {
  var fixture = AKS_admin006LotCFixture_({ enabled: true });
  var result = fixture.client.readRecent({ limit: 5 });
  assertEquals_("AVAILABLE", result.status);
  assertEquals_(1, result.events.length);
  assertEquals_("Événement visible", result.events[0].message);
  assertTrue_(typeof result.events[0].forbidden === "undefined");
  assertEquals_("correlation-001", result.correlationId);
  assertTrue_(Object.isFrozen(result));
  assertTrue_(Object.isFrozen(result.events));
}

function AKS_testAdmin006LotC_emptyResponseHasClosedState_() {
  var fixture = AKS_admin006LotCFixture_({
    enabled: true,
    data: { events: [], nextCursor: null }
  });
  var result = fixture.client.readRecent({ limit: 5 });
  assertEquals_("EMPTY", result.status);
  assertTrue_(result.available);
}

function AKS_testAdmin006LotC_alteredResponseIsUnavailable_() {
  var fixture = AKS_admin006LotCFixture_({
    enabled: true,
    alteredResponse: true
  });
  var result = fixture.client.readRecent({ limit: 5 });
  assertEquals_("UNAVAILABLE", result.status);
  assertEquals_(0, result.events.length);
}

function AKS_testAdmin006LotC_transportFailureIsUnavailable_() {
  var fixture = AKS_admin006LotCFixture_({
    enabled: true,
    transportFailure: true
  });
  var result = fixture.client.readRecent({ limit: 5 });
  assertEquals_("UNAVAILABLE", result.status);
  assertEquals_(1, fixture.calls.transport);
}

function AKS_testAdmin006LotC_backendErrorIsUnavailable_() {
  var fixture = AKS_admin006LotCFixture_({
    enabled: true,
    responseStatus: "ERROR",
    data: { events: [] }
  });
  assertEquals_(
    "UNAVAILABLE",
    fixture.client.readRecent({ limit: 5 }).status
  );
}

function AKS_testAdmin006LotC_retryUsesFreshIdentifiers_() {
  var fixture = AKS_admin006LotCFixture_({
    enabled: true,
    identifiers: [
      "request-001", "correlation-001",
      "0123456789abcdef0123456789abcdef",
      "request-002", "correlation-002",
      "fedcba9876543210fedcba9876543210"
    ]
  });
  var first = fixture.client.readRecent({ limit: 5 });
  var second = fixture.client.readRecent({ limit: 5 });
  assertEquals_("correlation-001", first.correlationId);
  assertEquals_("correlation-002", second.correlationId);
  assertEquals_(2, fixture.calls.transport);
}

function AKS_testAdmin006LotC_inertAdaptersNeverExposeTransport_() {
  var inert = AKS_createInertPrivatePortalAdapters_();
  assertTrue_(inert.configuration.get().enabled === false);
  assertThrows_(function () {
    inert.transport.send("{}");
  }, "PRIVATE_BACKEND_UNAVAILABLE");
  assertTrue_(Object.isFrozen(inert));
}

function AKS_testAdmin006LotC_dashboardModelPreservesDegradedState_() {
  var model = AKS_createPrivatePortalLogDashboardModel_({
    readRecent: function () {
      return {
        status: "UNAVAILABLE",
        available: false,
        events: []
      };
    }
  }, "https://example.test/exec?app=logs");
  assertEquals_("UNAVAILABLE", model.status);
  assertTrue_(!model.available);
  assertEquals_(0, model.events.length);
  assertTrue_(Object.isFrozen(model));
}

function AKS_testAdmin006LotC_dashboardSourceContainsNoBlockingLogRepository_() {
  var source = AKS.Admin.Dashboard.getViewModel.toString();
  assertTrue_(source.indexOf("PrivatePortalLogClient") !== -1);
  assertTrue_(source.indexOf("LogEventRepository") === -1);
  assertTrue_(source.indexOf("UrlFetchApp") === -1);
}

function AKS_testAdmin006LotC_dashboardTemplateExposesRetryState_() {
  var source = AKS_getAdminDashboardTemplateSource_("ui/admin/Dashboard");
  assertTrue_(source.indexOf("Journaux temporairement indisponibles") !== -1);
  assertTrue_(source.indexOf("Réessayer") !== -1);
}
