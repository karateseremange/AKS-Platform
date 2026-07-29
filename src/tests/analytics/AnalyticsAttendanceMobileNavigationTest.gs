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
  var deploymentUrl = "https://script.google.com/macros/s/TEST_DEPLOYMENT/exec";
  var page = AKS_createAttendancePage_(function () {
    return deploymentUrl;
  });
  var viewModel = page.getViewModel({ recipe: true });
  AKS_assertAnalyticsSaisie003_(
    source.indexOf('href="<?= viewModel.navigation.homeTarget ?>"') !== -1 &&
    source.indexOf('href="?app=admin"') === -1 &&
    source.indexOf("Retour au Centre de pilotage") !== -1 &&
    viewModel.navigation.homeTarget === deploymentUrl + "?app=admin",
    "Le retour doit utiliser l'URL absolue du déploiement vers le Centre de pilotage.");
}

function AKS_testAnalyticsSaisie003_hasAccessibleFeedback_() {
  var source = AKS_includeAttendanceFile_("ui/analytics/Attendance");
  AKS_assertAnalyticsSaisie003_(source.indexOf('aria-live="polite"') !== -1 &&
    source.indexOf('role="status"') !== -1 &&
    source.indexOf('id="attendance-action-feedback"') !== -1,
    "Les retours doivent être annoncés aux technologies d'assistance près des actions mobiles.");
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


function AKS_testAnalyticsSaisie004_returnsSafeEligibleRoster_() {
  var api = AKS_attendanceSaisie003Api_({
    assertCapability: function () {}
  }, {
    resolver: { resolve: function () { return {}; } },
    adapter: {
      listWorkspace: function () {
        return {
          eligibleCount: 1,
          eligibleMembers: [{
            id: "LIC-001",
            displayName: "MARTIN Alice",
            email: "secret@example.test"
          }],
          sessions: []
        };
      }
    }
  });
  var result = api.getWorkspace({
    courseCode: "BABY", season: "2026-2027", sessionDate: "2026-09-19"
  });
  AKS_assertAnalyticsSaisie003_(result.ok, "Le roster autorisé doit être retourné.");
  AKS_assertAnalyticsSaisie003_(result.data.eligibleMembers.length === 1,
    "Le licencié éligible doit être exposé.");
  AKS_assertAnalyticsSaisie003_(result.data.eligibleMembers[0].displayName === "MARTIN Alice",
    "Le libellé utile doit être conservé.");
  AKS_assertAnalyticsSaisie003_(!("email" in result.data.eligibleMembers[0]),
    "Aucune donnée individuelle non nécessaire ne doit être exposée.");
}

function AKS_testAnalyticsSaisie004_returnsResumableDraft_() {
  var api = AKS_attendanceSaisie003Api_({
    assertCapability: function () {}
  }, {
    resolver: { resolve: function () { return {}; } },
    adapter: {
      listWorkspace: function () {
        return {
          eligibleCount: 1,
          eligibleMembers: [{ id: "LIC-001", displayName: "MARTIN Alice" }],
          currentSession: {
            id: "SEA-001", date: "2026-09-19", workflowState: "BROUILLON",
            version: 2,
            attendances: [{ licencieId: "LIC-001", status: "PRESENT", modifiedBy: "secret" }]
          },
          sessions: []
        };
      }
    }
  });
  var result = api.getWorkspace({
    courseCode: "BABY", season: "2026-2027", sessionDate: "2026-09-19"
  });
  AKS_assertAnalyticsSaisie003_(result.ok && result.data.currentSession.version === 2,
    "La version du brouillon doit permettre une reprise sûre.");
  AKS_assertAnalyticsSaisie003_(
    result.data.currentSession.attendances[0].status === "PRESENT",
    "Le statut sauvegardé doit être restauré.");
  AKS_assertAnalyticsSaisie003_(
    !("modifiedBy" in result.data.currentSession.attendances[0]),
    "Les métadonnées techniques doivent rester masquées.");
}

function AKS_testAnalyticsSaisie004_exposesRapidStatusControls_() {
  var source = AKS_includeAttendanceFile_("ui/analytics/Attendance");
  var client = AKS_includeAttendanceFile_("ui/analytics/AttendanceClient");
  AKS_assertAnalyticsSaisie003_(source.indexOf('id="attendance-list"') !== -1 &&
    source.indexOf('id="save-draft"') !== -1,
    "Le roster et la sauvegarde du brouillon doivent être présents.");
  AKS_assertAnalyticsSaisie003_(client.indexOf('"PRESENT", "ABSENT", "EXCUSE", "NON_RENSEIGNE"') !== -1 &&
    client.indexOf('aria-pressed') !== -1,
    "Les quatre statuts doivent être utilisables et accessibles.");
}

function AKS_testAnalyticsSaisie004_savesVersionedDraftThroughServer_() {
  var client = AKS_includeAttendanceFile_("ui/analytics/AttendanceClient");
  AKS_assertAnalyticsSaisie003_(client.indexOf("loadWorkspace(successMessage)") !== -1 &&
    client.indexOf("announce(successMessage, true)") !== -1,
    "La confirmation doit rester visible près des actions après le rechargement.");
  AKS_assertAnalyticsSaisie003_(client.indexOf(".AKS_saveAttendanceBatch") !== -1 &&
    client.indexOf('saveBatch("BROUILLON")') !== -1 &&
    client.indexOf("targetState: targetState") !== -1,
    "La sauvegarde doit passer par l'API serveur en mode brouillon.");
  AKS_assertAnalyticsSaisie003_(client.indexOf("currentSession.version") !== -1 &&
    client.indexOf("currentSession.id") !== -1 &&
    client.indexOf("submissionId()") !== -1,
    "La reprise doit transmettre version, séance et clé de soumission.");
  AKS_assertAnalyticsSaisie003_(
    client.indexOf('workflowState === "CLOTUREE"') !== -1 &&
    client.indexOf("disponible en lecture seule") !== -1,
    "Une séance clôturée ne doit pas redevenir un brouillon depuis cet écran.");
}


function AKS_testAnalyticsSaisie005_exposesExplicitClosureConfirmation_() {
  var source = AKS_includeAttendanceFile_("ui/analytics/Attendance");
  AKS_assertAnalyticsSaisie003_(
    source.indexOf('id="close-session"') !== -1 &&
    source.indexOf('id="close-dialog"') !== -1 &&
    source.indexOf('id="confirm-close"') !== -1 &&
    source.indexOf("Après clôture") !== -1,
    "La clôture doit exiger une confirmation explicite."
  );
}

function AKS_testAnalyticsSaisie005_rejectsIncompleteClosureClientSide_() {
  var client = AKS_includeAttendanceFile_("ui/analytics/AttendanceClient");
  AKS_assertAnalyticsSaisie003_(
    client.indexOf('statuses[member.id] === "NON_RENSEIGNE"') !== -1 &&
    client.indexOf("Tous les licenciés doivent être renseignés avant la clôture.") !== -1,
    "Le client doit bloquer une clôture incomplète avant l'appel serveur."
  );
}

function AKS_testAnalyticsSaisie005_closesThroughVersionedServerCommand_() {
  var client = AKS_includeAttendanceFile_("ui/analytics/AttendanceClient");
  AKS_assertAnalyticsSaisie003_(
    client.indexOf('saveBatch("CLOTUREE")') !== -1 &&
    client.indexOf("targetState: targetState") !== -1 &&
    client.indexOf("currentSession.version") !== -1 &&
    client.indexOf("submissionId()") !== -1,
    "La clôture doit utiliser la commande serveur versionnée et idempotente."
  );
}

function AKS_testAnalyticsSaisie005_returnsClosedSessionToReadOnly_() {
  var client = AKS_includeAttendanceFile_("ui/analytics/AttendanceClient");
  AKS_assertAnalyticsSaisie003_(
    client.indexOf("Séance clôturée — version ") !== -1 &&
    client.indexOf("loadWorkspace();") !== -1 &&
    client.indexOf('workflowState === "CLOTUREE"') !== -1 &&
    client.indexOf("saveButton.hidden = readOnly") !== -1 &&
    client.indexOf("button.disabled = readOnly") !== -1,
    "Une clôture réussie doit afficher les statuts en lecture seule sans commandes d'écriture."
  );
  AKS_assertAnalyticsSaisie003_(
    client.indexOf('loadButton.addEventListener("click", function () { loadWorkspace(); });') !== -1 &&
    client.indexOf("button[data-session-date]") !== -1 &&
    client.indexOf("sessionButton.dataset.sessionDate") !== -1,
    "Le bouton de chargement ne doit pas transmettre l'événement comme message et les séances doivent être sélectionnables."
  );
}
