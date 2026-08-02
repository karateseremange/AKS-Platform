var AKS = AKS || {};
AKS.Inscriptions = AKS.Inscriptions || {};

/**
 * INSCRIPTIONS-008 guard and audited-command support.
 *
 * Every dependency is injected. This service deliberately contains no Google
 * API and exposes no server route.
 */
AKS.Inscriptions.createAccessAuditService = function (options) {
  "use strict";

  options = options || {};
  var access = options.access;
  var repository = options.repository;
  var audit = options.audit;
  var clock = options.clock || function () { return new Date(); };

  function error_(code, message) {
    var failure = new Error(message);
    failure.code = code;
    return failure;
  }

  function upper_(value) {
    return String(value || "").trim().toUpperCase();
  }

  function ensureDependencies_() {
    if (!access || typeof access.assertInscriptionsCapability !== "function" ||
        typeof access.getCurrentIdentity !== "function" || !repository || !audit ||
        typeof audit.record !== "function") {
      throw error_("INSCRIPTIONS_DEPENDENCY_INVALID", "Dépendance Inscriptions invalide.");
    }
  }

  function normalizeScope_(scope) {
    scope = scope || {};
    return Object.freeze({
      module: upper_(scope.module),
      season: String(scope.season || "").trim(),
      section: upper_(scope.section),
      courseCode: upper_(scope.courseCode)
    });
  }

  function authorize_(capability, scope) {
    ensureDependencies_();
    var normalized = normalizeScope_(scope);
    access.assertInscriptionsCapability(upper_(capability), normalized);
    return normalized;
  }

  function read(input, trustedScope) {
    input = input || {};
    var scope = authorize_("INSCRIPTIONS_READ", trustedScope);
    if (typeof repository.read !== "function") {
      throw error_("INSCRIPTIONS_DEPENDENCY_INVALID", "Dépôt Inscriptions illisible.");
    }
    return repository.read(scope);
  }

  function timestamp_() {
    var instant = clock();
    if (!(instant instanceof Date) || isNaN(instant.getTime())) {
      throw error_("INSCRIPTIONS_CLOCK_INVALID", "Horloge Inscriptions invalide.");
    }
    return instant.toISOString();
  }

  function auditEvent_(actor, command, scope, result, reason) {
    var event = {
      actor: actor,
      action: upper_(command.action),
      target: {
        module: scope.module,
        season: scope.season,
        section: scope.section,
        courseCode: scope.courseCode
      },
      result: result,
      date: timestamp_(),
      correlationId: String(command.correlationId || "").trim()
    };
    if (reason) event.reason = String(reason).trim().slice(0, 160);
    return Object.freeze(event);
  }

  function record_(event) {
    if (audit.record(event) === false) {
      throw error_("INSCRIPTIONS_AUDIT_REQUIRED", "Audit Inscriptions indisponible.");
    }
  }

  function validateCommand_(command, scope) {
    if (!command || !String(command.idempotencyKey || "").trim() ||
        !String(command.correlationId || "").trim() || !upper_(command.action)) {
      throw error_("INSCRIPTIONS_COMMAND_INVALID", "Commande Inscriptions invalide.");
    }
    if (upper_(command.capability) === "INSCRIPTIONS_WRITE" &&
        upper_(command.targetType) === "COURSE_ASSIGNMENT" && !scope.courseCode) {
      throw error_(
        "INSCRIPTIONS_COMMAND_INVALID",
        "Une affectation de cours exige un courseCode."
      );
    }
    ["prepare", "commit", "readBack", "verify", "confirm"].forEach(function (method) {
      if (typeof repository[method] !== "function") {
        throw error_("INSCRIPTIONS_DEPENDENCY_INVALID", "Dépôt Inscriptions incomplet.");
      }
    });
  }

  function execute(command) {
    command = command || {};
    var scope = authorize_(command.capability, command.scope);
    var actor = access.getCurrentIdentity();
    validateCommand_(command, scope);
    var prepared = repository.prepare({
      idempotencyKey: String(command.idempotencyKey).trim(),
      correlationId: String(command.correlationId).trim(),
      action: upper_(command.action),
      scope: scope,
      payload: command.payload
    });

    try {
      record_(auditEvent_(actor, command, scope, "INTENTION"));
    } catch (failure) {
      if (typeof repository.discard === "function") repository.discard(prepared);
      throw failure;
    }

    try {
      repository.commit(prepared);
      var actual = repository.readBack(prepared);
      if (repository.verify(prepared, actual) !== true) {
        throw error_("INSCRIPTIONS_CONTROL_FAILED", "Contrôle Inscriptions en échec.");
      }
      record_(auditEvent_(actor, command, scope, "REUSSI"));
      repository.confirm(prepared);
      return Object.freeze({
        status: "CONFIRMEE",
        correlationId: String(command.correlationId).trim(),
        scope: scope
      });
    } catch (failure) {
      try {
        record_(auditEvent_(
          actor, command, scope, "ECHEC",
          failure && failure.code ? failure.code : "INSCRIPTIONS_COMMAND_FAILED"));
      } catch (ignoredAuditFailure) {}
      throw failure;
    }
  }

  return Object.freeze({
    execute: execute,
    read: read
  });
};
