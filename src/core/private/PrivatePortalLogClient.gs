var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * ADMIN-006 lot C — private portal LOG client.
 *
 * Identity, ACCESS, configuration, identifiers, clock and transport are
 * injected. The default adapters are inert: this component performs no
 * Google or network operation unless a later authorized operation connects
 * them explicitly.
 */
function AKS_createPrivatePortalLogClient_(dependencies) {
  dependencies = dependencies || {};

  var accessApi = dependencies.accessApi;
  var configuration = dependencies.configuration;
  var transport = dependencies.transport;
  var crypto = dependencies.crypto;
  var protocolFactory = dependencies.protocolFactory ||
    AKS_createPrivateProtocol_;
  var nowProvider = dependencies.nowProvider || function () {
    return new Date().getTime();
  };
  var identifierProvider = dependencies.identifierProvider;
  var byteLength = dependencies.byteLength || function (text) {
    return unescape(encodeURIComponent(String(text))).length;
  };

  function fail_(code, message) {
    var error = new Error(message);
    error.code = code;
    throw error;
  }

  function freeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    Object.keys(value).forEach(function (key) { freeze_(value[key]); });
    return Object.freeze(value);
  }

  function authorize_() {
    if (!accessApi ||
        typeof accessApi.assertAdministrationCapability !== "function" ||
        typeof accessApi.getCurrentIdentity !== "function") {
      fail_("PRIVATE_AUTH_REQUIRED", "Autorisation privée indisponible.");
    }
    accessApi.assertAdministrationCapability("LOG_READ");
    var identity = accessApi.getCurrentIdentity();
    var email = String(identity && identity.email || identity || "")
      .trim().toLowerCase();
    if (!email) {
      fail_("PRIVATE_AUTH_REQUIRED", "Identité privée indisponible.");
    }
    return email;
  }

  function disabled_(status) {
    return freeze_({
      status: status,
      available: false,
      events: [],
      nextCursor: null,
      correlationId: null
    });
  }

  function readConfiguration_() {
    if (!configuration || typeof configuration.get !== "function") {
      return null;
    }
    var value = configuration.get();
    if (!value || value.enabled !== true ||
        value.environment !== "RECETTE") {
      return null;
    }
    if (typeof value.callerProject !== "string" ||
        !value.callerProject.trim() ||
        typeof value.currentSecret !== "string" ||
        !value.currentSecret) {
      return null;
    }
    return {
      environment: "RECETTE",
      callerProject: value.callerProject.trim(),
      currentSecret: value.currentSecret
    };
  }

  function identifier_(kind) {
    if (!identifierProvider ||
        typeof identifierProvider.create !== "function") {
      fail_("PRIVATE_BACKEND_UNAVAILABLE", "Identifiants privés indisponibles.");
    }
    return String(identifierProvider.create(kind) || "");
  }

  function normalizeInput_(input) {
    input = input || {};
    var limit = Number(input.limit);
    if (!isFinite(limit) || limit % 1 !== 0) limit = 5;
    limit = Math.max(1, Math.min(20, limit));
    var result = { limit: limit };
    if (input.severity) result.severity = String(input.severity).toUpperCase();
    if (input.cursor) result.cursor = String(input.cursor);
    return result;
  }

  function normalizeData_(data, correlationId) {
    if (!data || !Array.isArray(data.events) || data.events.length > 20) {
      fail_("PRIVATE_BACKEND_UNAVAILABLE", "Réponse privée invalide.");
    }
    var events = data.events.map(function (event) {
      event = event || {};
      return {
        occurredAt: String(event.occurredAt || "").slice(0, 32),
        severity: String(event.severity || "").slice(0, 16),
        code: String(event.code || "").slice(0, 64),
        message: String(event.message || "").slice(0, 500),
        correlationId: String(event.correlationId || "").slice(0, 128)
      };
    });
    return freeze_({
      status: events.length ? "AVAILABLE" : "EMPTY",
      available: true,
      events: events,
      nextCursor: data.nextCursor ? String(data.nextCursor).slice(0, 128) : null,
      correlationId: correlationId
    });
  }

  function readRecent(input) {
    var actor = authorize_();
    var config;
    try {
      config = readConfiguration_();
    } catch (configurationFailure) {
      return disabled_("UNAVAILABLE");
    }
    if (!config) return disabled_("DISABLED");
    if (!transport || typeof transport.send !== "function") {
      return disabled_("DISABLED");
    }

    try {
      var nowMs = Number(nowProvider());
      if (!isFinite(nowMs)) {
        fail_("PRIVATE_BACKEND_UNAVAILABLE", "Horloge privée indisponible.");
      }
      var requestId = identifier_("request");
      var correlationId = identifier_("correlation");
      var request = protocolFactory({ crypto: crypto }).createSignedRequest({
        environment: config.environment,
        callerProject: config.callerProject,
        actor: actor,
        requestId: requestId,
        correlationId: correlationId,
        issuedAt: new Date(nowMs).toISOString(),
        expiresAt: new Date(nowMs + 60000).toISOString(),
        nonce: identifier_("nonce"),
        payload: normalizeInput_(input)
      }, config.currentSecret);
      var rawResponse = transport.send(JSON.stringify(request), freeze_({
        environment: config.environment,
        requestId: requestId,
        correlationId: correlationId
      }));
      if (typeof rawResponse === "string") {
        if (!rawResponse || byteLength(rawResponse) > 32768) {
          fail_("PRIVATE_BACKEND_UNAVAILABLE", "Réponse privée invalide.");
        }
        rawResponse = JSON.parse(rawResponse);
      }
      var response = protocolFactory({ crypto: crypto })
        .validateSignedResponse(rawResponse, config.currentSecret, {
          environment: config.environment,
          requestId: requestId,
          correlationId: correlationId
        });
      if (response.status !== "OK") return disabled_("UNAVAILABLE");
      return normalizeData_(response.data, correlationId);
    } catch (privateFailure) {
      return disabled_("UNAVAILABLE");
    }
  }

  return Object.freeze({
    readRecent: readRecent,
    enabledByDefault: false,
    command: "LOG_READ_RECENT_V1"
  });
}

function AKS_createInertPrivatePortalAdapters_() {
  function disabledConfiguration_() {
    return Object.freeze({ enabled: false, environment: "RECETTE" });
  }
  function unavailableTransport_() {
    var error = new Error("Transport privé inactif.");
    error.code = "PRIVATE_BACKEND_UNAVAILABLE";
    throw error;
  }
  return Object.freeze({
    configuration: Object.freeze({ get: disabledConfiguration_ }),
    transport: Object.freeze({ send: unavailableTransport_ })
  });
}

function AKS_createPrivatePortalLogDashboardModel_(client, logsTarget) {
  var result = client.readRecent({ limit: 5 });
  var labels = {
    DEBUG: "Diagnostic", INFO: "Information", WARN: "Avertissement",
    ERROR: "Erreur", CRITICAL: "Critique"
  };
  return Object.freeze({
    status: result.status,
    available: result.available,
    navigation: Object.freeze({ logsTarget: logsTarget }),
    events: Object.freeze(result.events.map(function (event) {
      var timestamp = event.occurredAt;
      var date = new Date(timestamp);
      return Object.freeze({
        timestamp: timestamp,
        timestampLabel: isNaN(date.getTime()) ? timestamp :
          Utilities.formatDate(date, "Europe/Paris", "dd/MM/yyyy HH:mm"),
        level: event.severity,
        levelLabel: labels[event.severity] || event.severity,
        message: event.message,
        correlationId: event.correlationId
      });
    }))
  });
}

function AKS_createProductionPrivatePortalLogClient_() {
  var inert = AKS_createInertPrivatePortalAdapters_();
  return AKS_createPrivatePortalLogClient_({
    accessApi: AKS_createAccessService_(),
    configuration: inert.configuration,
    transport: inert.transport
  });
}

AKS.Core.PrivatePortalLogClient = Object.freeze({
  create: AKS_createPrivatePortalLogClient_,
  createInertAdapters: AKS_createInertPrivatePortalAdapters_,
  createDashboardModel: AKS_createPrivatePortalLogDashboardModel_
});
