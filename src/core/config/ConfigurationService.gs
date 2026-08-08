var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Creates the CONFIG-001 resolution and controlled-write service.
 *
 * The value provider must expose has(key) and get(key). Storage remains
 * encapsulated behind that contract.
 *
 * @param {Object} registry
 * @param {Object} valueProvider
 * @param {Function=} clock
 * @returns {Object}
 */
function AKS_createConfigurationService_(registry, valueProvider, clock) {
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
      valid: true,
      lastModifiedAt: result.lastModifiedAt || null,
      modifiedBy: result.modifiedBy || null
    });
  }

  function validateValue_(definition, value) {
    if (definition.type === "enum") {
      return typeof value === "string" &&
        Array.isArray(definition.allowedValues) &&
        definition.allowedValues.indexOf(value) !== -1;
    }
    if (definition.type === "string") {
      return typeof value === "string";
    }
    if (definition.type === "resourceId") {
      return typeof value === "string" &&
        /^[A-Za-z0-9_-]{20,128}$/.test(value);
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

  function mutationMetadata_(context) {
    if (
      !context ||
      typeof context.actor !== "string" ||
      context.actor.trim() === ""
    ) {
      throw error_(
        "CONFIG001_ACTOR_REQUIRED",
        "L'auteur de la modification du paramètre est obligatoire."
      );
    }

    var now = typeof clock === "function" ? clock() : new Date();
    if (!(now instanceof Date) || isNaN(now.getTime())) {
      throw error_(
        "CONFIG001_INVALID_CLOCK",
        "La date de modification du paramètre est invalide."
      );
    }

    return {
      updatedAt: now.toISOString(),
      updatedBy: context.actor.trim().toLowerCase()
    };
  }

  function writableDefinition_(key) {
    var definition = registry.get(key);
    if (!definition.administrable) {
      throw error_(
        "CONFIG001_PARAMETER_NOT_ADMINISTRABLE",
        "Le paramètre ne peut pas être modifié depuis l'administration : " + key
      );
    }
    return definition;
  }

  function assertWritableProvider_() {
    if (
      !valueProvider ||
      typeof valueProvider.set !== "function" ||
      typeof valueProvider.remove !== "function"
    ) {
      throw error_(
        "CONFIG001_READ_ONLY_PROVIDER",
        "Le support de paramètres ne permet pas les modifications."
      );
    }
  }

  function resolve(key) {
    var definition = registry.get(key);
    var hasExplicitValue = valueProvider &&
      typeof valueProvider.has === "function" &&
      valueProvider.has(key);
    var value;
    var source;
    var metadata = null;

    if (hasExplicitValue) {
      value = valueProvider.get(key);
      source = "explicit";
      if (typeof valueProvider.metadata === "function") {
        metadata = valueProvider.metadata(key);
      }
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
      explicit: source === "explicit",
      lastModifiedAt: metadata && metadata.updatedAt,
      modifiedBy: metadata && metadata.updatedBy
    });
  }

  function set(key, value, context) {
    var definition = writableDefinition_(key);
    assertWritableProvider_();

    if (!validateValue_(definition, value)) {
      throw error_(
        "CONFIG001_INVALID_VALUE",
        "La valeur du paramètre est invalide : " + key
      );
    }

    var metadata = mutationMetadata_(context);
    valueProvider.set(key, value, metadata);
    return resolve(key);
  }

  function remove(key, context) {
    var definition = writableDefinition_(key);
    assertWritableProvider_();
    mutationMetadata_(context);

    if (
      definition.required &&
      !definition.hasDefault
    ) {
      throw error_(
        "CONFIG001_REQUIRED_PARAMETER_DELETE_FORBIDDEN",
        "Le paramètre obligatoire ne peut pas être supprimé : " + key
      );
    }

    valueProvider.remove(key);
    return resolve(key);
  }

  return Object.freeze({
    resolve: resolve,
    set: set,
    remove: remove,
    definitions: function () {
      return registry.list();
    }
  });
}
