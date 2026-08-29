var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * ADMIN-006 lot B — persistent, bounded replay guard.
 * Storage, locking, hashing and clock are injected for deterministic tests.
 */
function AKS_createPrivateReplayGuard_(dependencies) {
  dependencies = dependencies || {};

  var PREFIX_REQUEST = "AKS_PRIVATE_REPLAY_REQ_";
  var PREFIX_NONCE = "AKS_PRIVATE_REPLAY_NONCE_";
  var SCHEMA_VERSION = 1;
  var DEFAULT_LOCK_WAIT_MS = 5000;
  var DEFAULT_PURGE_LIMIT = 50;
  var DEFAULT_RETENTION_SKEW_MS = 30000;

  var store = dependencies.store;
  var lock = dependencies.lock;
  var crypto = dependencies.crypto;
  var nowProvider = dependencies.nowProvider || function () {
    return new Date().getTime();
  };
  var lockWaitMs = numberOption_(
    dependencies.lockWaitMs,
    DEFAULT_LOCK_WAIT_MS,
    1,
    30000
  );
  var purgeLimit = numberOption_(
    dependencies.purgeLimit,
    DEFAULT_PURGE_LIMIT,
    1,
    500
  );
  var retentionSkewMs = numberOption_(
    dependencies.retentionSkewMs,
    DEFAULT_RETENTION_SKEW_MS,
    0,
    300000
  );

  function fail_(code, message) {
    var error = new Error(message);
    error.code = code;
    throw error;
  }

  function numberOption_(value, fallback, minimum, maximum) {
    var resolved = typeof value === "undefined" ? fallback : Number(value);
    if (!isFinite(resolved) || resolved % 1 !== 0 ||
        resolved < minimum || resolved > maximum) {
      throw new Error("Option anti-rejeu invalide.");
    }
    return resolved;
  }

  function requireDependency_(object, methods, label) {
    if (!object) fail_("PRIVATE_BACKEND_UNAVAILABLE", label + " indisponible.");
    methods.forEach(function (method) {
      if (typeof object[method] !== "function") {
        fail_("PRIVATE_BACKEND_UNAVAILABLE", label + " incomplet.");
      }
    });
  }

  function digest_(value) {
    if (!crypto || typeof crypto.sha256Hex !== "function") {
      fail_("PRIVATE_BACKEND_UNAVAILABLE", "Empreinte anti-rejeu indisponible.");
    }
    return String(crypto.sha256Hex(String(value))).toLowerCase();
  }

  function parseRecord_(text) {
    if (typeof text !== "string" || text === "") return null;
    try {
      var record = JSON.parse(text);
      if (!record || record.v !== SCHEMA_VERSION ||
          !isFinite(Number(record.expiresAtMs))) {
        return null;
      }
      return {
        v: SCHEMA_VERSION,
        expiresAtMs: Number(record.expiresAtMs)
      };
    } catch (error) {
      return null;
    }
  }

  function isReplayKey_(key) {
    return key.indexOf(PREFIX_REQUEST) === 0 ||
      key.indexOf(PREFIX_NONCE) === 0;
  }

  function purgeExpired_(nowMs) {
    var removed = [];
    var keys = store.listKeys().filter(isReplayKey_).sort();

    for (var index = 0;
         index < keys.length && removed.length < purgeLimit;
         index += 1) {
      var key = keys[index];
      var record = parseRecord_(store.get(key));
      if (!record || record.expiresAtMs < nowMs) removed.push(key);
    }

    if (removed.length > 0) store.removeMany(removed);
    return removed.length;
  }

  function consume(requestId, nonce, expiresAtMs) {
    requireDependency_(store, [
      "get", "setMany", "removeMany", "listKeys"
    ], "Stockage anti-rejeu");
    requireDependency_(lock, ["tryLock", "release"], "Verrou anti-rejeu");

    var nowMs = Number(nowProvider());
    var expiry = Number(expiresAtMs);
    if (!isFinite(nowMs) || !isFinite(expiry) || expiry < nowMs) {
      fail_("PRIVATE_REPLAY_REJECTED", "Fenêtre anti-rejeu invalide.");
    }

    var requestKey = PREFIX_REQUEST + digest_(requestId);
    var nonceKey = PREFIX_NONCE + digest_(nonce);
    var acquired = false;

    try {
      acquired = lock.tryLock(lockWaitMs) === true;
      if (!acquired) {
        fail_("PRIVATE_BACKEND_UNAVAILABLE", "Verrou anti-rejeu indisponible.");
      }

      nowMs = Number(nowProvider());
      if (!isFinite(nowMs) || expiry < nowMs) {
        fail_("PRIVATE_REPLAY_REJECTED", "Requête expirée.");
      }

      purgeExpired_(nowMs);

      if (store.get(requestKey) !== null ||
          store.get(nonceKey) !== null) {
        return false;
      }

      var serialized = JSON.stringify({
        v: SCHEMA_VERSION,
        expiresAtMs: expiry + retentionSkewMs
      });
      var records = {};
      records[requestKey] = serialized;
      records[nonceKey] = serialized;
      store.setMany(records);

      if (store.get(requestKey) !== serialized ||
          store.get(nonceKey) !== serialized) {
        fail_("PRIVATE_BACKEND_UNAVAILABLE", "Écriture anti-rejeu non confirmée.");
      }
      return true;
    } finally {
      if (acquired) lock.release();
    }
  }

  return Object.freeze({
    consume: consume,
    purgeExpired: function () {
      requireDependency_(store, [
        "get", "setMany", "removeMany", "listKeys"
      ], "Stockage anti-rejeu");
      requireDependency_(lock, ["tryLock", "release"], "Verrou anti-rejeu");
      var acquired = false;
      try {
        acquired = lock.tryLock(lockWaitMs) === true;
        if (!acquired) {
          fail_("PRIVATE_BACKEND_UNAVAILABLE", "Verrou anti-rejeu indisponible.");
        }
        return purgeExpired_(Number(nowProvider()));
      } finally {
        if (acquired) lock.release();
      }
    },
    requestPrefix: PREFIX_REQUEST,
    noncePrefix: PREFIX_NONCE
  });
}

/**
 * Future Apps Script adapter. It performs no access until explicitly created
 * with enabled=true and environment=RECETTE.
 */
function AKS_createAppsScriptPrivateReplayGuard_(options) {
  options = options || {};
  if (options.enabled !== true || options.environment !== "RECETTE") {
    var disabled = new Error("Adaptateur anti-rejeu Apps Script désactivé.");
    disabled.code = "PRIVATE_BACKEND_UNAVAILABLE";
    throw disabled;
  }

  var properties = PropertiesService.getScriptProperties();
  var scriptLock = LockService.getScriptLock();
  var crypto = options.crypto || AKS_createAppsScriptPrivateCrypto_();

  return AKS_createPrivateReplayGuard_({
    crypto: crypto,
    nowProvider: options.nowProvider,
    lockWaitMs: options.lockWaitMs,
    purgeLimit: options.purgeLimit,
    retentionSkewMs: options.retentionSkewMs,
    lock: {
      tryLock: function (waitMs) {
        return scriptLock.tryLock(waitMs);
      },
      release: function () {
        scriptLock.releaseLock();
      }
    },
    store: {
      get: function (key) {
        return properties.getProperty(key);
      },
      setMany: function (values) {
        properties.setProperties(values, false);
      },
      removeMany: function (keys) {
        keys.forEach(function (key) {
          properties.deleteProperty(key);
        });
      },
      listKeys: function () {
        return Object.keys(properties.getProperties());
      }
    }
  });
}

AKS.Core.PrivateReplayGuard = Object.freeze({
  create: AKS_createPrivateReplayGuard_,
  createAppsScript: AKS_createAppsScriptPrivateReplayGuard_
});
