var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * ADMIN-006 lot A — pure AKS-PRIVATE/1 protocol contracts.
 * Cryptography, clock and replay protection are injected.
 */
function AKS_createPrivateProtocol_(dependencies) {
  dependencies = dependencies || {};

  var PROTOCOL = "AKS-PRIVATE/1";
  var COMMAND = "LOG_READ_RECENT_V1";
  var MAX_REQUEST_AGE_MS = 60000;
  var CLOCK_SKEW_MS = 30000;
  var MAX_BODY_BYTES = 16384;
  var MAX_LIMIT = 20;
  var ALLOWED_SEVERITIES = Object.freeze([
    "DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"
  ]);
  var crypto = dependencies.crypto || AKS_createAppsScriptPrivateCrypto_();
  var nowProvider = dependencies.nowProvider || function () {
    return new Date().getTime();
  };
  var replayGuard = dependencies.replayGuard || null;

  function fail_(code, message) {
    var error = new Error(message);
    error.code = code;
    throw error;
  }

  function isPlainObject_(value) {
    return !!value &&
      Object.prototype.toString.call(value) === "[object Object]";
  }

  function requireString_(value, field, maximum) {
    if (typeof value !== "string" || value.trim() === "") {
      fail_("PRIVATE_REQUEST_INVALID", field + " est obligatoire.");
    }
    var normalized = value.trim();
    if (normalized.length > maximum) {
      fail_("PRIVATE_REQUEST_INVALID", field + " dépasse la taille autorisée.");
    }
    return normalized;
  }

  function normalizeActor_(actor) {
    var normalized = requireString_(actor, "actor", 254).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
      fail_("PRIVATE_REQUEST_INVALID", "actor est invalide.");
    }
    return normalized;
  }

  function canonicalize_(value, path, seen) {
    var type = typeof value;
    if (value === null) return "null";
    if (type === "string" || type === "boolean") return JSON.stringify(value);
    if (type === "number") {
      if (!isFinite(value)) {
        fail_("PRIVATE_REQUEST_INVALID", path + " contient un nombre invalide.");
      }
      return JSON.stringify(value);
    }
    if (type === "undefined" || type === "function" || type === "symbol") {
      fail_("PRIVATE_REQUEST_INVALID", path + " contient un type interdit.");
    }
    if (!Array.isArray(value) && !isPlainObject_(value)) {
      fail_("PRIVATE_REQUEST_INVALID", path + " contient un objet interdit.");
    }
    if (seen.indexOf(value) !== -1) {
      fail_("PRIVATE_REQUEST_INVALID", path + " contient une référence circulaire.");
    }

    seen.push(value);
    var result;
    if (Array.isArray(value)) {
      result = "[" + value.map(function (item, index) {
        return canonicalize_(item, path + "[" + index + "]", seen);
      }).join(",") + "]";
    } else {
      result = "{" + Object.keys(value).sort().map(function (key) {
        if (typeof value[key] === "undefined") {
          fail_("PRIVATE_REQUEST_INVALID", path + "." + key + " est indéfini.");
        }
        return JSON.stringify(key) + ":" +
          canonicalize_(value[key], path + "." + key, seen);
      }).join(",") + "}";
    }
    seen.pop();
    return result;
  }

  function canonicalize(value) {
    return canonicalize_(value, "value", []);
  }

  function sha256Hex_(text) {
    if (!crypto || typeof crypto.sha256Hex !== "function") {
      fail_("PRIVATE_OPERATION_FAILED", "Adaptateur SHA-256 indisponible.");
    }
    return String(crypto.sha256Hex(String(text))).toLowerCase();
  }

  function hmacBase64_(text, secret) {
    if (!crypto || typeof crypto.hmacSha256Base64 !== "function") {
      fail_("PRIVATE_OPERATION_FAILED", "Adaptateur HMAC indisponible.");
    }
    return String(crypto.hmacSha256Base64(String(text), String(secret)));
  }

  function timingSafeEqual_(left, right) {
    left = String(left);
    right = String(right);
    var difference = left.length ^ right.length;
    var length = Math.max(left.length, right.length);
    for (var index = 0; index < length; index += 1) {
      difference |=
        (index < left.length ? left.charCodeAt(index) : 0) ^
        (index < right.length ? right.charCodeAt(index) : 0);
    }
    return difference === 0;
  }

  function validateIdentifier_(value, field) {
    value = requireString_(value, field, 128);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) {
      fail_("PRIVATE_REQUEST_INVALID", field + " est invalide.");
    }
    return value;
  }

  function validateIsoDate_(value, field) {
    value = requireString_(value, field, 32);
    var parsed = new Date(value);
    if (!isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
      fail_("PRIVATE_REQUEST_INVALID", field + " doit être une date ISO UTC.");
    }
    return parsed.getTime();
  }

  function validatePayload_(payload) {
    if (!isPlainObject_(payload)) {
      fail_("PRIVATE_REQUEST_INVALID", "payload doit être un objet.");
    }
    Object.keys(payload).forEach(function (key) {
      if (["limit", "severity", "cursor"].indexOf(key) === -1) {
        fail_("PRIVATE_REQUEST_INVALID", "Champ payload inconnu : " + key);
      }
    });
    var limit = typeof payload.limit === "undefined" ? 5 : payload.limit;
    if (typeof limit !== "number" || limit % 1 !== 0 ||
        limit < 1 || limit > MAX_LIMIT) {
      fail_("PRIVATE_REQUEST_INVALID", "payload.limit doit être entre 1 et 20.");
    }

    var normalized = { limit: limit };
    if (typeof payload.severity !== "undefined") {
      var severity = requireString_(payload.severity, "payload.severity", 16)
        .toUpperCase();
      if (ALLOWED_SEVERITIES.indexOf(severity) === -1) {
        fail_("PRIVATE_REQUEST_INVALID", "payload.severity est inconnue.");
      }
      normalized.severity = severity;
    }
    if (typeof payload.cursor !== "undefined") {
      normalized.cursor = validateIdentifier_(
        payload.cursor,
        "payload.cursor"
      );
    }
    return Object.freeze(normalized);
  }

  function signingMaterial_(request) {
    return canonicalize({
      actor: request.actor,
      callerProject: request.callerProject,
      command: request.command,
      correlationId: request.correlationId,
      environment: request.environment,
      expiresAt: request.expiresAt,
      issuedAt: request.issuedAt,
      nonce: request.nonce,
      payloadHash: request.payloadHash,
      protocol: request.protocol,
      requestId: request.requestId
    });
  }

  function validateCommonRequest_(request, expected) {
    if (!isPlainObject_(request)) {
      fail_("PRIVATE_REQUEST_INVALID", "La requête doit être un objet.");
    }
    if (canonicalize(request).length > MAX_BODY_BYTES) {
      fail_("PRIVATE_REQUEST_INVALID", "La requête dépasse la taille autorisée.");
    }
    var protocol = requireString_(request.protocol, "protocol", 32);
    if (protocol !== PROTOCOL) {
      fail_("PRIVATE_REQUEST_INVALID", "Version de protocole non supportée.");
    }
    var environment = validateIdentifier_(request.environment, "environment");
    var callerProject = validateIdentifier_(
      request.callerProject,
      "callerProject"
    );
    if (expected && environment !== expected.environment) {
      fail_("PRIVATE_ACCESS_DENIED", "Appel privé refusé.");
    }
    if (expected && callerProject !== expected.callerProject) {
      fail_("PRIVATE_ACCESS_DENIED", "Appel privé refusé.");
    }
    var command = requireString_(request.command, "command", 64);
    if (command !== COMMAND) {
      fail_("PRIVATE_REQUEST_INVALID", "Commande privée non supportée.");
    }
    return {
      protocol: protocol,
      environment: environment,
      callerProject: callerProject,
      command: command,
      actor: normalizeActor_(request.actor),
      requestId: validateIdentifier_(request.requestId, "requestId"),
      correlationId: validateIdentifier_(
        request.correlationId,
        "correlationId"
      ),
      issuedAt: requireString_(request.issuedAt, "issuedAt", 32),
      expiresAt: requireString_(request.expiresAt, "expiresAt", 32),
      nonce: validateIdentifier_(request.nonce, "nonce"),
      payload: validatePayload_(request.payload)
    };
  }

  function validateWindow_(issuedAt, expiresAt, nowMs) {
    var issuedAtMs = validateIsoDate_(issuedAt, "issuedAt");
    var expiresAtMs = validateIsoDate_(expiresAt, "expiresAt");
    if (expiresAtMs <= issuedAtMs ||
        expiresAtMs - issuedAtMs > MAX_REQUEST_AGE_MS) {
      fail_("PRIVATE_REQUEST_INVALID", "Fenêtre temporelle invalide.");
    }
    if (typeof nowMs !== "undefined" &&
        (issuedAtMs > nowMs + CLOCK_SKEW_MS || expiresAtMs < nowMs)) {
      fail_("PRIVATE_REQUEST_EXPIRED", "Requête privée expirée.");
    }
    return expiresAtMs;
  }

  function createSignedRequest(input, secret) {
    input = input || {};
    secret = requireString_(secret, "secret", 4096);
    var normalized = validateCommonRequest_({
      protocol: PROTOCOL,
      environment: input.environment,
      callerProject: input.callerProject,
      command: COMMAND,
      actor: input.actor,
      requestId: input.requestId,
      correlationId: input.correlationId,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
      nonce: input.nonce,
      payload: input.payload || {}
    });
    validateWindow_(normalized.issuedAt, normalized.expiresAt);

    var request = {
      protocol: normalized.protocol,
      environment: normalized.environment,
      callerProject: normalized.callerProject,
      command: normalized.command,
      actor: normalized.actor,
      requestId: normalized.requestId,
      correlationId: normalized.correlationId,
      issuedAt: normalized.issuedAt,
      expiresAt: normalized.expiresAt,
      nonce: normalized.nonce,
      payloadHash: sha256Hex_(canonicalize(normalized.payload)),
      payload: normalized.payload
    };
    request.signature = hmacBase64_(signingMaterial_(request), secret);
    return Object.freeze(request);
  }

  function validateSignedRequest(request, secret, expected) {
    secret = requireString_(secret, "secret", 4096);
    var normalized = validateCommonRequest_(request, expected);
    var nowMs = Number(nowProvider());
    if (!isFinite(nowMs)) {
      fail_("PRIVATE_OPERATION_FAILED", "Horloge privée indisponible.");
    }
    var expiresAtMs = validateWindow_(
      normalized.issuedAt,
      normalized.expiresAt,
      nowMs
    );
    var expectedPayloadHash = sha256Hex_(canonicalize(normalized.payload));
    if (!timingSafeEqual_(request.payloadHash, expectedPayloadHash)) {
      fail_("PRIVATE_REQUEST_INVALID", "Empreinte du payload invalide.");
    }
    var expectedSignature = hmacBase64_(signingMaterial_({
      protocol: normalized.protocol,
      environment: normalized.environment,
      callerProject: normalized.callerProject,
      command: normalized.command,
      actor: normalized.actor,
      requestId: normalized.requestId,
      correlationId: normalized.correlationId,
      issuedAt: normalized.issuedAt,
      expiresAt: normalized.expiresAt,
      nonce: normalized.nonce,
      payloadHash: expectedPayloadHash
    }), secret);
    if (!timingSafeEqual_(
      requireString_(request.signature, "signature", 512),
      expectedSignature
    )) {
      fail_("PRIVATE_ACCESS_DENIED", "Appel privé refusé.");
    }
    if (!replayGuard || typeof replayGuard.consume !== "function") {
      fail_("PRIVATE_OPERATION_FAILED", "Protection anti-rejeu indisponible.");
    }
    if (!replayGuard.consume(
      normalized.requestId,
      normalized.nonce,
      expiresAtMs
    )) {
      fail_("PRIVATE_REPLAY_REJECTED", "Requête privée déjà consommée.");
    }
    return Object.freeze({
      protocol: normalized.protocol,
      environment: normalized.environment,
      callerProject: normalized.callerProject,
      command: normalized.command,
      actor: normalized.actor,
      requestId: normalized.requestId,
      correlationId: normalized.correlationId,
      issuedAt: normalized.issuedAt,
      expiresAt: normalized.expiresAt,
      nonce: normalized.nonce,
      payloadHash: expectedPayloadHash,
      payload: normalized.payload
    });
  }

  function responseSigningMaterial_(response) {
    return canonicalize({
      correlationId: response.correlationId,
      dataHash: response.dataHash,
      environment: response.environment,
      protocol: response.protocol,
      requestId: response.requestId,
      respondedAt: response.respondedAt,
      status: response.status
    });
  }

  function createSignedResponse(input, secret) {
    input = input || {};
    secret = requireString_(secret, "secret", 4096);
    var status = requireString_(input.status, "status", 32);
    if (["OK", "ERROR"].indexOf(status) === -1) {
      fail_("PRIVATE_REQUEST_INVALID", "Statut de réponse invalide.");
    }
    var response = {
      protocol: PROTOCOL,
      environment: validateIdentifier_(input.environment, "environment"),
      requestId: validateIdentifier_(input.requestId, "requestId"),
      correlationId: validateIdentifier_(
        input.correlationId,
        "correlationId"
      ),
      respondedAt: requireString_(input.respondedAt, "respondedAt", 32),
      status: status,
      dataHash: sha256Hex_(canonicalize(
        typeof input.data === "undefined" ? null : input.data
      )),
      data: typeof input.data === "undefined" ? null : input.data
    };
    validateIsoDate_(response.respondedAt, "respondedAt");
    response.signature = hmacBase64_(
      responseSigningMaterial_(response),
      secret
    );
    return Object.freeze(response);
  }

  function validateSignedResponse(response, secret, expected) {
    if (!isPlainObject_(response)) {
      fail_("PRIVATE_BACKEND_UNAVAILABLE", "Réponse privée invalide.");
    }
    secret = requireString_(secret, "secret", 4096);
    try {
      if (response.protocol !== PROTOCOL ||
          response.environment !== expected.environment ||
          response.requestId !== expected.requestId ||
          response.correlationId !== expected.correlationId) {
        fail_("PRIVATE_BACKEND_UNAVAILABLE", "Réponse privée non corrélée.");
      }
      validateIsoDate_(response.respondedAt, "respondedAt");
      if (["OK", "ERROR"].indexOf(response.status) === -1) {
        fail_("PRIVATE_BACKEND_UNAVAILABLE", "Statut privé invalide.");
      }
      var dataHash = sha256Hex_(canonicalize(response.data));
      if (!timingSafeEqual_(response.dataHash, dataHash)) {
        fail_("PRIVATE_BACKEND_UNAVAILABLE", "Réponse privée altérée.");
      }
      var expectedSignature = hmacBase64_(
        responseSigningMaterial_({
          protocol: response.protocol,
          environment: response.environment,
          requestId: response.requestId,
          correlationId: response.correlationId,
          respondedAt: response.respondedAt,
          status: response.status,
          dataHash: dataHash
        }),
        secret
      );
      if (!timingSafeEqual_(response.signature, expectedSignature)) {
        fail_("PRIVATE_BACKEND_UNAVAILABLE", "Réponse privée altérée.");
      }
    } catch (error) {
      if (error && error.code === "PRIVATE_BACKEND_UNAVAILABLE") throw error;
      fail_("PRIVATE_BACKEND_UNAVAILABLE", "Réponse privée invalide.");
    }
    return Object.freeze({
      protocol: response.protocol,
      environment: response.environment,
      requestId: response.requestId,
      correlationId: response.correlationId,
      respondedAt: response.respondedAt,
      status: response.status,
      data: response.data
    });
  }

  return Object.freeze({
    protocol: PROTOCOL,
    command: COMMAND,
    maximumRequestAgeMs: MAX_REQUEST_AGE_MS,
    clockSkewMs: CLOCK_SKEW_MS,
    maximumBodyBytes: MAX_BODY_BYTES,
    maximumLimit: MAX_LIMIT,
    allowedSeverities: ALLOWED_SEVERITIES,
    canonicalize: canonicalize,
    normalizeActor: normalizeActor_,
    sha256Hex: sha256Hex_,
    hmacSha256Base64: hmacBase64_,
    timingSafeEqual: timingSafeEqual_,
    validatePayload: validatePayload_,
    createSignedRequest: createSignedRequest,
    validateSignedRequest: validateSignedRequest,
    createSignedResponse: createSignedResponse,
    validateSignedResponse: validateSignedResponse
  });
}

/**
 * Apps Script crypto adapter. It uses Utilities only and performs no I/O.
 */
function AKS_createAppsScriptPrivateCrypto_() {
  function bytesToHex_(bytes) {
    return bytes.map(function (value) {
      var normalized = value < 0 ? value + 256 : value;
      return ("0" + normalized.toString(16)).slice(-2);
    }).join("");
  }

  return Object.freeze({
    sha256Hex: function (text) {
      return bytesToHex_(Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        String(text),
        Utilities.Charset.UTF_8
      ));
    },
    hmacSha256Base64: function (text, secret) {
      return Utilities.base64Encode(
        Utilities.computeHmacSha256Signature(
          String(text),
          String(secret),
          Utilities.Charset.UTF_8
        )
      );
    }
  });
}

AKS.Core.PrivateProtocol = Object.freeze({
  create: AKS_createPrivateProtocol_,
  createAppsScriptCrypto: AKS_createAppsScriptPrivateCrypto_
});
