var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Recette réelle ANALYTICS-SAISIE-002.
 *
 * Cette fonction n'est jamais appelée par la suite cumulative. Elle est
 * volontairement limitée à une copie connue et refuse toute autre cible.
 */
AKS.Analytics.AttendanceWriteRecipe = (function () {
  "use strict";

  var SPREADSHEET_ID = "1iU9Q98uGtlmrEq8-ip5sO6HmW_uThbBYOwacw8iVOH4";
  var SPREADSHEET_TITLE = "[RECETTE] Analytics Baby 2026-2027";
  var COURSE_CODE = "BABY";
  var SEASON = "2026-2027";
  var SESSION_DATE = "2026-09-05";

  function failure_(code, message) {
    var failure = new Error(message);
    failure.code = code;
    return failure;
  }

  function assertTarget_(book) {
    if (!book || book.getId() !== SPREADSHEET_ID ||
        book.getName() !== SPREADSHEET_TITLE ||
        book.getName().indexOf("[RECETTE]") !== 0) {
      throw failure_("RECIPE_TARGET_REFUSED",
        "La cible n'est pas la copie de recette autorisée.");
    }
    ["Configuration", "Licenciés", "Séances", "Présences"].forEach(function (name) {
      if (!book.getSheetByName(name)) {
        throw failure_("RECIPE_TARGET_REFUSED",
          "La feuille obligatoire " + name + " est absente.");
      }
    });
  }

  function access_() {
    return {
      assertCapability: function () {},
      getCurrentIdentity: function () {
        return Session.getActiveUser().getEmail() || "recette-analytics";
      }
    };
  }

  function repository_() {
    return AKS.Analytics.AttendanceSheetsRepository.create({
      spreadsheet_id_resolver: function (courseCode) {
        if (courseCode !== COURSE_CODE) {
          throw failure_("RECIPE_TARGET_REFUSED", "Le cours de recette est invalide.");
        }
        return SPREADSHEET_ID;
      }
    });
  }

  function providerResult_() {
    return AKS.Analytics.SheetsProvider.load({
      season: SEASON,
      spreadsheet_ids: { BABY: SPREADSHEET_ID }
    }).courses.filter(function (course) {
      return course.code === COURSE_CODE;
    })[0];
  }

  function attendances_(members, status) {
    return members.map(function (member) {
      return { licencieId: member.id, status: status };
    });
  }

  function ensureSyntheticMembers_(book) {
    var sheet = book.getSheetByName("Licenciés");
    var values = sheet.getDataRange().getValues();
    var headerIndex = -1;
    values.forEach(function (row, index) {
      if (headerIndex === -1 && row.indexOf("ID licencié") !== -1 &&
          row.indexOf("Date entrée") !== -1 && row.indexOf("Date sortie") !== -1) {
        headerIndex = index;
      }
    });
    if (headerIndex === -1) {
      throw failure_("RECIPE_TARGET_REFUSED",
        "Les en-têtes de la feuille Licenciés sont introuvables.");
    }
    var headers = values[headerIndex];
    var existingIds = values.slice(headerIndex + 1).map(function (row) {
      return String(row[headers.indexOf("ID licencié")] || "").trim();
    }).filter(function (id) { return id !== ""; });
    if (existingIds.length) return false;

    ["RECETTE-LIC-001", "RECETTE-LIC-002"].forEach(function (id, index) {
      var row = headers.map(function (header) {
        if (header === "ID licencié") return id;
        if (header === "Numéro licence FFK") return "RECETTE-" + (index + 1);
        if (header === "Nom") return "TEST";
        if (header === "Prénom") return index === 0 ? "Alpha" : "Beta";
        if (header === "Date entrée") return "2026-09-01";
        if (header === "Date sortie") return "";
        return "";
      });
      sheet.appendRow(row);
    });
    return true;
  }

  function run() {
    var book = SpreadsheetApp.openById(SPREADSHEET_ID);
    assertTarget_(book);
    var syntheticMembersCreated = ensureSyntheticMembers_(book);

    var repository = repository_();
    var context = repository.resolver.resolve(COURSE_CODE, SEASON);
    var existing = repository.adapter.findSession(context, "", SESSION_DATE);
    if (existing && existing.workflowState !== "BROUILLON") {
      throw failure_("RECIPE_ALREADY_EXECUTED",
        "La séance de recette est déjà clôturée.");
    }
    if (!context.eligibleMembers.length) {
      throw failure_("RECIPE_NO_ELIGIBLE_MEMBER",
        "Aucun licencié n'est éligible à la date de recette.");
    }

    var options = {
      access: access_(),
      resolver: repository.resolver,
      adapter: repository.adapter
    };
    var draft = existing ? {
      sessionId: existing.id,
      sessionDate: existing.date,
      workflowState: existing.workflowState,
      version: existing.version
    } : AKS.Analytics.AttendanceWriteService.saveAttendanceBatch({
      courseCode: COURSE_CODE,
      season: SEASON,
      sessionDate: SESSION_DATE,
      expectedVersion: 0,
      submissionId: "RECETTE-DRAFT-20260905",
      targetState: "BROUILLON",
      attendances: attendances_(context.eligibleMembers, "NON_RENSEIGNE")
    }, options);

    var draftSource = providerResult_();
    var draftExcluded = draftSource.attendances.length === 0 &&
      draftSource.diagnostics.exclusions.some(function (entry) {
        return entry.code === "SAISIE_BROUILLON" &&
          entry.details.session_date === SESSION_DATE;
      });
    if (!draftExcluded) {
      throw failure_("RECIPE_DRAFT_VISIBLE",
        "Le brouillon n'est pas correctement exclu des rapports.");
    }

    var closed = AKS.Analytics.AttendanceWriteService.closeAttendanceSession({
      courseCode: COURSE_CODE,
      season: SEASON,
      sessionId: draft.sessionId,
      sessionDate: SESSION_DATE,
      expectedVersion: draft.version,
      submissionId: "RECETTE-CLOSE-20260905",
      targetState: "CLOTUREE",
      attendances: attendances_(context.eligibleMembers, "PRESENT")
    }, options);

    var closedSource = providerResult_();
    var closedRows = closedSource.attendances.filter(function (row) {
      return row.session_date === SESSION_DATE;
    });
    if (closedRows.length !== context.eligibleMembers.length) {
      throw failure_("RECIPE_CLOSED_NOT_VISIBLE",
        "La séance clôturée n'est pas correctement lue par Analytics.");
    }

    var result = {
      ok: true,
      spreadsheetId: SPREADSHEET_ID,
      spreadsheetTitle: SPREADSHEET_TITLE,
      sessionId: closed.sessionId,
      sessionDate: SESSION_DATE,
      workflowState: closed.workflowState,
      version: closed.version,
      eligibleCount: context.eligibleMembers.length,
      syntheticMembersCreated: syntheticMembersCreated,
      draftExcluded: true,
      closedAttendanceCount: closedRows.length
    };
    console.log("RÉSULTAT RECETTE ANALYTICS-SAISIE-002: " + JSON.stringify(result));
    return result;
  }

  return Object.freeze({
    SPREADSHEET_ID: SPREADSHEET_ID,
    SPREADSHEET_TITLE: SPREADSHEET_TITLE,
    run: run
  });
}());

function AKS_runAnalyticsAttendanceWriteRecipe() {
  return AKS.Analytics.AttendanceWriteRecipe.run();
}
