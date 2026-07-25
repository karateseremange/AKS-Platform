var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Creates the read-only CONFIG-001 resolution service.
 *
 * The value provider must expose has(key) and get(key). Storage remains
 * encapsulated behind that contract.
 *
 * @param {Object} registry
 * @param {Object} valueProvider
 * @returns {Object}
 */
function AKS_createConfigurationService_(registry, valueProvider) {
  function error_(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function freezeResult_(result) {
    return Object.freeze({
      key: result.key,
      value: result.value,
      source: result.source,
      scope: result.scope,
      explicit: result.explicit,
      inherited: false,
      valid: true
    });
  }

  function validateValue_(definition, value) {
    if (definition.type === "string" || definition.type === "resourceId") {
      return typeof value === "string";
    }
    if (definition.type === "email") {
      return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
    if (definition.type === "boolean") {
      return typeof value === "boolean";
    }
    if (definition.type === "number") {
      return typeof value === "number" && isFinite(value);
    }
    if (definition.type === "integer") {
      return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
    }
    if (definition.type === "url") {
      return typeof value === "string" && /^https:\/\//i.test(value);
    }
    return false;
  }

  function resolve(key) {
    var definition = registry.get(key);
    var hasExplicitValue = valueProvider &&
      typeof valueProvider.has === "function" &&
      valueProvider.has(key);
    var value;
    var source;

    if (hasExplicitValue) {
      value = valueProvider.get(key);
      source = "explicit";
    } else if (definition.hasDefault) {
      value = definition.defaultValue;
      source = "default";
    } else if (definition.required) {
      throw error_(
        "CONFIG001_REQUIRED_PARAMETER_MISSING",
        "Le paramètre obligatoire est absent : " + key
      );
    } else {
      return Object.freeze({
        key: key,
        value: null,
        source: "absent",
        scope: definition.scope,
        explicit: false,
        inherited: false,
        valid: true
      });
    }

    if (!validateValue_(definition, value)) {
      throw error_(
        "CONFIG001_INVALID_VALUE",
        "La valeur du paramètre est invalide : " + key
      );
    }

    return freezeResult_({
      key: key,
      value: value,
      source: source,
      scope: definition.scope,
      explicit: source === "explicit"
    });
  }

  return Object.freeze({
    resolve: resolve,
    definitions: function () {
      return registry.list();
    }
  });
}

