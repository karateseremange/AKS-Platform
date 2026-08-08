var AKS = AKS || {};
AKS.Inscriptions = AKS.Inscriptions || {};

/**
 * INSCRIPTIONS-010 technical persistence ports.
 *
 * Every external dependency is injected so the cumulative validation suite
 * never calls a Google service. The Apps Script composition lives in the
 * separate InscriptionsRecipeGoogleAdapter file.
 */
AKS.Inscriptions.createRecipePersistenceService = function (options) {
  "use strict";

  options = options || {};
  var gateway = options.gateway;
  var lock = options.lock;
  var audit = options.audit;
  var technicalActor = options.technicalActor;
  var config = options.config || {};
  var clock = options.clock || function () { return new Date(); };
  var lockTimeoutMs = Number(options.lockTimeoutMs || 5000);
  var SCHEMA_VERSION = "inscriptions-recipe-tech/1.0";
  var COMMAND_SCHEMA_VERSION = "inscriptions-command/1.0";
  var TIMEZONE = "Europe/Paris";
  var RESOURCE_KIND = "AKS_INSCRIPTIONS_RECIPE";
  var SHEETS = Object.freeze(["Metadata", "Sequences", "Commandes"]);
  var HEADERS = Object.freeze({
    Metadata: Object.freeze(["key", "value"]),
    Sequences: Object.freeze([
      "sequence_type", "scope_key", "last_value", "row_version",
      "updated_at", "updated_by"
    ]),
    Commandes: Object.freeze([
      "schema_version", "command_id", "idempotency_key", "payload_fingerprint",
      "actor", "action", "target_type", "target_id", "module", "season",
      "section", "course_code", "correlation_id", "status", "attempt_count",
      "created_at", "created_by", "updated_at", "updated_by", "row_version",
      "failure_code"
    ])
  });
  var METADATA_KEYS = Object.freeze([
    "schema_version", "environment", "timezone", "resource_kind", "resource_id",
    "created_at", "validated_at"
  ]);
  var COMMAND_STATUSES = Object.freeze({
    INTENTION: true,
    EN_COURS: true,
    CONFIRMEE: true,
    ECHEC_RECUPERABLE: true,
    ECHEC_FINAL: true
  });
  var SEQUENCES = Object.freeze({
    LICENCIE: Object.freeze({ prefix: "LIC", scope: /^GLOBAL$/ }),
    RESPONSABLE: Object.freeze({ prefix: "RSP", scope: /^GLOBAL$/ }),
    DOSSIER: Object.freeze({ prefix: "INS", scope: /^20\d{2}$/ }),
    IMPORT: Object.freeze({ prefix: "IMP", scope: /^(20\d{2}):[A-Z][A-Z0-9_]{1,31}$/ })
  });

  function error_(code, message) {
    var failure = new Error(message);
    failure.code = code;
    return failure;
  }

  function clone_(value) {
    return value === null || typeof value === "undefined"
      ? value
      : JSON.parse(JSON.stringify(value));
  }

  function text_(value) {
    return String(value === null || typeof value === "undefined" ? "" : value).trim();
  }

  function upper_(value) {
    return text_(value).toUpperCase();
  }

  function positiveInteger_(value, allowZero) {
    var number = Number(value);
    return isFinite(number) && Math.floor(number) === number &&
      (allowZero ? number >= 0 : number > 0) ? number : null;
  }

  function timestamp_() {
    var instant = clock();
    if (!(instant instanceof Date) || isNaN(instant.getTime())) {
      throw error_("INSCRIPTIONS_CLOCK_INVALID", "Horloge Inscriptions invalide.");
    }
    return instant.toISOString();
  }

  function validTimestamp_(value) {
    return typeof value === "string" && value !== "" && !isNaN(new Date(value).getTime());
  }

  function assertDependencies_() {
    var gatewayMethods = [
      "getResourceId", "getTimezone", "getSheetNames", "readRows", "appendRow", "updateRow"
    ];
    if (!gateway || gatewayMethods.some(function (method) {
      return typeof gateway[method] !== "function";
    })) {
      throw error_("INSCRIPTIONS_DEPENDENCY_INVALID", "Passerelle de persistance invalide.");
    }
    if (!lock || typeof lock.tryLock !== "function" || typeof lock.releaseLock !== "function") {
      throw error_("INSCRIPTIONS_DEPENDENCY_INVALID", "Verrou Inscriptions invalide.");
    }
    if (!audit || typeof audit.record !== "function" ||
        typeof audit.isPersistentRecipeAudit !== "function" ||
        audit.isPersistentRecipeAudit() !== true) {
      throw error_("INSCRIPTIONS_AUDIT_REQUIRED", "Audit commun persistant indisponible.");
    }
    if (typeof technicalActor !== "function") {
      throw error_("INSCRIPTIONS_DEPENDENCY_INVALID", "Acteur technique Inscriptions indisponible.");
    }
    if (!isFinite(lockTimeoutMs) || lockTimeoutMs < 1000 || lockTimeoutMs > 30000) {
      throw error_("INSCRIPTIONS_DEPENDENCY_INVALID", "Délai de verrou invalide.");
    }
  }

  function assertHeaders_(sheetName, rows) {
    var expected = HEADERS[sheetName];
    var actual = rows && rows.length ? rows[0] : [];
    if (actual.length !== expected.length || expected.some(function (header, index) {
      return text_(actual[index]) !== header;
    })) {
      throw error_("INSCRIPTIONS_SCHEMA_MISMATCH", "En-têtes Inscriptions incompatibles.");
    }
  }

  function metadataFromRows_(rows) {
    assertHeaders_("Metadata", rows);
    var values = {};
    rows.slice(1).forEach(function (row) {
      var key = text_(row[0]);
      if (!key || METADATA_KEYS.indexOf(key) === -1 ||
          Object.prototype.hasOwnProperty.call(values, key)) {
        throw error_("INSCRIPTIONS_SCHEMA_MISMATCH", "Métadonnées Inscriptions incompatibles.");
      }
      values[key] = text_(row[1]);
    });
    if (Object.keys(values).length !== METADATA_KEYS.length ||
        METADATA_KEYS.some(function (key) { return !values[key]; })) {
      throw error_("INSCRIPTIONS_SCHEMA_MISMATCH", "Métadonnées Inscriptions incomplètes.");
    }
    return values;
  }

  function assertRecipe_() {
    assertDependencies_();
    if (upper_(config.environment) !== "RECETTE") {
      throw error_("INSCRIPTIONS_RECIPE_REQUIRED", "Une recette Inscriptions est obligatoire.");
    }
    var configuredId = text_(config.spreadsheetId);
    if (!configuredId || text_(gateway.getResourceId()) !== configuredId) {
      throw error_("INSCRIPTIONS_RECIPE_RESOURCE_MISMATCH", "Ressource Inscriptions inattendue.");
    }
    if (text_(gateway.getTimezone()) !== TIMEZONE) {
      throw error_("INSCRIPTIONS_SCHEMA_MISMATCH", "Fuseau du classeur Inscriptions incompatible.");
    }
    var names = gateway.getSheetNames().map(text_).sort();
    var expectedNames = SHEETS.slice().sort();
    if (JSON.stringify(names) !== JSON.stringify(expectedNames)) {
      throw error_("INSCRIPTIONS_SCHEMA_MISMATCH", "Onglets Inscriptions incompatibles.");
    }
    var metadataRows = gateway.readRows("Metadata");
    var metadata = metadataFromRows_(metadataRows);
    if (metadata.environment !== "RECETTE" ||
        metadata.schema_version !== SCHEMA_VERSION ||
        metadata.timezone !== TIMEZONE) {
      throw error_("INSCRIPTIONS_SCHEMA_MISMATCH", "Marqueurs de schéma Inscriptions incompatibles.");
    }
    if (metadata.resource_kind !== RESOURCE_KIND || metadata.resource_id !== configuredId) {
      throw error_("INSCRIPTIONS_RECIPE_RESOURCE_MISMATCH", "Marqueur de recette Inscriptions invalide.");
    }
    if (!validTimestamp_(metadata.created_at) || !validTimestamp_(metadata.validated_at)) {
      throw error_("INSCRIPTIONS_SCHEMA_MISMATCH", "Horodatage de recette Inscriptions invalide.");
    }
    assertHeaders_("Sequences", gateway.readRows("Sequences"));
    assertHeaders_("Commandes", gateway.readRows("Commandes"));
    return Object.freeze(clone_(metadata));
  }

  function withLock_(operation) {
    assertRecipe_();
    if (lock.tryLock(lockTimeoutMs) !== true) {
      throw error_("INSCRIPTIONS_LOCK_TIMEOUT", "Verrou Inscriptions indisponible.");
    }
    try {
      assertRecipe_();
      return operation();
    } finally {
      lock.releaseLock();
    }
  }

  function technicalActor_() {
    var actor = text_(technicalActor()).toLowerCase();
    if (!actor) throw error_("INSCRIPTIONS_IDENTITY_INVALID", "Acteur technique invalide.");
    return actor;
  }

  function commandRows_() {
    var rows = gateway.readRows("Commandes");
    assertHeaders_("Commandes", rows);
    return rows;
  }

  function commandMatches_(row, key) {
    return text_(row[2]) === key;
  }

  function samePersistedRow_(actual, expected) {
    return Array.isArray(actual) && Array.isArray(expected) &&
      actual.length === expected.length && expected.every(function (value, index) {
        return actual[index] === value;
      });
  }

  function validateCommandRecord_(record) {
    record = record || {};
    var version = positiveInteger_(record.version, false);
    var attempts = positiveInteger_(record.attemptCount, true);
    if (record.schemaVersion !== COMMAND_SCHEMA_VERSION || !record.commandId ||
        !record.idempotencyKey || !record.payloadFingerprint || !record.actor ||
        !record.action || !record.correlationId || !COMMAND_STATUSES[record.status] ||
        version === null || attempts === null || attempts > 3 ||
        !validTimestamp_(record.createdAt) || !validTimestamp_(record.updatedAt)) {
      throw error_("INSCRIPTIONS_JOURNAL_INVALID", "Entrée de journal Inscriptions invalide.");
    }
    var target = record.target || {};
    var scope = record.scope || {};
    if (!target.type || !target.id || !scope.module || !scope.season || !scope.section) {
      throw error_("INSCRIPTIONS_JOURNAL_INVALID", "Projection du journal Inscriptions invalide.");
    }
    return record;
  }

  function commandToRow_(record, createdBy, updatedBy) {
    validateCommandRecord_(record);
    return [
      record.schemaVersion, record.commandId, record.idempotencyKey,
      record.payloadFingerprint, record.actor, record.action, record.target.type,
      record.target.id, record.scope.module, record.scope.season, record.scope.section,
      record.scope.courseCode || "", record.correlationId, record.status,
      record.attemptCount, record.createdAt, createdBy, record.updatedAt, updatedBy,
      record.version, record.failureCode || ""
    ];
  }

  function rowToCommand_(row) {
    if (!row || row.length !== HEADERS.Commandes.length || !text_(row[16]) || !text_(row[18])) {
      throw error_("INSCRIPTIONS_JOURNAL_INVALID", "Métadonnées du journal Inscriptions invalides.");
    }
    var record = {
      schemaVersion: text_(row[0]), commandId: text_(row[1]), idempotencyKey: text_(row[2]),
      payloadFingerprint: text_(row[3]), actor: text_(row[4]), action: upper_(row[5]),
      target: { type: upper_(row[6]), id: text_(row[7]) },
      scope: { module: upper_(row[8]), season: text_(row[9]), section: upper_(row[10]), courseCode: upper_(row[11]) },
      correlationId: text_(row[12]), status: upper_(row[13]), attemptCount: Number(row[14]),
      createdAt: text_(row[15]), updatedAt: text_(row[17]), version: Number(row[19])
    };
    if (text_(row[20])) record.failureCode = upper_(row[20]);
    return validateCommandRecord_(record);
  }

  function findCommand_(rows, key) {
    var matches = [];
    rows.slice(1).forEach(function (row, index) {
      if (commandMatches_(row, key)) matches.push({ rowNumber: index + 2, row: row });
    });
    if (matches.length > 1) {
      throw error_("INSCRIPTIONS_JOURNAL_DUPLICATE", "Clé de journal Inscriptions dupliquée.");
    }
    return matches.length ? matches[0] : null;
  }

  function sameCommandIdentity_(currentRow, candidateRow) {
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16].every(function (index) {
      return text_(currentRow[index]) === text_(candidateRow[index]);
    });
  }

  var journal = Object.freeze({
    load: function (key) {
      assertRecipe_();
      var normalizedKey = text_(key);
      if (!normalizedKey) throw error_("INSCRIPTIONS_JOURNAL_INVALID", "Clé de journal invalide.");
      var found = findCommand_(commandRows_(), normalizedKey);
      return found ? clone_(rowToCommand_(found.row)) : null;
    },
    reserve: function (record) {
      return withLock_(function () {
        var normalized = validateCommandRecord_(clone_(record));
        if (findCommand_(commandRows_(), normalized.idempotencyKey)) {
          throw error_("INSCRIPTIONS_IDEMPOTENCY_CONFLICT", "Clé idempotente déjà réservée.");
        }
        var actor = technicalActor_();
        var candidateRow = commandToRow_(normalized, actor, actor);
        gateway.appendRow("Commandes", candidateRow);
        var persisted = findCommand_(commandRows_(), normalized.idempotencyKey);
        if (!persisted || !samePersistedRow_(persisted.row, candidateRow)) {
          throw error_("INSCRIPTIONS_JOURNAL_INVALID", "Réservation persistée incohérente.");
        }
        return clone_(rowToCommand_(persisted.row));
      });
    },
    save: function (record, expectedVersion) {
      return withLock_(function () {
        var normalized = validateCommandRecord_(clone_(record));
        var expected = positiveInteger_(expectedVersion, false);
        var rows = commandRows_();
        var found = findCommand_(rows, normalized.idempotencyKey);
        if (!found || expected === null || Number(found.row[19]) !== expected ||
            normalized.version !== expected + 1) {
          throw error_("INSCRIPTIONS_JOURNAL_VERSION_CONFLICT", "Version de journal concurrente.");
        }
        var createdBy = text_(found.row[16]);
        if (!createdBy) throw error_("INSCRIPTIONS_JOURNAL_INVALID", "Auteur de création du journal absent.");
        var updatedBy = technicalActor_();
        var candidateRow = commandToRow_(normalized, createdBy, updatedBy);
        if (!sameCommandIdentity_(found.row, candidateRow)) {
          throw error_("INSCRIPTIONS_IDEMPOTENCY_CONFLICT", "Identité de commande Inscriptions incohérente.");
        }
        gateway.updateRow("Commandes", found.rowNumber, candidateRow);
        var persisted = findCommand_(commandRows_(), normalized.idempotencyKey);
        if (!persisted || !samePersistedRow_(persisted.row, candidateRow)) {
          throw error_("INSCRIPTIONS_JOURNAL_INVALID", "Mise à jour persistée incohérente.");
        }
        return clone_(rowToCommand_(persisted.row));
      });
    }
  });

  function validateSequence_(sequenceType, scopeKey) {
    var type = upper_(sequenceType);
    var scope = upper_(scopeKey);
    var definition = SEQUENCES[type];
    if (!definition || !definition.scope.test(scope)) {
      throw error_("INSCRIPTIONS_SEQUENCE_CONFLICT", "Portée de séquence Inscriptions invalide.");
    }
    return { type: type, scope: scope, definition: definition };
  }

  function formatSequence_(definition, scope, value) {
    var year = scope === "GLOBAL" ? "" : "-" + scope.slice(0, 4);
    return definition.prefix + year + "-" + ("000000" + value).slice(-6);
  }

  var sequences = Object.freeze({
    allocate: function (sequenceType, scopeKey) {
      return withLock_(function () {
        var sequence = validateSequence_(sequenceType, scopeKey);
        var normalizedActor = technicalActor_();
        var rows = gateway.readRows("Sequences");
        assertHeaders_("Sequences", rows);
        var matches = [];
        rows.slice(1).forEach(function (row, index) {
          if (upper_(row[0]) === sequence.type && upper_(row[1]) === sequence.scope) {
            matches.push({ rowNumber: index + 2, row: row });
          }
        });
        if (matches.length > 1) {
          throw error_("INSCRIPTIONS_SEQUENCE_CONFLICT", "Séquence Inscriptions dupliquée.");
        }
        var now = timestamp_();
        var nextValue = 1;
        var nextVersion = 1;
        if (matches.length) {
          var currentValue = positiveInteger_(matches[0].row[2], true);
          var currentVersion = positiveInteger_(matches[0].row[3], true);
          if (currentValue === null || currentVersion === null) {
            throw error_("INSCRIPTIONS_SEQUENCE_CONFLICT", "Séquence Inscriptions incohérente.");
          }
          nextValue = currentValue + 1;
          nextVersion = currentVersion + 1;
        }
        var candidateRow = [
          sequence.type, sequence.scope, nextValue, nextVersion, now, normalizedActor
        ];
        if (matches.length) {
          gateway.updateRow("Sequences", matches[0].rowNumber, candidateRow);
        } else {
          gateway.appendRow("Sequences", candidateRow);
        }
        var persisted = gateway.readRows("Sequences").slice(1).filter(function (row) {
          return upper_(row[0]) === sequence.type && upper_(row[1]) === sequence.scope;
        });
        if (persisted.length !== 1 || !samePersistedRow_(persisted[0], candidateRow)) {
          throw error_("INSCRIPTIONS_SEQUENCE_CONFLICT", "Séquence Inscriptions non vérifiée.");
        }
        return Object.freeze({
          id: formatSequence_(sequence.definition, sequence.scope, nextValue),
          sequenceType: sequence.type,
          scopeKey: sequence.scope,
          value: nextValue,
          version: nextVersion
        });
      });
    }
  });

  assertDependencies_();
  return Object.freeze({
    assertRecipe: assertRecipe_,
    journal: journal,
    sequences: sequences,
    audit: audit,
    getSchema: function () {
      return Object.freeze({
        version: SCHEMA_VERSION,
        timezone: TIMEZONE,
        resourceKind: RESOURCE_KIND,
        sheets: SHEETS.slice(),
        headers: clone_(HEADERS),
        metadataKeys: METADATA_KEYS.slice()
      });
    }
  });
};
