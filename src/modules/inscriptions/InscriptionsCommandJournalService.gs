var AKS = AKS || {};
AKS.Inscriptions = AKS.Inscriptions || {};

/**
 * INSCRIPTIONS-009 journaled command and recovery service.
 *
 * The journal, repository, audit, access authority and clock are injected.
 * This service deliberately contains no Google API and exposes no route.
 */
AKS.Inscriptions.createCommandJournalService = function (options) {
  "use strict";

  options = options || {};
  var access = options.access;
  var journal = options.journal;
  var repository = options.repository;
  var audit = options.audit;
  var clock = options.clock || function () { return new Date(); };
  var SCHEMA_VERSION = "inscriptions-command/1.0";
  var MAX_ATTEMPTS = 3;
  var ACTION_CAPABILITIES = {
    DOSSIER_CREATE: "INSCRIPTIONS_WRITE",
    DOSSIER_UPDATE: "INSCRIPTIONS_WRITE"
  };
  var STATUSES = {
    INTENTION: true,
    EN_COURS: true,
    CONFIRMEE: true,
    ECHEC_RECUPERABLE: true,
    ECHEC_FINAL: true
  };
  var TRANSITIONS = {
    INTENTION: { EN_COURS: true, ECHEC_RECUPERABLE: true, ECHEC_FINAL: true },
    EN_COURS: { CONFIRMEE: true, ECHEC_RECUPERABLE: true, ECHEC_FINAL: true },
    ECHEC_RECUPERABLE: { EN_COURS: true, ECHEC_FINAL: true },
    CONFIRMEE: {},
    ECHEC_FINAL: {}
  };

  function error_(code, message) {
    var failure = new Error(message);
    failure.code = code;
    return failure;
  }

  function upper_(value) {
    return String(value || "").trim().toUpperCase();
  }

  function text_(value) {
    return String(value || "").trim();
  }

  function clone_(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function timestamp_() {
    var instant = clock();
    if (!(instant instanceof Date) || isNaN(instant.getTime())) {
      throw error_("INSCRIPTIONS_CLOCK_INVALID", "Horloge Inscriptions invalide.");
    }
    return instant.toISOString();
  }

  function canonicalize_(value) {
    if (value === null || typeof value !== "object") return value;
    if (Object.prototype.toString.call(value) === "[object Array]") {
      return value.map(canonicalize_);
    }
    var normalized = {};
    Object.keys(value).sort().forEach(function (key) {
      if (typeof value[key] !== "undefined") normalized[key] = canonicalize_(value[key]);
    });
    return normalized;
  }

  function stable_(value) {
    return JSON.stringify(canonicalize_(value));
  }

  function normalizeScope_(scope) {
    scope = scope || {};
    return {
      module: upper_(scope.module),
      season: text_(scope.season),
      section: upper_(scope.section),
      courseCode: upper_(scope.courseCode)
    };
  }

  function normalizeTarget_(target) {
    if (target === null || typeof target === "undefined") return "";
    if (typeof target === "object") {
      return {
        type: upper_(target.type),
        id: text_(target.id)
      };
    }
    return text_(target);
  }

  function ensureDependencies_() {
    var journalMethods = ["load", "reserve", "save"];
    var repositoryMethods = ["reconcile", "prepare", "commit", "readBack", "verify"];
    if (!access || typeof access.assertInscriptionsCapability !== "function" ||
        typeof access.getCurrentIdentity !== "function" || !journal || !repository ||
        !audit || typeof audit.record !== "function" ||
        journalMethods.some(function (method) { return typeof journal[method] !== "function"; }) ||
        repositoryMethods.some(function (method) { return typeof repository[method] !== "function"; })) {
      throw error_("INSCRIPTIONS_DEPENDENCY_INVALID", "Dépendance Inscriptions invalide.");
    }
  }

  function normalizeCommand_(command) {
    command = command || {};
    var normalized = {
      capability: upper_(command.capability),
      action: upper_(command.action),
      target: normalizeTarget_(command.target),
      scope: normalizeScope_(command.scope),
      payloadFingerprint: text_(command.payloadFingerprint),
      idempotencyKey: text_(command.idempotencyKey),
      correlationId: text_(command.correlationId),
      payload: command.payload
    };
    return normalized;
  }

  function validateCommand_(normalized) {
    var targetValid = typeof normalized.target === "string" ? !!normalized.target :
      !!(normalized.target && normalized.target.type && normalized.target.id);
    if (!ACTION_CAPABILITIES[normalized.action] || !normalized.idempotencyKey ||
        !normalized.correlationId || !normalized.payloadFingerprint ||
        !normalized.scope.module || !normalized.scope.season || !normalized.scope.section ||
        !targetValid) {
      throw error_("INSCRIPTIONS_COMMAND_INVALID", "Commande Inscriptions invalide.");
    }
  }

  function authorize_(command) {
    ensureDependencies_();
    access.assertInscriptionsCapability(
      ACTION_CAPABILITIES[command.action] || "INSCRIPTIONS_WRITE",
      command.scope
    );
    var actor = text_(access.getCurrentIdentity()).toLowerCase();
    if (!actor) throw error_("INSCRIPTIONS_IDENTITY_INVALID", "Identité Inscriptions invalide.");
    return actor;
  }

  function validateRecord_(record) {
    if (!record || record.schemaVersion !== SCHEMA_VERSION || !STATUSES[record.status] ||
        !record.commandId || !record.idempotencyKey || !record.correlationId ||
        typeof record.version !== "number" || record.version < 1 ||
        typeof record.attemptCount !== "number" || record.attemptCount < 0 ||
        record.attemptCount > MAX_ATTEMPTS) {
      throw error_("INSCRIPTIONS_JOURNAL_INVALID", "Entrée de journal Inscriptions invalide.");
    }
    return record;
  }

  function sameIdentity_(record, command) {
    return record.action === command.action &&
      stable_(record.target) === stable_(command.target) &&
      stable_(record.scope) === stable_(command.scope) &&
      record.payloadFingerprint === command.payloadFingerprint;
  }

  function buildRecord_(command, actor) {
    var now = timestamp_();
    return {
      schemaVersion: SCHEMA_VERSION,
      commandId: "CMD-" + command.correlationId,
      idempotencyKey: command.idempotencyKey,
      payloadFingerprint: command.payloadFingerprint,
      actor: actor,
      action: command.action,
      target: clone_(command.target),
      scope: clone_(command.scope),
      correlationId: command.correlationId,
      status: "INTENTION",
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
      version: 1
    };
  }

  function transition_(record, nextStatus, failureCode, countAttempt) {
    validateRecord_(record);
    if (!TRANSITIONS[record.status][nextStatus]) {
      throw error_("INSCRIPTIONS_TRANSITION_INVALID", "Transition de commande refusée.");
    }
    var next = clone_(record);
    next.status = nextStatus;
    next.updatedAt = timestamp_();
    next.version = record.version + 1;
    delete next.failureCode;
    if (nextStatus === "EN_COURS") {
      if (countAttempt !== false) {
        if (record.attemptCount >= MAX_ATTEMPTS) {
          throw error_("INSCRIPTIONS_ATTEMPTS_EXHAUSTED", "Nombre maximal de tentatives atteint.");
        }
        next.attemptCount = record.attemptCount + 1;
      }
    }
    if (nextStatus === "ECHEC_RECUPERABLE" || nextStatus === "ECHEC_FINAL") {
      next.failureCode = upper_(failureCode || "INSCRIPTIONS_COMMAND_FAILED");
    }
    var saved = journal.save(Object.freeze(next), record.version);
    return validateRecord_(saved);
  }

  function auditEvent_(record, actor, result, reason) {
    var event = {
      actor: actor,
      action: record.action,
      target: clone_(record.scope),
      result: result,
      date: timestamp_(),
      correlationId: record.correlationId
    };
    if (reason) event.reason = upper_(reason).slice(0, 160);
    return Object.freeze(event);
  }

  function recordAudit_(event) {
    if (audit.record(event) === false) {
      throw error_("INSCRIPTIONS_AUDIT_REQUIRED", "Audit Inscriptions indisponible.");
    }
  }

  function confirmedResult_(record) {
    return Object.freeze({
      status: "CONFIRMEE",
      commandId: record.commandId,
      correlationId: record.correlationId,
      attemptCount: record.attemptCount,
      version: record.version,
      scope: Object.freeze(clone_(record.scope))
    });
  }

  function markFailure_(record, failure) {
    var code = failure && failure.code ? failure.code : "INSCRIPTIONS_COMMAND_FAILED";
    var finalFailure = record.attemptCount >= MAX_ATTEMPTS;
    if (finalFailure) return transition_(record, "ECHEC_FINAL", code);
    if (record.status === "ECHEC_RECUPERABLE") return record;
    return transition_(record, "ECHEC_RECUPERABLE", code);
  }

  function verifyApplied_(record, prepared, actor) {
    var actual = repository.readBack(prepared);
    if (repository.verify(prepared, actual) !== true) {
      throw error_("INSCRIPTIONS_CONTROL_FAILED", "Contrôle Inscriptions en échec.");
    }
    recordAudit_(auditEvent_(record, actor, "REUSSI"));
    return transition_(record, "CONFIRMEE");
  }

  function attempt_(record, command, actor) {
    var running = transition_(record, "EN_COURS");
    var prepared = repository.prepare({
      commandId: running.commandId,
      idempotencyKey: running.idempotencyKey,
      correlationId: running.correlationId,
      action: running.action,
      target: clone_(running.target),
      scope: clone_(running.scope),
      payloadFingerprint: running.payloadFingerprint,
      payload: command.payload
    });
    try {
      repository.commit(prepared);
      return verifyApplied_(running, prepared, actor);
    } catch (failure) {
      try { recordAudit_(auditEvent_(running, actor, "ECHEC", failure.code)); } catch (ignored) {}
      markFailure_(running, failure);
      throw failure;
    }
  }

  function reconcile_(record, command, actor) {
    var state = upper_(repository.reconcile({
      commandId: record.commandId,
      idempotencyKey: record.idempotencyKey,
      correlationId: record.correlationId,
      action: record.action,
      target: clone_(record.target),
      scope: clone_(record.scope),
      payloadFingerprint: record.payloadFingerprint
    }));
    if (state === "APPLIED") {
      if (record.status === "ECHEC_RECUPERABLE") {
        record = transition_(record, "EN_COURS", null, false);
      }
      var prepared = repository.prepare({
        commandId: record.commandId,
        idempotencyKey: record.idempotencyKey,
        correlationId: record.correlationId,
        action: record.action,
        target: clone_(record.target),
        scope: clone_(record.scope),
        payloadFingerprint: record.payloadFingerprint,
        payload: command.payload
      });
      try {
        return verifyApplied_(record, prepared, actor);
      } catch (failure) {
        try { recordAudit_(auditEvent_(record, actor, "ECHEC", failure.code)); } catch (ignored) {}
        markFailure_(record, failure);
        throw failure;
      }
    }
    if (state === "ABSENT") {
      if (record.attemptCount >= MAX_ATTEMPTS) {
        transition_(record, "ECHEC_FINAL", "INSCRIPTIONS_ATTEMPTS_EXHAUSTED");
        throw error_("INSCRIPTIONS_ATTEMPTS_EXHAUSTED", "Nombre maximal de tentatives atteint.");
      }
      if (record.status === "EN_COURS") {
        record = transition_(record, "ECHEC_RECUPERABLE", "INSCRIPTIONS_RECOVERY_ABSENT");
      }
      return attempt_(record, command, actor);
    }
    var ambiguity = error_(
      "INSCRIPTIONS_RECONCILIATION_AMBIGUOUS",
      "Résultat de commande ambigu ou invérifiable."
    );
    try { recordAudit_(auditEvent_(record, actor, "ECHEC", ambiguity.code)); } catch (ignored) {}
    markFailure_(record, ambiguity);
    throw ambiguity;
  }

  function execute(commandInput) {
    var command = normalizeCommand_(commandInput);
    var actor = authorize_(command);
    validateCommand_(command);
    var existing = journal.load(command.idempotencyKey);
    var record;

    if (!existing) {
      record = validateRecord_(journal.reserve(Object.freeze(buildRecord_(command, actor))));
      recordAudit_(auditEvent_(record, actor, "INTENTION"));
      return confirmedResult_(attempt_(record, command, actor));
    }

    record = validateRecord_(existing);
    if (!sameIdentity_(record, command)) {
      throw error_("INSCRIPTIONS_IDEMPOTENCY_CONFLICT", "Clé idempotente déjà réservée.");
    }
    if (record.status === "CONFIRMEE") return confirmedResult_(record);
    if (record.status === "ECHEC_FINAL") {
      throw error_("INSCRIPTIONS_COMMAND_FINAL", "Commande en échec final.");
    }
    if (record.status === "INTENTION") {
      recordAudit_(auditEvent_(record, actor, "INTENTION"));
      return confirmedResult_(attempt_(record, command, actor));
    }
    return confirmedResult_(reconcile_(record, command, actor));
  }

  return Object.freeze({ execute: execute });
};
