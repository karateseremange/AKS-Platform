var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Verifies and dispatches signed WordPress connector requests.
 * The signed payload remains a string until authentication succeeds.
 *
 * @param {Object=} dependencies
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.HealthQuestionnaireApi =
  function (dependencies) {
    var deps = dependencies || {};
    var now = deps.now || function () { return new Date(); };
    var getSecret = deps.getSecret || function () {
      return PropertiesService.getScriptProperties().getProperty(
        "AKS_WORDPRESS_CONNECTOR_SECRET"
      );
    };
    var cache = deps.cache || CacheService.getScriptCache();
    var replayLock = deps.replayLock || LockService.getScriptLock();
    var digest = deps.digest || function (value) {
      return Utilities.base64EncodeWebSafe(
        Utilities.computeDigest(
          Utilities.DigestAlgorithm.SHA_256,
          value,
          Utilities.Charset.UTF_8
        )
      ).replace(/=+$/, "");
    };
    var hmac = deps.hmac || function (value, secret) {
      return Utilities.base64EncodeWebSafe(
        Utilities.computeHmacSha256Signature(
          value,
          secret,
          Utilities.Charset.UTF_8
        )
      ).replace(/=+$/, "");
    };
    var install = deps.install || function () {
      return AKS.Core.Application.install();
    };
    var resolveController = deps.resolveController || function () {
      return AKS.Core.Container.resolve(
        "healthQuestionnaire.webController"
      );
    };
    var submit = deps.submit || function (payload) {
      return AKS_submitPublicHealthQuestionnaire(payload);
    };
    var allowedActions = {
      context: true,
      prepare: true,
      submit: true
    };

    function failure_(code, message) {
      return AKS.Core.Result.failure(code, message);
    }

    function constantTimeEquals_(left, right) {
      var a = String(left || "");
      var b = String(right || "");
      var mismatch = a.length ^ b.length;
      var length = Math.max(a.length, b.length);
      var index;

      for (index = 0; index < length; index += 1) {
        mismatch |= (a.charCodeAt(index) || 0) ^
          (b.charCodeAt(index) || 0);
      }
      return mismatch === 0;
    }

    function authenticate_(envelope) {
      var secret = String(getSecret() || "");
      var version = String(envelope.version || "");
      var action = String(envelope.action || "");
      var timestamp = Number(envelope.timestamp);
      var nonce = String(envelope.nonce || "");
      var payload = String(envelope.payload || "");
      var signature = String(envelope.signature || "");
      var currentSeconds = Math.floor(now().getTime() / 1000);
      var canonical;
      var expected;
      var nonceKey;

      if (!secret) {
        return failure_(
          "HQ_API_NOT_CONFIGURED",
          "Le connecteur du questionnaire n’est pas configuré."
        );
      }
      if (version !== "1" || !allowedActions[action]) {
        return failure_("HQ_API_REQUEST_INVALID", "Requête invalide.");
      }
      if (!/^[-A-Za-z0-9_]{20,128}$/.test(nonce)) {
        return failure_("HQ_API_REQUEST_INVALID", "Requête invalide.");
      }
      if (!isFinite(timestamp) || Math.abs(currentSeconds - timestamp) > 300) {
        return failure_("HQ_API_REQUEST_EXPIRED", "Requête expirée.");
      }
      if (payload.length > 100000) {
        return failure_("HQ_API_REQUEST_TOO_LARGE", "Requête trop volumineuse.");
      }

      canonical = [version, action, timestamp, nonce, digest(payload)].join("\n");
      expected = hmac(canonical, secret);
      if (!constantTimeEquals_(expected, signature)) {
        return failure_("HQ_API_SIGNATURE_INVALID", "Signature invalide.");
      }

      nonceKey = "HQ_API_NONCE_" + digest(nonce);
      replayLock.waitLock(10000);
      try {
        if (cache.get(nonceKey)) {
          return failure_("HQ_API_REPLAY_REJECTED", "Requête déjà utilisée.");
        }
        cache.put(nonceKey, "1", 600);
      } finally {
        replayLock.releaseLock();
      }

      return AKS.Core.Result.success({
        action: action,
        payload: payload
      });
    }

    function handle(rawBody) {
      var envelope;
      var authentication;
      var payload;
      var installed;
      var controller;

      try {
        envelope = JSON.parse(String(rawBody || ""));
      } catch (error) {
        return failure_("HQ_API_JSON_INVALID", "Requête JSON invalide.");
      }

      authentication = authenticate_(envelope || {});
      if (!authentication.ok) {
        return authentication;
      }

      try {
        payload = JSON.parse(authentication.data.payload || "{}");
      } catch (error) {
        return failure_("HQ_API_PAYLOAD_INVALID", "Contenu JSON invalide.");
      }

      installed = install();
      if (!installed.ok) {
        return failure_(
          "APPLICATION_UNAVAILABLE",
          "Le questionnaire santé est temporairement indisponible."
        );
      }

      controller = resolveController();
      if (authentication.data.action === "context") {
        return controller.getPublicViewModel();
      }
      if (authentication.data.action === "prepare") {
        return controller.prepareDeclaration(payload.answers || {});
      }
      return submit(payload);
    }

    return Object.freeze({ handle: handle });
  };

/** @private */
function AKS_handleHealthQuestionnaireApiRequest_(event) {
  var postData = event && event.postData;
  var rawBody = postData && postData.contents;

  return AKS.Modules.HealthQuestionnaire
    .HealthQuestionnaireApi()
    .handle(rawBody || "");
}
