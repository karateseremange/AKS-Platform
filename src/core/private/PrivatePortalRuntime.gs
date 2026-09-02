var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/** D4-A: no service access at load time; only the approved RECETTE may send. */
function AKS_privatePortalRecipeId_() {
  return "1quyIoxSMlxe6xpADPlxRxGikRF3OCTEid0-xhOHeSRZH0sU0AOeIRxs4";
}

function AKS_privatePortalIsRecipe_(scriptIdProvider) {
  return (scriptIdProvider || function () { return ScriptApp.getScriptId(); })() ===
    AKS_privatePortalRecipeId_();
}

function AKS_privatePortalFailure_() {
  var error = new Error("Journaux temporairement indisponibles.");
  error.code = "PRIVATE_BACKEND_UNAVAILABLE";
  return error;
}

function AKS_privatePortalByteLength_(text) {
  return unescape(encodeURIComponent(String(text))).length;
}

/** Two fresh UUIDv4 draws: 122 random bits each, not 128 per UUID.
 * Utilities.getUuid documents equivalence to java.util.UUID.randomUUID.
 * Concatenation retains both draws; no timestamp/Math.random fallback.
 */
function AKS_createPrivatePortalIdentifiers_(uuidProvider) {
  var used = {};
  function uuid_() {
    var value = (uuidProvider || function () { return Utilities.getUuid(); })();
    if (typeof value !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw AKS_privatePortalFailure_();
    }
    value = value.toLowerCase();
    if (used[value]) throw AKS_privatePortalFailure_();
    used[value] = true;
    return value;
  }
  return Object.freeze({ create: function (kind) {
    return kind === "nonce" ? (uuid_() + uuid_()).replace(/-/g, "") : uuid_();
  } });
}

/** A bootstrap-visible destination is not an assigned LOG_READ capability. */
function AKS_authorizePrivatePortal_(access) {
  if (!access || typeof access.getCurrentIdentity !== "function" ||
      typeof access.assertAdministrationCapability !== "function" ||
      typeof access.getEffectiveAccessSnapshot !== "function") {
    throw AKS_privatePortalFailure_();
  }
  var identity = access.getCurrentIdentity();
  var email = typeof identity === "object" && identity ? identity.email : identity;
  email = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!email) throw AKS_privatePortalFailure_();
  access.assertAdministrationCapability("LOG_READ");
  var snapshot = access.getEffectiveAccessSnapshot();
  if (!snapshot || snapshot.bootstrap !== false || snapshot.email !== email ||
      !Array.isArray(snapshot.assignments) || !snapshot.assignments.some(function (entry) {
        return entry.module === "ADMINISTRATION" && Array.isArray(entry.capabilities) &&
          entry.capabilities.indexOf("LOG_READ") !== -1;
      })) throw AKS_privatePortalFailure_();
  return email;
}

function AKS_createPrivatePortalTransport_(options) {
  options = options || {};
  function header_(response, name) {
    var headers = response.getAllHeaders();
    var keys = Object.keys(headers).filter(function (key) {
      return key.toLowerCase() === name;
    });
    if (keys.length !== 1 || typeof headers[keys[0]] !== "string") {
      throw AKS_privatePortalFailure_();
    }
    return headers[keys[0]];
  }
  function responseUrl_(url) {
    if (!/^https:\/\/script\.googleusercontent\.com\/macros\/echo\?[^#\s]+$/.test(url)) {
      throw AKS_privatePortalFailure_();
    }
    var seen = {};
    url.split("?")[1].split("&").forEach(function (pair) {
      var match = /^(user_content_key|lib)=([A-Za-z0-9_%.-]+)$/.exec(pair);
      if (!match || seen[match[1]]) throw AKS_privatePortalFailure_();
      seen[match[1]] = true;
    });
    if (!seen.user_content_key) throw AKS_privatePortalFailure_();
    return url;
  }
  return Object.freeze({ send: function (rawBody) {
    try {
      options.guard();
      if (typeof rawBody !== "string" || !rawBody ||
          AKS_privatePortalByteLength_(rawBody) > 16384 ||
          !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,256}\/exec$/.test(options.endpoint)) {
        throw AKS_privatePortalFailure_();
      }
      var fetcher = options.fetcher || function (url, parameters) {
        return UrlFetchApp.fetch(url, parameters);
      };
      var response = fetcher(options.endpoint, {
        method: "post", contentType: "application/json", payload: rawBody,
        followRedirects: false, validateHttpsCertificates: true,
        muteHttpExceptions: true
      });
      var code = response.getResponseCode();
      if (code === 302 || code === 303) {
        // ContentService redirects the response only. Never forward the POST.
        response = fetcher(responseUrl_(header_(response, "location")), {
          method: "get", followRedirects: false,
          validateHttpsCertificates: true, muteHttpExceptions: true
        });
      }
      if (response.getResponseCode() !== 200 ||
          !/^application\/json(?:\s*;[^\r\n]*)?$/i.test(header_(response, "content-type"))) {
        throw AKS_privatePortalFailure_();
      }
      // This is a post-download bound, not streaming cancellation.
      var body = response.getContentText();
      if (typeof body !== "string" || !body || AKS_privatePortalByteLength_(body) > 32768) {
        throw AKS_privatePortalFailure_();
      }
      return body;
    } catch (ignoredTransportFailure) {
      throw AKS_privatePortalFailure_();
    }
  } });
}

function AKS_createPrivatePortalRuntime_(dependencies) {
  dependencies = dependencies || {};
  function unavailable_(status) {
    return Object.freeze({ status: status, available: false, events: Object.freeze([]) });
  }
  function guard_() {
    if (!AKS_privatePortalIsRecipe_(dependencies.scriptIdProvider)) {
      throw AKS_privatePortalFailure_();
    }
  }
  function readRecent(input) {
    var authorized = false;
    try {
      guard_();
      var access = dependencies.accessFactory ? dependencies.accessFactory() :
        AKS_createAccessService_();
      var actor = AKS_authorizePrivatePortal_(access);
      authorized = true;
      input = input || {};
      if (Object.prototype.toString.call(input) !== "[object Object]" ||
          Object.keys(input).some(function (key) {
            return ["limit", "severity"].indexOf(key) === -1;
          }) || [5, 20].indexOf(input.limit) === -1 ||
          (typeof input.severity !== "undefined" &&
            ["DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"].indexOf(input.severity) === -1)) {
        throw AKS_privatePortalFailure_();
      }
      // getProperty avoids reading secrets before ACCESS and the guards.
      var properties = dependencies.properties || PropertiesService.getScriptProperties();
      var flag = properties.getProperty("AKS_PRIVATE_PORTAL_ENABLED");
      if (flag === null || flag === "false") return unavailable_("DISABLED");
      var endpoint = properties.getProperty("AKS_PRIVATE_BACKEND_URL");
      var budget = properties.getProperty("AKS_PRIVATE_TIMEOUT_MS");
      var version = properties.getProperty("AKS_PRIVATE_SECRET_VERSION");
      if (flag !== "true" ||
          properties.getProperty("AKS_PRIVATE_PORTAL_ENVIRONMENT") !== "RECETTE" ||
          properties.getProperty("AKS_PRIVATE_CALLER_PROJECT") !== AKS_privatePortalRecipeId_() ||
          properties.getProperty("AKS_PRIVATE_HMAC_PREVIOUS") !== null ||
          !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,256}\/exec$/.test(endpoint || "") ||
          (budget !== null && budget !== "10000") ||
          typeof version !== "string" || !version || version.length > 128 || version !== version.trim()) {
        throw AKS_privatePortalFailure_();
      }
      var secret = properties.getProperty("AKS_PRIVATE_HMAC_CURRENT");
      if (typeof secret !== "string" || secret.length < 32 || secret.length > 4096 || secret !== secret.trim()) {
        throw AKS_privatePortalFailure_();
      }
      var client = AKS_createPrivatePortalLogClient_({
        // The original client also checks before configuration/signature.
        accessApi: {
          assertAdministrationCapability: function () {
            if (AKS_authorizePrivatePortal_(access) !== actor) throw AKS_privatePortalFailure_();
          },
          getCurrentIdentity: function () { return actor; }
        },
        configuration: { get: function () { return {
          enabled: true, environment: "RECETTE",
          callerProject: AKS_privatePortalRecipeId_(), currentSecret: secret
        }; } },
        crypto: dependencies.crypto || AKS_createAppsScriptPrivateCrypto_(),
        identifierProvider: AKS_createPrivatePortalIdentifiers_(dependencies.uuidProvider),
        nowProvider: dependencies.nowProvider,
        transport: AKS_createPrivatePortalTransport_({
          endpoint: endpoint, fetcher: dependencies.fetcher,
          guard: function () {
            guard_();
            if (properties.getProperty("AKS_PRIVATE_PORTAL_ENABLED") !== "true" ||
                AKS_authorizePrivatePortal_(access) !== actor) throw AKS_privatePortalFailure_();
          }
        })
      });
      var result = client.readRecent(input);
      if (!result.available) return unavailable_(result.status);
      if (result.events.length > input.limit) throw AKS_privatePortalFailure_();
      // Closed browser DTO; nextCursor and transport correlation stay server-side.
      return Object.freeze({ status: result.status, available: true,
        events: Object.freeze(result.events.map(function (event) {
          if (["DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"].indexOf(event.severity) === -1 ||
              (input.severity && event.severity !== input.severity)) throw AKS_privatePortalFailure_();
          return Object.freeze({ occurredAt: event.occurredAt, severity: event.severity,
            code: event.code, message: event.message, correlationId: event.correlationId });
        })) });
    } catch (ignoredFailure) {
      return unavailable_(authorized ? "UNAVAILABLE" : "DENIED");
    }
  }
  return Object.freeze({ readRecent: readRecent, enabledByDefault: false });
}
