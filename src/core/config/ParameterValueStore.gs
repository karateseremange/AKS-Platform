var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Creates the CONFIG-001 persistent value provider.
 *
 * The injected property store must expose getProperty, setProperty and
 * deleteProperty. Apps Script Script Properties can therefore be used without
 * exposing their storage format to consumers.
 *
 * @param {Object} propertyStore
 * @param {Object=} lock
 * @returns {Object}
 */
function AKS_createParameterValueStore_(propertyStore, lock) {
  var PREFIX = "AKS_CONFIG_VALUE.";

  if (
    !propertyStore ||
    typeof propertyStore.getProperty !== "function" ||
    typeof propertyStore.setProperty !== "function" ||
    typeof propertyStore.deleteProperty !== "function"
  ) {
    throw createError_(
      "CONFIG001_INVALID_VALUE_STORE",
      "Le support de persistance des paramètres est invalide."
    );
  }

  function createError_(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function storageKey_(key) {
    return PREFIX + key;
  }

  function parse_(key, serialized) {
    if (serialized === null || typeof serialized === "undefined") {
      return null;
    }

    try {
      var record = JSON.parse(serialized);
      if (
        !record ||
        !Object.prototype.hasOwnProperty.call(record, "value") ||
        typeof record.updatedAt !== "string" ||
        typeof record.updatedBy !== "string"
      ) {
        throw new Error("invalid record");
      }
      return record;
    } catch (error) {
      throw createError_(
        "CONFIG001_CORRUPTED_VALUE",
        "La valeur persistée du paramètre est illisible : " + key
      );
    }
  }

  function withLock_(operation) {
    if (!lock) {
      return operation();
    }

    if (
      typeof lock.waitLock !== "function" ||
      typeof lock.releaseLock !== "function"
    ) {
      throw createError_(
        "CONFIG001_INVALID_LOCK",
        "Le verrou de configuration est invalide."
      );
    }

    lock.waitLock(30000);
    try {
      return operation();
    } finally {
      lock.releaseLock();
    }
  }

  function read_(key) {
    return parse_(key, propertyStore.getProperty(storageKey_(key)));
  }

  return Object.freeze({
    has: function (key) {
      return read_(key) !== null;
    },

    get: function (key) {
      var record = read_(key);
      return record === null ? null : record.value;
    },

    metadata: function (key) {
      var record = read_(key);
      if (record === null) {
        return null;
      }
      return Object.freeze({
        updatedAt: record.updatedAt,
        updatedBy: record.updatedBy
      });
    },

    set: function (key, value, metadata) {
      return withLock_(function () {
        var record = {
          value: value,
          updatedAt: metadata.updatedAt,
          updatedBy: metadata.updatedBy
        };
        propertyStore.setProperty(storageKey_(key), JSON.stringify(record));
        return Object.freeze({
          updatedAt: record.updatedAt,
          updatedBy: record.updatedBy
        });
      });
    },

    remove: function (key) {
      return withLock_(function () {
        propertyStore.deleteProperty(storageKey_(key));
      });
    }
  });
}

/**
 * Creates the production CONFIG-001 value store backed by Script Properties.
 *
 * @returns {Object}
 */
function AKS_createScriptParameterValueStore_() {
  return AKS_createParameterValueStore_(
    PropertiesService.getScriptProperties(),
    LockService.getScriptLock()
  );
}
