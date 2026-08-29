var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * ADMIN-006 lot B — inactive private backend orchestration.
 * No HTTP entry point is exported. Configuration, LOG and proof ports are
 * injected and must be explicitly enabled by a future authorized operation.
 */
function AKS_createPrivateBackend_(dependencies) {
  dependencies = dependencies || {};

  var configuration = dependencies.configuration;
  var replayGuard = dependencies.replayGuard;
  var logReader = dependencies.logReader;
  var proofWriter = dependencies.proofWriter;
  var crypto = dependencies.crypto;
  var nowProvider = dependencies.nowProvider || function () {
    return new Date().getTime();
  };
  var protocolFactory = dependencies.protocolFactory ||
    AKS_createPrivateProtocol_;
  var byteLength = dependencies.byteLength || function (text) {
    return unescape(encodeURIComponent(String(text))).length;
  };

  function fail_(code, message) {
    var error = new Error(message);
    error.code = code;
    throw error;
  }

  function requirePort_(port, method, label) {
    if (!port || typeof port[method] !== "function") {
      fail_("PRIVATE_BACKEND_UNAVAILABLE", label + " indisponible.");
    }
  }

  function readConfiguration_() {
    requirePort_(configuration, "get", "Configuration privée");
    var config = configuration.get();
    if (!config || config.enabled !== true ||
        config.environment !== "RECETTE") {
      fail_("PRIVATE_BACKEND_UNAVAILABLE", "Backend privé indisponible.");
    }
    if (typeof config.callerProject !== "string" ||
        config.callerProject.trim() === "" ||
        typeof config.currentSecret !== "string" ||
        config.currentSecret === "") {
      fail_("PRIVATE_BACKEND_UNAVAILABLE", "Backend privé indisponible.");
    }
    return {
      enabled: true,
      environment: "RECETTE",
      callerProject: config.callerProject.trim(),
      currentSecret: config.currentSecret,
      previousSecret: typeof config.previousSecret === "string" &&
        config.previousSecret !== "" ? config.previousSecret : null,
      backendVersion: typeof config.backendVersion === "string" ?
        config.backendVersion : "ADMIN-006-B"
    };
  }

  function parseRequest_(rawBody) {
    if (typeof rawBody !== "string" || rawBody === "" ||
        byteLength(rawBody) > 16384) {
      fail_("PRIVATE_REQUEST_INVALID", "Requête privée invalide.");
    }
    try {
      return JSON.parse(rawBody);
    } catch (error) {
      fail_("PRIVATE_REQUEST_INVALID", "Requête privée invalide.");
    }
  }

  function createProtocol_() {
    if (!replayGuard || typeof replayGuard.consume !== "function") {
      fail_("PRIVATE_BACKEND_UNAVAILABLE", "Backend privé indisponible.");
    }
    return protocolFactory({
      crypto: crypto,
      nowProvider: nowProvider,
      replayGuard: replayGuard
    });
  }

  function validateWithRotation_(protocol, request, config) {
    var expected = {
      environment: config.environment,
      callerProject: config.callerProject
    };
    try {
      return {
        request: protocol.validateSignedRequest(
          request,
          config.currentSecret,
          expected
        ),
        secret: config.currentSecret
      };
    } catch (error) {
      if (!config.previousSecret ||
          !error || error.code !== "PRIVATE_ACCESS_DENIED") {
        throw error;
      }
      return {
        request: protocol.validateSignedRequest(
          request,
          config.previousSecret,
          expected
        ),
        secret: config.previousSecret
      };
    }
  }

  function text_(value, maximum) {
    if (typeof value === "undefined" || value === null) return null;
    var normalized = String(value);
    return normalized.length <= maximum ?
      normalized : normalized.substring(0, maximum);
  }

  function minimizeEvent_(event) {
    event = event || {};
    var minimized = {
      occurredAt: text_(
        typeof event.occurredAt === "undefined" ?
          event.timestamp : event.occurredAt,
        32
      ),
      severity: text_(event.severity, 16),
      code: text_(event.code, 64),
      message: text_(event.message, 500),
      correlationId: text_(event.correlationId, 128)
    };
    Object.keys(minimized).forEach(function (key) {
      if (minimized[key] === null) delete minimized[key];
    });
    return Object.freeze(minimized);
  }

  function readMinimized_(payload) {
    requirePort_(logReader, "readRecent", "Dépôt LOG privé");
    var result = logReader.readRecent({
      limit: payload.limit,
      severity: payload.severity,
      cursor: payload.cursor
    });
    if (!result || !Array.isArray(result.events)) {
      fail_("PRIVATE_OPERATION_FAILED", "Lecture LOG privée impossible.");
    }
    var events = result.events.slice(0, payload.limit).map(minimizeEvent_);
    return Object.freeze({
      events: Object.freeze(events),
      nextCursor: text_(result.nextCursor, 128)
    });
  }

  function writeProof_(request, result, startedAtMs, config) {
    requirePort_(proofWriter, "write", "Preuve privée");
    proofWriter.write(Object.freeze({
      environment: config.environment,
      command: request.command,
      actorHash: String(crypto.sha256Hex(request.actor)).toLowerCase(),
      requestId: request.requestId,
      correlationId: request.correlationId,
      result: "OK",
      durationMs: Math.max(0, Number(nowProvider()) - startedAtMs),
      returnedCount: result.events.length,
      backendVersion: config.backendVersion
    }));
  }

  function process(rawBody) {
    var startedAtMs = Number(nowProvider());
    var config = readConfiguration_();
    var protocol = createProtocol_();
    var request = parseRequest_(rawBody);
    var validated = validateWithRotation_(protocol, request, config);
    var data = readMinimized_(validated.request.payload);
    writeProof_(validated.request, data, startedAtMs, config);

    return protocol.createSignedResponse({
      environment: config.environment,
      requestId: validated.request.requestId,
      correlationId: validated.request.correlationId,
      respondedAt: new Date(Number(nowProvider())).toISOString(),
      status: "OK",
      data: data
    }, validated.secret);
  }

  return Object.freeze({
    process: process,
    enabledByDefault: false,
    command: "LOG_READ_RECENT_V1"
  });
}

/**
 * Inert ports used until a future operation explicitly connects resources.
 */
function AKS_createInertPrivateBackendPorts_() {
  function unavailable_() {
    var error = new Error("Adaptateur privé inactif.");
    error.code = "PRIVATE_BACKEND_UNAVAILABLE";
    throw error;
  }

  return Object.freeze({
    configuration: Object.freeze({ get: unavailable_ }),
    logReader: Object.freeze({ readRecent: unavailable_ }),
    proofWriter: Object.freeze({ write: unavailable_ })
  });
}

AKS.Core.PrivateBackend = Object.freeze({
  create: AKS_createPrivateBackend_,
  createInertPorts: AKS_createInertPrivateBackendPorts_
});
