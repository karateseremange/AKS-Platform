var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Creates the CONFIG-001 registry of parameter definitions.
 *
 * @returns {Object}
 */
function AKS_createParameterRegistry_() {
  var definitions = Object.create(null);
  var scopes = {
    platform: true,
    module: true,
    campaign: true,
    season: true,
    environment: true,
    integration: true
  };
  var types = {
    string: true,
    email: true,
    boolean: true,
    number: true,
    integer: true,
    url: true,
    resourceId: true
  };

  function clone_(value) {
    if (Array.isArray(value)) {
      return value.map(clone_);
    }

    if (value && typeof value === "object") {
      var copy = {};
      Object.keys(value).forEach(function (key) {
        copy[key] = clone_(value[key]);
      });
      return copy;
    }

    return value;
  }

  function freeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }

    Object.keys(value).forEach(function (key) {
      freeze_(value[key]);
    });
    return Object.freeze(value);
  }

  function error_(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function validateDefinition_(definition) {
    if (!definition || typeof definition !== "object") {
      throw error_("CONFIG001_DEFINITION_REQUIRED", "Une définition de paramètre est requise.");
    }

    if (
      typeof definition.key !== "string" ||
      !/^[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*)+$/.test(definition.key)
    ) {
      throw error_(
        "CONFIG001_INVALID_KEY",
        "La clé du paramètre doit respecter la convention <domaine>.<nom>."
      );
    }

    if (!types[definition.type]) {
      throw error_("CONFIG001_INVALID_TYPE", "Le type du paramètre n'est pas pris en charge.");
    }

    if (!scopes[definition.scope]) {
      throw error_("CONFIG001_INVALID_SCOPE", "La portée du paramètre n'est pas prise en charge.");
    }

    if (definition.secret === true || Object.prototype.hasOwnProperty.call(definition, "secretValue")) {
      throw error_(
        "CONFIG001_SECRET_FORBIDDEN",
        "Une valeur réelle de secret ne peut pas être enregistrée comme paramètre."
      );
    }

    if (typeof definition.label !== "string" || definition.label.trim() === "") {
      throw error_("CONFIG001_LABEL_REQUIRED", "Le libellé du paramètre est obligatoire.");
    }
  }

  function register(definition) {
    validateDefinition_(definition);

    if (Object.prototype.hasOwnProperty.call(definitions, definition.key)) {
      throw error_(
        "CONFIG001_DUPLICATE_KEY",
        "La clé de paramètre est déjà enregistrée : " + definition.key
      );
    }

    var normalized = {
      key: definition.key,
      label: definition.label.trim(),
      description: String(definition.description || "").trim(),
      type: definition.type,
      scope: definition.scope,
      required: definition.required === true,
      sensitive: definition.sensitive === true,
      administrable: definition.administrable === true,
      lifecycle: definition.lifecycle || "active",
      hasDefault: Object.prototype.hasOwnProperty.call(definition, "defaultValue"),
      defaultValue: clone_(definition.defaultValue)
    };

    definitions[normalized.key] = freeze_(normalized);
    return freeze_(clone_(normalized));
  }

  function get(key) {
    if (!Object.prototype.hasOwnProperty.call(definitions, key)) {
      throw error_("CONFIG001_UNKNOWN_PARAMETER", "Paramètre inconnu : " + key);
    }

    return freeze_(clone_(definitions[key]));
  }

  function list() {
    return freeze_(
      Object.keys(definitions).sort().map(function (key) {
        return clone_(definitions[key]);
      })
    );
  }

  return Object.freeze({
    register: register,
    get: get,
    list: list
  });
}

/**
 * Creates the platform registry used by the CONFIG-001 administration UI.
 *
 * @returns {Object}
 */
function AKS_createPlatformParameterRegistry_() {
  var registry = AKS_createParameterRegistry_();

  [
    {
      key: "club.name",
      label: "Nom du club",
      description: "Nom affiché par les services communs de la plateforme.",
      type: "string",
      scope: "platform",
      required: true,
      administrable: true,
      defaultValue: "Association Karaté Serémange"
    },
    {
      key: "club.contact.email",
      label: "Adresse de contact",
      description: "Adresse générale utilisée pour contacter le club.",
      type: "email",
      scope: "platform",
      required: true,
      administrable: true,
      defaultValue: "contact@karate-seremange.fr"
    },
    {
      key: "platform.activeSeason",
      label: "Saison active",
      description: "Saison de référence au format AAAA-AAAA.",
      type: "string",
      scope: "season",
      required: true,
      administrable: true
    },
    {
      key: "platform.language",
      label: "Langue",
      description: "Langue fonctionnelle de la plateforme.",
      type: "string",
      scope: "platform",
      required: true,
      administrable: false,
      defaultValue: "fr"
    },
    {
      key: "logging.retentionDays",
      label: "Conservation des journaux",
      description: "Durée de conservation active des journaux ordinaires, en jours.",
      type: "integer",
      scope: "platform",
      required: true,
      administrable: true,
      defaultValue: 90
    }
  ].forEach(registry.register);

  return registry;
}
