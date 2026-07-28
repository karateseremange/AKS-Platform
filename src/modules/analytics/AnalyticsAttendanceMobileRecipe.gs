var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Isolated server composition for the ANALYTICS-SAISIE-006 mobile recipe.
 * Every request revalidates identity, scope and the exact recipe spreadsheet.
 */
AKS.Analytics.AttendanceMobileRecipe = (function () {
  "use strict";

  var SPREADSHEET_ID = "1iU9Q98uGtlmrEq8-ip5sO6HmW_uThbBYOwacw8iVOH4";
  var SPREADSHEET_TITLE = "[RECETTE] Analytics Baby 2026-2027";
  var AUTHORIZED_EMAIL = "karate.seremange@gmail.com";
  var COURSE_CODE = "BABY";
  var SEASON = "2026-2027";
  var SESSION_DATE = "2026-09-19";

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
    "MOBILE_RECIPE_TARGET_REFUSED",
    "La cible n'est pas la copie de recette autorisée.");
    ["Configuration", "Licenciés", "Séances", "Présences"].forEach(function (name) {
      assert_(book.getSheetByName(name),
        "MOBILE_RECIPE_TARGET_REFUSED",
        "La feuille obligatoire " + name + " est absente.");
    });
    return book;
  }

  function identity_() {
    var email = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
    assert_(email === AUTHORIZED_EMAIL,
      "ACCESS_DENIED",
      "Le compte Google actif n'est pas autorisé pour cette recette.");
    return email;
  }

  function repository_() {
    return AKS.Analytics.AttendanceSheetsRepository.create({
      spreadsheet_id_resolver: function (courseCode) {
        return courseCode === COURSE_CODE ? SPREADSHEET_ID : "";
      },
      spreadsheet_opener: function (spreadsheetId) {
        assert_(spreadsheetId === SPREADSHEET_ID,
          "MOBILE_RECIPE_TARGET_REFUSED",
          "L'identifiant du classeur de recette est invalide.");
        return assertTarget_(SpreadsheetApp.openById(spreadsheetId));
      }
    });
  }

  function registry_() {
    return {
      schemaVersion: "access/1.0",
      accounts: [{
        email: AUTHORIZED_EMAIL,
        displayName: "Recette mobile",
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

  function composition_() {
    identity_();
    var repository = repository_();
    var access = AKS_createAccessService_({
      identityProvider: identity_,
      registryStore: { load: registry_ },
      courseProvider: repository.courseProvider
    });
    var writeService = {
      saveAttendanceBatch: function (command) {
        return AKS.Analytics.AttendanceWriteService.saveAttendanceBatch(command, {
          access: access,
          resolver: repository.resolver,
          adapter: repository.adapter
        });
      }
    };
    return {
      repository: repository,
      api: AKS_createAttendanceServerApi_({
        access: access,
        repository: repository,
        writeService: writeService
      })
    };
  }

  function assertScope_(scope) {
    scope = scope || {};
    assert_(String(scope.courseCode || "").trim().toUpperCase() === COURSE_CODE &&
      String(scope.season || "").trim() === SEASON &&
      String(scope.sessionDate || "").trim() === SESSION_DATE,
    "ACCESS_SCOPE_INVALID",
    "La recette est limitée à BABY / 2026-2027 au 19 septembre 2026.");
  }

  function assertCommand_(command, repository) {
    command = command || {};
    assert_(String(command.courseCode || "").trim().toUpperCase() === COURSE_CODE &&
      String(command.season || "").trim() === SEASON,
    "ACCESS_SCOPE_INVALID",
    "Le cours ou la saison de recette est invalide.");
    assert_(command.targetState === "BROUILLON" || command.targetState === "CLOTUREE",
      "ATTENDANCE_COMMAND_INVALID",
      "L'état demandé est invalide.");
    if (String(command.sessionId || "").trim()) {
      var context = repository.resolver.resolve(COURSE_CODE, SEASON);
      var session = repository.adapter.getSession(context, String(command.sessionId).trim());
      assert_(session && session.date === SESSION_DATE,
        "ACCESS_SCOPE_INVALID",
        "La séance ne correspond pas à la date réservée à la recette.");
    } else {
      assert_(String(command.sessionDate || "").trim() === SESSION_DATE,
        "ACCESS_SCOPE_INVALID",
        "La création est limitée à la date réservée à la recette.");
    }
  }

  function getAccessContext() {
    return composition_().api.getAccessContext();
  }

  function getWorkspace(scope) {
    assertScope_(scope);
    return composition_().api.getWorkspace(scope);
  }

  function saveAttendanceBatch(command) {
    var composition = composition_();
    assertCommand_(command, composition.repository);
    return composition.api.saveAttendanceBatch(command);
  }

  return Object.freeze({
    getAccessContext: getAccessContext,
    getWorkspace: getWorkspace,
    saveAttendanceBatch: saveAttendanceBatch,
    constants: Object.freeze({
      courseCode: COURSE_CODE,
      season: SEASON,
      sessionDate: SESSION_DATE
    })
  });
}());

function AKS_getAttendanceRecipeWorkspace(scope) {
  return AKS.Analytics.AttendanceMobileRecipe.getWorkspace(scope);
}

function AKS_saveAttendanceRecipeBatch(command) {
  return AKS.Analytics.AttendanceMobileRecipe.saveAttendanceBatch(command);
}
