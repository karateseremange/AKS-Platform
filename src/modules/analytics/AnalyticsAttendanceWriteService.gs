var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Contrat d'écriture transactionnel des séances et présences.
 *
 * Le service n'est pas exposé directement au navigateur. L'identité,
 * l'autorisation, la résolution du classeur et l'adaptateur de stockage sont
 * des dépendances serveur. En l'absence d'une dépendance d'autorisation
 * conforme, l'accès est refusé.
 */
AKS.Analytics.AttendanceWriteService = (function () {
  "use strict";

  var RULE_VERSION = "analytics-attendance-write/1.0.0";
  var SESSION_STATES = ["REALISEE", "ANNULEE", "EXCLUE"];
  var WORKFLOW_STATES = ["BROUILLON", "CLOTUREE"];
  var ATTENDANCE_STATES = ["PRESENT", "ABSENT", "EXCUSE", "NON_RENSEIGNE"];

  function error_(code, message, details) {
    var failure = new Error(message);
    failure.code = code;
    failure.details = details || null;
    return failure;
  }

  function text_(value) {
    return value === null || typeof value === "undefined" ? "" : String(value).trim();
  }

  function upper_(value) {
    return text_(value).toUpperCase();
  }

  function season_(value) {
    var normalized = text_(value);
    if (!/^\d{4}-\d{4}$/.test(normalized) ||
        Number(normalized.slice(5)) !== Number(normalized.slice(0, 4)) + 1) {
      throw error_("ATTENDANCE_COMMAND_INVALID", "La saison est invalide.");
    }
    return normalized;
  }

  function date_(value) {
    var normalized = text_(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) ||
        isNaN(new Date(normalized + "T00:00:00Z").getTime())) {
      throw error_("ATTENDANCE_COMMAND_INVALID", "La date de séance est invalide.");
    }
    return normalized;
  }

  function defaultLock_() {
    var lock = LockService.getScriptLock();
    return {
      acquire: function () { return lock.tryLock(30000); },
      release: function () { lock.releaseLock(); }
    };
  }

  function defaultClock_() {
    return new Date().toISOString();
  }

  function defaultCorrelationId_() {
    return Utilities.getUuid();
  }

  function defaultSubmissionStore_() {
    var cache = CacheService.getScriptCache();
    return {
      get: function (id) {
        var value = cache.get("AKS_ATTENDANCE_SUBMISSION." + id);
        return value ? JSON.parse(value) : null;
      },
      put: function (id, value) {
        cache.put("AKS_ATTENDANCE_SUBMISSION." + id, JSON.stringify(value), 21600);
      }
    };
  }

  function defaultFingerprint_(value) {
    var bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      JSON.stringify(value),
      Utilities.Charset.UTF_8
    );
    return bytes.map(function (byte) {
      var normalized = byte < 0 ? byte + 256 : byte;
      return ("0" + normalized.toString(16)).slice(-2);
    }).join("");
  }

  function dependencies_(options) {
    options = options || {};
    var repository = null;
    if ((!options.resolver || !options.adapter || !options.access) &&
        AKS.Analytics.AttendanceSheetsRepository) {
      repository = AKS.Analytics.AttendanceSheetsRepository.create();
    }
    var accessFactory = options.access_factory || function (courseProvider) {
      if (typeof AKS_createAccessService_ !== "function") return null;
      return AKS_createAccessService_({ courseProvider: courseProvider });
    };
    return {
      access: options.access || accessFactory(repository && repository.courseProvider),
      resolver: options.resolver || (repository && repository.resolver),
      adapter: options.adapter || (repository && repository.adapter),
      lock: options.lock || defaultLock_(),
      submissions: options.submission_store || defaultSubmissionStore_(),
      clock: options.clock || defaultClock_,
      correlation: options.correlation_id_provider || defaultCorrelationId_,
      fingerprint: options.fingerprint_provider || defaultFingerprint_,
      id: options.session_id_provider || function () {
        return "SEA-" + Utilities.getUuid().replace(/-/g, "").slice(0, 12).toUpperCase();
      },
      audit: options.audit || { record: function () {} },
      logger: options.logger || { critical: function () {} }
    };
  }

  function assertDependencies_(dependencies) {
    if (!dependencies.access ||
        typeof dependencies.access.assertCapability !== "function") {
      throw error_("ACCESS_REGISTRY_INVALID", "Configuration d'accès indisponible.");
    }
    if (!dependencies.resolver ||
        typeof dependencies.resolver.resolve !== "function" ||
        !dependencies.adapter) {
      throw error_("ATTENDANCE_WRITE_FAILED", "Configuration d'écriture indisponible.");
    }
  }

  function normalizeCommand_(command) {
    command = command || {};
    var normalized = {
      courseCode: upper_(command.courseCode),
      season: season_(command.season),
      sessionId: text_(command.sessionId),
      sessionDate: command.sessionDate ? date_(command.sessionDate) : "",
      expectedVersion: Number(command.expectedVersion),
      submissionId: text_(command.submissionId),
      targetState: upper_(command.targetState),
      correctionReason: text_(command.correctionReason),
      attendances: []
    };
    if (!normalized.courseCode || !normalized.submissionId ||
        !/^[A-Za-z0-9._:-]{8,128}$/.test(normalized.submissionId) ||
        WORKFLOW_STATES.indexOf(normalized.targetState) === -1 ||
        (!normalized.sessionId && !normalized.sessionDate)) {
      throw error_("ATTENDANCE_COMMAND_INVALID", "La commande de présence est invalide.");
    }
    if (!Array.isArray(command.attendances)) {
      throw error_("ATTENDANCE_COMMAND_INVALID", "Le lot de présences est obligatoire.");
    }
    var seen = {};
    command.attendances.forEach(function (entry) {
      var memberId = text_(entry && entry.licencieId);
      var status = upper_(entry && entry.status);
      if (!memberId || seen[memberId]) {
        throw error_("ATTENDANCE_MEMBER_INVALID", "Un licencié est absent ou dupliqué.");
      }
      if (ATTENDANCE_STATES.indexOf(status) === -1) {
        throw error_("ATTENDANCE_STATUS_INVALID", "Un statut de présence est invalide.");
      }
      seen[memberId] = true;
      normalized.attendances.push({ licencieId: memberId, status: status });
    });
    normalized.attendances.sort(function (left, right) {
      return left.licencieId < right.licencieId ? -1 :
        (left.licencieId > right.licencieId ? 1 : 0);
    });
    return normalized;
  }

  function capability_(command, persisted) {
    if (persisted && persisted.workflowState === "CLOTUREE") {
      return "ATTENDANCE_CORRECT_CLOSED";
    }
    if (command.targetState === "CLOTUREE") return "SESSION_CLOSE";
    return persisted ? "ATTENDANCE_WRITE_DRAFT" : "SESSION_CREATE";
  }

  function validateMembers_(command, context) {
    var eligible = {};
    (context.eligibleMembers || []).forEach(function (member) {
      eligible[text_(member.id)] = true;
    });
    command.attendances.forEach(function (attendance) {
      if (!eligible[attendance.licencieId]) {
        throw error_("ATTENDANCE_MEMBER_INVALID",
          "Un licencié n'est pas éligible à cette séance.");
      }
    });
    if (command.targetState === "CLOTUREE") {
      if (command.attendances.length !== Object.keys(eligible).length ||
          command.attendances.some(function (attendance) {
            return attendance.status === "NON_RENSEIGNE";
          })) {
        throw error_("ATTENDANCE_INCOMPLETE",
          "Tous les licenciés éligibles doivent être renseignés avant clôture.");
      }
    }
  }

  function publicResult_(command, session, correlationId) {
    var completed = command.attendances.filter(function (attendance) {
      return attendance.status !== "NON_RENSEIGNE";
    }).length;
    return {
      ok: true,
      submissionId: command.submissionId,
      sessionId: session.id,
      sessionDate: session.date,
      workflowState: session.workflowState,
      version: session.version,
      savedCount: command.attendances.length,
      completedCount: completed,
      expectedCount: session.expectedCount,
      correlationId: correlationId
    };
  }

  function saveAttendanceBatch(command, options) {
    var dependencies = dependencies_(options);
    assertDependencies_(dependencies);
    command = normalizeCommand_(command);
    var fingerprint = dependencies.fingerprint(command);
    var replay = dependencies.submissions.get(command.submissionId);
    if (replay) {
      if (replay.fingerprint !== fingerprint) {
        throw error_("ATTENDANCE_SUBMISSION_CONFLICT",
          "Cet identifiant de soumission a déjà été utilisé.");
      }
      return replay.result;
    }
    if (!dependencies.lock.acquire()) {
      throw error_("ATTENDANCE_LOCK_TIMEOUT", "Une autre saisie est en cours.");
    }
    var correlationId = dependencies.correlation();
    var snapshot = null;
    var context = null;
    var persisted = null;
    try {
      dependencies.access.assertCapability(
        "ATTENDANCE_READ",
        command.courseCode,
        command.season
      );
      context = dependencies.resolver.resolve(command.courseCode, command.season);
      persisted = dependencies.adapter.findSession(
        context, command.sessionId, command.sessionDate);
      dependencies.access.assertCapability(
        capability_(command, persisted),
        command.courseCode,
        command.season
      );
      if (persisted && persisted.workflowState === "CLOTUREE" &&
          !command.correctionReason) {
        throw error_("ATTENDANCE_COMMAND_INVALID",
          "Un motif est obligatoire pour corriger une séance clôturée.");
      }
      if (persisted && Number(command.expectedVersion) !== Number(persisted.version)) {
        throw error_("ATTENDANCE_VERSION_CONFLICT",
          "La séance a été modifiée depuis son chargement.");
      }
      if (!persisted && command.sessionId) {
        throw error_("ATTENDANCE_SESSION_NOT_FOUND", "La séance est introuvable.");
      }
      if (!persisted && Number(command.expectedVersion || 0) !== 0) {
        throw error_("ATTENDANCE_VERSION_CONFLICT", "La version de création est invalide.");
      }
      validateMembers_(command, context);
      snapshot = dependencies.adapter.snapshot(context, persisted);
      var now = dependencies.clock();
      var actor = dependencies.access.getCurrentIdentity ?
        text_(dependencies.access.getCurrentIdentity()) : "";
      var session = persisted || {
        id: dependencies.id(),
        date: command.sessionDate,
        state: "REALISEE",
        workflowState: "BROUILLON",
        version: 0
      };
      session = {
        id: session.id,
        date: session.date,
        state: upper_(session.state || "REALISEE"),
        workflowState: command.targetState,
        version: Number(session.version || 0) + 1,
        modifiedAt: now,
        modifiedBy: actor,
        expectedCount: (context.eligibleMembers || []).length
      };
      if (SESSION_STATES.indexOf(session.state) === -1) {
        throw error_("ATTENDANCE_SESSION_STATE_INVALID", "L'état de séance est invalide.");
      }
      dependencies.adapter.replaceBatch(context, session, command.attendances);
      dependencies.adapter.verify(context, session, command.attendances);
      var result = publicResult_(command, session, correlationId);
      dependencies.audit.record({
        action: persisted && persisted.workflowState === "CLOTUREE" ?
          "ATTENDANCE_CORRECT_CLOSED" :
          (command.targetState === "CLOTUREE" ? "SESSION_CLOSE" :
            (persisted ? "ATTENDANCE_SAVE_DRAFT" : "SESSION_CREATE")),
        courseCode: command.courseCode,
        season: command.season,
        sessionId: session.id,
        versionBefore: persisted ? persisted.version : 0,
        versionAfter: session.version,
        correctionReason: command.correctionReason || null,
        correlationId: correlationId
      });
      dependencies.submissions.put(command.submissionId, {
        fingerprint: fingerprint,
        result: result
      });
      return result;
    } catch (failure) {
      if (snapshot !== null) {
        try {
          dependencies.adapter.restore(context, snapshot);
        } catch (rollbackFailure) {
          dependencies.logger.critical("ATTENDANCE_ROLLBACK_FAILED", {
            correlationId: correlationId
          });
          throw error_("ATTENDANCE_ROLLBACK_FAILED",
            "La restauration de la saisie a échoué.");
        }
      }
      throw failure.code ? failure :
        error_("ATTENDANCE_WRITE_FAILED", "L'enregistrement a échoué.");
    } finally {
      dependencies.lock.release();
    }
  }

  function createOrGetTodaySession(command, options) {
    command = command || {};
    command.targetState = "BROUILLON";
    command.attendances = command.attendances || [];
    return saveAttendanceBatch(command, options);
  }

  function closeAttendanceSession(command, options) {
    command = command || {};
    command.targetState = "CLOTUREE";
    return saveAttendanceBatch(command, options);
  }

  function correctClosedAttendance(command, options) {
    command = command || {};
    command.targetState = "CLOTUREE";
    return saveAttendanceBatch(command, options);
  }

  function getAttendanceSession(courseCode, season, sessionId, options) {
    var dependencies = dependencies_(options);
    assertDependencies_(dependencies);
    dependencies.access.assertCapability("ATTENDANCE_READ", upper_(courseCode), season_(season));
    var context = dependencies.resolver.resolve(upper_(courseCode), season_(season));
    return dependencies.adapter.getSession(context, text_(sessionId));
  }

  return Object.freeze({
    RULE_VERSION: RULE_VERSION,
    SESSION_STATES: SESSION_STATES.slice(),
    WORKFLOW_STATES: WORKFLOW_STATES.slice(),
    ATTENDANCE_STATES: ATTENDANCE_STATES.slice(),
    createOrGetTodaySession: createOrGetTodaySession,
    saveAttendanceBatch: saveAttendanceBatch,
    closeAttendanceSession: closeAttendanceSession,
    correctClosedAttendance: correctClosedAttendance,
    getAttendanceSession: getAttendanceSession
  });
}());
