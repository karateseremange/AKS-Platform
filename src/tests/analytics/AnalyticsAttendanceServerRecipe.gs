var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Recette réelle de l'exposition serveur ACCESS-001.
 *
 * La recette utilise le vrai service d'accès et le vrai contrat d'écriture,
 * mais un registre en mémoire et un dépôt verrouillé sur la copie autorisée.
 * Elle ne modifie jamais les propriétés du script.
 */
AKS.Analytics.AttendanceServerRecipe = (function () {
  "use strict";

  var SPREADSHEET_ID = "1iU9Q98uGtlmrEq8-ip5sO6HmW_uThbBYOwacw8iVOH4";
  var SPREADSHEET_TITLE = "[RECETTE] Analytics Baby 2026-2027";
  var COURSE_CODE = "BABY";
  var SEASON = "2026-2027";
  var SESSION_DATE = "2026-09-12";

  function failure_(code, message) {
    var failure = new Error(message);
    failure.code = code;
    return failure;
  }

  function assert_(condition, code, message) {
    if (!condition) throw failure_(code, message);
  }

  function assertTarget_(book) {
    assert_(book && book.getId() === SPREADSHEET_ID &&
      book.getName() === SPREADSHEET_TITLE &&
      book.getName().indexOf("[RECETTE]") === 0,
    "SERVER_RECIPE_TARGET_REFUSED",
    "La cible n'est pas la copie de recette autorisée.");
    ["Configuration", "Licenciés", "Séances", "Présences"].forEach(function (name) {
      assert_(book.getSheetByName(name),
        "SERVER_RECIPE_TARGET_REFUSED",
        "La feuille obligatoire " + name + " est absente.");
    });
  }

  function repository_() {
    return AKS.Analytics.AttendanceSheetsRepository.create({
      spreadsheet_id_resolver: function (courseCode) {
        assert_(courseCode === COURSE_CODE,
          "SERVER_RECIPE_TARGET_REFUSED",
          "Le cours de recette est invalide.");
        return SPREADSHEET_ID;
      }
    });
  }

  function registry_(email) {
    return {
      schemaVersion: "access/1.0",
      accounts: [{
        email: email,
        displayName: "Recette serveur",
        status: "ACTIVE",
        roles: ["PROFESSEUR"],
        assignments: [{
          courseCode: COURSE_CODE,
          season: SEASON,
          status: "ACTIVE",
          roles: ["PROFESSEUR"],
          extraCapabilities: []
        }]
      }]
    };
  }

  function access_(repository, identity, registry) {
    return AKS_createAccessService_({
      identityProvider: function () { return identity; },
      registryStore: { load: function () { return registry; } },
      courseProvider: repository.courseProvider
    });
  }

  function api_(repository, access) {
    return AKS_createAttendanceServerApi_({
      access: access,
      writeService: {
        saveAttendanceBatch: function (command) {
          return AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(command, {
            access: access,
            resolver: repository.resolver,
            adapter: repository.adapter
          });
        }
      }
    });
  }

  function attendances_(members, status) {
    return members.map(function (member) {
      return { licencieId: member.id, status: status };
    });
  }

  function run() {
    var book = SpreadsheetApp.openById(SPREADSHEET_ID);
    assertTarget_(book);
    var repository = repository_();
    var context = repository.resolver.resolve(COURSE_CODE, SEASON);
    var existing = repository.adapter.findSession(context, "", SESSION_DATE);
    assert_(!existing,
      "SERVER_RECIPE_ALREADY_EXECUTED",
      "La recette serveur a déjà été exécutée.");
    assert_(context.eligibleMembers.length > 0,
      "SERVER_RECIPE_NO_ELIGIBLE_MEMBER",
      "Aucun licencié n'est éligible à la date de recette.");

    var deniedApi = api_(repository,
      access_(repository, "refuse-recette@invalid.example", registry_("autorise@invalid.example")));
    var denied = deniedApi.getAccessContext();
    assert_(!denied.ok && denied.error.code === "ACCESS_DENIED",
      "SERVER_RECIPE_DENIAL_FAILED",
      "Le refus du compte non inscrit n'est pas conforme.");
    assert_(!repository.adapter.findSession(context, "", SESSION_DATE),
      "SERVER_RECIPE_DENIAL_WROTE",
      "Le scénario refusé a écrit dans le classeur.");

    var identity = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
    assert_(identity,
      "SERVER_RECIPE_IDENTITY_MISSING",
      "Le compte Google actif n'a pas pu être identifié.");
    var allowedApi = api_(repository, access_(repository, identity, registry_(identity)));
    var accessContext = allowedApi.getAccessContext();
    assert_(accessContext.ok &&
      accessContext.data.identity === identity &&
      accessContext.data.bootstrap === false &&
      accessContext.data.courses.length === 1 &&
      accessContext.data.courses[0].code === COURSE_CODE &&
      accessContext.data.courses[0].season === SEASON,
    "SERVER_RECIPE_CONTEXT_INVALID",
    "Le contexte d'accès serveur n'est pas conforme.");

    var draft = allowedApi.saveAttendanceBatch({
      courseCode: COURSE_CODE,
      season: SEASON,
      sessionDate: SESSION_DATE,
      expectedVersion: 0,
      submissionId: "RECETTE-SERVER-DRAFT-20260912",
      targetState: "BROUILLON",
      attendances: attendances_(context.eligibleMembers, "NON_RENSEIGNE"),
      access: { injected: true },
      resolver: { spreadsheetId: "client-controlled" }
    });
    assert_(draft.ok && draft.workflowState === "BROUILLON" && draft.version === 1,
      "SERVER_RECIPE_DRAFT_FAILED",
      "La création du brouillon via l'API serveur a échoué.");

    var closed = allowedApi.saveAttendanceBatch({
      courseCode: COURSE_CODE,
      season: SEASON,
      sessionId: draft.sessionId,
      sessionDate: SESSION_DATE,
      expectedVersion: draft.version,
      submissionId: "RECETTE-SERVER-CLOSE-20260912",
      targetState: "CLOTUREE",
      attendances: attendances_(context.eligibleMembers, "PRESENT")
    });
    assert_(closed.ok && closed.workflowState === "CLOTUREE" && closed.version === 2,
      "SERVER_RECIPE_CLOSE_FAILED",
      "La clôture via l'API serveur a échoué.");

    var persisted = repository.adapter.getSession(context, closed.sessionId);
    assert_(persisted.workflowState === "CLOTUREE" && persisted.version === 2,
      "SERVER_RECIPE_READBACK_FAILED",
      "La séance clôturée n'est pas correctement relue.");

    var result = {
      ok: true,
      spreadsheetId: SPREADSHEET_ID,
      spreadsheetTitle: SPREADSHEET_TITLE,
      identity: identity,
      deniedCode: denied.error.code,
      authorizedCourseCount: accessContext.data.courses.length,
      sessionId: closed.sessionId,
      sessionDate: SESSION_DATE,
      workflowState: closed.workflowState,
      version: closed.version,
      eligibleCount: context.eligibleMembers.length,
      savedCount: closed.savedCount
    };
    console.log("RÉSULTAT RECETTE SERVEUR ACCESS-001: " + JSON.stringify(result));
    return result;
  }

  return Object.freeze({ run: run });
}());

function AKS_runAttendanceServerRecipe() {
  return AKS.Analytics.AttendanceServerRecipe.run();
}
