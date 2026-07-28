var AKS = AKS || {};

function AKS_assertAnalyticsSaisie003_(condition, message) {
  if (!condition) throw new Error(message);
}

function AKS_attendanceSaisie003Api_(access, repository) {
  return AKS_createAttendanceServerApi_({
    access: access,
    repository: repository,
    writeService: { saveAttendanceBatch: function () { return { ok: true }; } }
  });
}

function AKS_testAnalyticsSaisie003_deniesBeforeWorkspaceRead_() {
  var reads = 0;
  var api = AKS_attendanceSaisie003Api_({
    assertCapability: function () {
      var error = new Error("denied");
      error.code = "ACCESS_CAPABILITY_DENIED";
      throw error;
    }
  }, {
    resolver: { resolve: function () { reads += 1; return {}; } },
    adapter: { listWorkspace: function () { reads += 1; return {}; } }
  });
  var result = api.getWorkspace({
    courseCode: "BABY", season: "2026-2027", sessionDate: "2026-09-19"
  });
  AKS_assertAnalyticsSaisie003_(!result.ok, "Le refus doit être retourné au client.");
  AKS_assertAnalyticsSaisie003_(reads === 0, "Aucune lecture Sheets ne doit précéder l'autorisation.");
}

function AKS_testAnalyticsSaisie003_rejectsInvalidWorkspaceScope_() {
  var authorized = 0;
  var api = AKS_attendanceSaisie003Api_({
    assertCapability: function () { authorized += 1; }
  }, {
    resolver: { resolve: function () { return {}; } },
    adapter: { listWorkspace: function () { return {}; } }
  });
  var result = api.getWorkspace({
    courseCode: "BABY", season: "2026-2027", sessionDate: "19/09/2026"
  });
  AKS_assertAnalyticsSaisie003_(!result.ok, "Une date non ISO doit être refusée.");
  AKS_assertAnalyticsSaisie003_(authorized === 0, "Le périmètre invalide doit être rejeté immédiatement.");
}

function AKS_testAnalyticsSaisie003_returnsSafeWorkspace_() {
  var capability = "";
  var api = AKS_attendanceSaisie003Api_({
    assertCapability: function (value) { capability = value; }
  }, {
    resolver: { resolve: function () { return { privateBook: true }; } },
    adapter: {
      listWorkspace: function () {
        return {
          eligibleCount: 2,
          sessions: [{
            id: "SEA-001",
            date: "2026-09-12",
            workflowState: "CLOTUREE",
            version: 2,
            modifiedBy: "secret@example.test"
          }]
        };
      }
    }
  });
  var result = api.getWorkspace({
    courseCode: "baby", season: "2026-2027", sessionDate: "2026-09-19"
  });
  AKS_assertAnalyticsSaisie003_(result.ok, "L'espace autorisé doit être retourné.");
  AKS_assertAnalyticsSaisie003_(capability === "ATTENDANCE_READ", "La capacité de lecture est obligatoire.");
  AKS_assertAnalyticsSaisie003_(result.data.courseCode === "BABY", "Le code cours doit être normalisé.");
  AKS_assertAnalyticsSaisie003_(result.data.eligibleCount === 2, "L'effectif doit être exposé.");
  AKS_assertAnalyticsSaisie003_(!("modifiedBy" in result.data.sessions[0]), "L'identité technique ne doit pas être exposée.");
  AKS_assertAnalyticsSaisie003_(!("privateBook" in result.data), "Le classeur ne doit pas être exposé.");
}

function AKS_testAnalyticsSaisie003_exposesMobilePage_() {
  var source = AKS_includeAttendanceFile_("ui/analytics/Attendance");
  AKS_assertAnalyticsSaisie003_(AKS.Analytics.AttendancePage &&
    typeof AKS.Analytics.AttendancePage.render === "function",
    "La page de présences doit être rendable.");
  AKS_assertAnalyticsSaisie003_(source.indexOf('id="course"') !== -1 &&
    source.indexOf('id="session-date"') !== -1 &&
    source.indexOf('id="session-list"') !== -1,
    "Le parcours cours puis séance doit être présent.");
}

function AKS_testAnalyticsSaisie003_hasAccessibleFeedback_() {
  var source = AKS_includeAttendanceFile_("ui/analytics/Attendance");
  AKS_assertAnalyticsSaisie003_(source.indexOf('aria-live="polite"') !== -1 &&
    source.indexOf('role="status"') !== -1,
    "Les retours doivent être annoncés aux technologies d'assistance.");
}

function AKS_testAnalyticsSaisie003_hasMobileTargets_() {
  var style = AKS_includeAttendanceFile_("ui/analytics/AttendanceStyle");
  var client = AKS_includeAttendanceFile_("ui/analytics/AttendanceClient");
  AKS_assertAnalyticsSaisie003_(style.indexOf("min-height: 48px") !== -1,
    "Les contrôles mobiles doivent dépasser 44 px.");
  AKS_assertAnalyticsSaisie003_(client.indexOf(".AKS_getAttendanceWorkspace") !== -1 &&
    client.indexOf("withFailureHandler") !== -1,
    "Le client doit utiliser uniquement l'API serveur et gérer l'indisponibilité.");
}
