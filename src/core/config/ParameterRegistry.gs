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
    enum: true,
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

    if (definition.type === "enum" &&
        (!Array.isArray(definition.allowedValues) || definition.allowedValues.length === 0)) {
      throw error_("CONFIG001_ENUM_VALUES_REQUIRED", "Les valeurs de l'énumération sont obligatoires.");
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

    if (definition.type === "enum") {
      normalized.allowedValues = clone_(definition.allowedValues);
    }

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
      key: "audit.environment",
      label: "Environnement d'audit",
      description: "Environnement strict autorisé pour le support d'audit persistant.",
      type: "enum",
      scope: "environment",
      required: true,
      sensitive: false,
      administrable: false,
      allowedValues: ["RECETTE", "PRODUCTION"]
    },
    {
      key: "audit.scriptId",
      label: "Projet Apps Script d'audit",
      description: "Identifiant exact du projet Apps Script autorisé à utiliser le support d'audit.",
      type: "resourceId",
      scope: "environment",
      required: true,
      sensitive: true,
      administrable: false
    },
    {
      key: "audit.spreadsheetId",
      label: "Classeur d'audit",
      description: "Identifiant restreint du classeur portant AKS_Audit dans l'environnement déclaré.",
      type: "resourceId",
      scope: "environment",
      required: true,
      sensitive: true,
      administrable: false
    },
    {
      key: "audit.retentionDays",
      label: "Durée de conservation de l'audit",
      description: "Durée initiale contrôlée de conservation des preuves d'audit.",
      type: "integer",
      scope: "environment",
      required: true,
      sensitive: false,
      administrable: false
    },
    {
      key: "audit.schemaVersion",
      label: "Version du schéma d'audit",
      description: "Version exacte du schéma persistant commun.",
      type: "string",
      scope: "environment",
      required: true,
      sensitive: false,
      administrable: false
    },
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
    },
    {
      key: "analytics.driveRootFolderId",
      label: "Dossier racine Analytics",
      description: "Identifiant Drive du dossier racine autorisé pour les publications Analytics.",
      type: "resourceId",
      scope: "integration",
      required: false,
      administrable: true
    },
    {
      key: "analytics.sheets.babySpreadsheetId",
      label: "Classeur Analytics — Baby",
      description: "Identifiant du classeur Google Sheets officiel du cours Baby.",
      type: "resourceId",
      scope: "integration",
      required: false,
      administrable: true
    },
    {
      key: "analytics.sheets.enfant1SpreadsheetId",
      label: "Classeur Analytics — Enfant 1",
      description: "Identifiant du classeur Google Sheets officiel du cours Enfant 1.",
      type: "resourceId",
      scope: "integration",
      required: false,
      administrable: true
    },
    {
      key: "analytics.sheets.enfant2SpreadsheetId",
      label: "Classeur Analytics — Enfant 2",
      description: "Identifiant du classeur Google Sheets officiel du cours Enfant 2.",
      type: "resourceId",
      scope: "integration",
      required: false,
      administrable: true
    },
    {
      key: "analytics.sheets.adoAdulteSpreadsheetId",
      label: "Classeur Analytics — Ado/Adulte",
      description: "Identifiant du classeur Google Sheets officiel du cours Ado/Adulte.",
      type: "resourceId",
      scope: "integration",
      required: false,
      administrable: true
    },
    {
      key: "analytics.sheets.femininSpreadsheetId",
      label: "Classeur Analytics — Cours féminin",
      description: "Identifiant du classeur Google Sheets officiel du cours féminin.",
      type: "resourceId",
      scope: "integration",
      required: false,
      administrable: true
    }
  ].forEach(registry.register);

  return registry;
}
