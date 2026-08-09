var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Persistent ACCESS-001 registry store.
 *
 * Storage is deliberately isolated behind Script Properties. A missing
 * registry is distinct from an unreadable registry so that the embedded
 * administrator list can only be used for bootstrap, never to mask corruption.
 */
function AKS_createAccessRegistryStore_(propertyStore) {
  var KEY = "AKS_ACCESS_REGISTRY";

  function error_(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  if (!propertyStore ||
      typeof propertyStore.getProperty !== "function" ||
      typeof propertyStore.setProperty !== "function" ||
      typeof propertyStore.deleteProperty !== "function") {
    throw error_("ACCESS_REGISTRY_INVALID", "Support du registre d'accès invalide.");
  }

  return Object.freeze({
    load: function () {
      var serialized = propertyStore.getProperty(KEY);
      if (serialized === null || typeof serialized === "undefined" || serialized === "") {
        return null;
      }
      try {
        return JSON.parse(serialized);
      } catch (failure) {
        throw error_("ACCESS_REGISTRY_INVALID", "Registre d'accès illisible.");
      }
    },

    save: function (registry) {
      propertyStore.setProperty(KEY, JSON.stringify(registry));
    },

    clear: function () {
      propertyStore.deleteProperty(KEY);
    }
  });
}

function AKS_createScriptAccessRegistryStore_() {
  return AKS_createAccessRegistryStore_(PropertiesService.getScriptProperties());
}
