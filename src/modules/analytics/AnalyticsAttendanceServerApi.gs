var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Secure server boundary for attendance entry.
 *
 * Browser calls never provide identity, authorization, repository or storage
 * dependencies. Production composition is performed exclusively server-side.
 */
function AKS_createAttendanceServerApi_(options) {
  "use strict";

  options = options || {};

  function failure_(code, message) {
    return {
      ok: false,
      error: {
        code: code || "ATTENDANCE_SERVER_ERROR",
        message: message || "Le service de saisie est temporairement indisponible."
      }
    };
  }

  function publicFailure_(failure) {
    var known = {
      ACCESS_AUTH_REQUIRED: "Le compte Google n'a pas pu être identifié.",
      ACCESS_DENIED: "Accès non autorisé.",
      ACCESS_COURSE_DENIED: "Accès au cours non autorisé.",
      ACCESS_CAPABILITY_DENIED: "Opération non autorisée.",
      ACCESS_SCOPE_INVALID: "Le cours ou la saison est invalide.",
      ACCESS_REGISTRY_INVALID: "La configuration des accès est indisponible.",
      ATTENDANCE_COMMAND_INVALID: "La demande de saisie est invalide.",
      ATTENDANCE_MEMBER_INVALID: "Un licencié de la saisie est invalide.",
      ATTENDANCE_STATUS_INVALID: "Un statut de présence est invalide.",
      ATTENDANCE_INCOMPLETE: "Toutes les présences doivent être renseignées.",
      ATTENDANCE_VERSION_CONFLICT: "La séance a été modifiée. Rechargez-la.",
      ATTENDANCE_SUBMISSION_CONFLICT: "Cette demande a déjà été utilisée.",
      ATTENDANCE_SESSION_NOT_FOUND: "La séance est introuvable.",
      ATTENDANCE_LOCK_TIMEOUT: "Une autre saisie est en cours."
    };
    var code = failure && known[failure.code] ? failure.code : "ATTENDANCE_SERVER_ERROR";
    return failure_(code, known[code]);
  }

  function composition_() {
    if (options.access && options.writeService) {
      return {
        access: options.access,
        writeService: options.writeService,
        repository: options.repository || null
      };
    }
    if (!AKS.Analytics.AttendanceSheetsRepository ||
        !AKS.Analytics.AttendanceWriteService ||
        typeof AKS_createAccessService_ !== "function") {
      throw new Error("Composition serveur indisponible.");
    }
    var repository = AKS.Analytics.AttendanceSheetsRepository.create();
    return {
      access: AKS_createAccessService_({ courseProvider: repository.courseProvider }),
      writeService: AKS.Analytics.AttendanceWriteService,
      repository: repository
    };
  }

  function getAccessContext() {
    try {
      var composition = composition_();
      var context = composition.access.getEffectiveAccessContext();
      return {
        ok: true,
        data: {
          identity: context.email,
          bootstrap: context.bootstrap === true,
          courses: (context.courses || []).map(function (course) {
            return { code: course.code, season: course.season };
          })
        }
      };
    } catch (failure) {
      return publicFailure_(failure);
    }
  }

  function getWorkspace(scope) {
    try {
      scope = scope || {};
      var courseCode = String(scope.courseCode || "").trim().toUpperCase();
      var season = String(scope.season || "").trim();
      var sessionDate = String(scope.sessionDate || "").trim();
      if (!courseCode || !/^\d{4}-\d{4}$/.test(season) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
        throw { code: "ATTENDANCE_COMMAND_INVALID" };
      }
      var composition = composition_();
      if (!composition.repository ||
          !composition.repository.resolver ||
          !composition.repository.adapter ||
          typeof composition.repository.adapter.listWorkspace !== "function") {
        throw new Error("Lecture des séances indisponible.");
      }
      composition.access.assertCapability("ATTENDANCE_READ", courseCode, season);
      var context = composition.repository.resolver.resolve(courseCode, season);
      var workspace = composition.repository.adapter.listWorkspace(context, sessionDate);
      return {
        ok: true,
        data: {
          courseCode: courseCode,
          season: season,
          sessionDate: sessionDate,
          eligibleCount: Number(workspace.eligibleCount || 0),
          eligibleMembers: (workspace.eligibleMembers || []).map(function (member) {
            return {
              id: String(member.id || ""),
              displayName: String(member.displayName || member.id || "")
            };
          }),
          currentSession: workspace.currentSession ? {
            id: String(workspace.currentSession.id || ""),
            date: String(workspace.currentSession.date || ""),
            workflowState: String(workspace.currentSession.workflowState || ""),
            version: Number(workspace.currentSession.version || 0),
            attendances: (workspace.currentSession.attendances || []).map(function (entry) {
              return {
                licencieId: String(entry.licencieId || ""),
                status: String(entry.status || "")
              };
            })
          } : null,
          sessions: (workspace.sessions || []).map(function (session) {
            return {
              id: String(session.id || ""),
              date: String(session.date || ""),
              workflowState: String(session.workflowState || ""),
              version: Number(session.version || 0)
            };
          })
        }
      };
    } catch (failure) {
      return publicFailure_(failure);
    }
  }

  function saveAttendanceBatch(command) {
    try {
      var composition = composition_();
      return composition.writeService.saveAttendanceBatch(command || {});
    } catch (failure) {
      return publicFailure_(failure);
    }
  }

  return Object.freeze({
    getAccessContext: getAccessContext,
    getWorkspace: getWorkspace,
    saveAttendanceBatch: saveAttendanceBatch
  });
}

/**
 * google.script.run endpoint used to initialize the future mobile interface.
 */
function AKS_getAttendanceAccessContext() {
  return AKS_createAttendanceServerApi_().getAccessContext();
}

/**
 * google.script.run endpoint used to save or close an attendance batch.
 *
 * @param {Object} command
 * @returns {Object}
 */
function AKS_saveAttendanceBatch(command) {
  return AKS_createAttendanceServerApi_().saveAttendanceBatch(command);
}

/**
 * Returns a read-only, authorized workspace for the mobile attendance page.
 */
function AKS_getAttendanceWorkspace(scope) {
  return AKS_createAttendanceServerApi_().getWorkspace(scope);
}
