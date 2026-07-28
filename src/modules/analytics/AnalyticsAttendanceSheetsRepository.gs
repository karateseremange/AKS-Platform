var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Adaptateur Google Sheets du contrat ANALYTICS-SAISIE-002.
 * Il conserve les en-têtes historiques et ajoute les colonnes techniques à
 * droite lors de la première écriture.
 */
AKS.Analytics.AttendanceSheetsRepository = (function () {
  "use strict";

  var COURSE_PROPERTIES = {
    ADO_ADULTE: "analytics.sheets.adoAdulteSpreadsheetId",
    BABY: "analytics.sheets.babySpreadsheetId",
    ENFANT_1: "analytics.sheets.enfant1SpreadsheetId",
    ENFANT_2: "analytics.sheets.enfant2SpreadsheetId",
    FEMININ: "analytics.sheets.femininSpreadsheetId"
  };
  var SESSION_HEADERS = [
    "ID séance", "Date séance", "État", "État saisie", "Version saisie",
    "Modifiée le", "Modifiée par"
  ];
  var ATTENDANCE_HEADERS = [
    "Saison", "Cours", "Date séance", "ID licencié", "Statut", "ID séance",
    "Version saisie", "Modifiée le", "Modifiée par"
  ];

  function failure_(code, message) {
    var failure = new Error(message);
    failure.code = code;
    return failure;
  }

  function text_(value) {
    return value === null || typeof value === "undefined" ? "" : String(value).trim();
  }

  function dateText_(value, timeZone) {
    if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
      return Utilities.formatDate(value, timeZone || "UTC", "yyyy-MM-dd");
    }
    return text_(value);
  }

  function timeZone_(book) {
    return text_(book && book.getSpreadsheetTimeZone &&
      book.getSpreadsheetTimeZone()) || Session.getScriptTimeZone() || "UTC";
  }

  function property_(key) {
    var raw = PropertiesService.getScriptProperties().getProperty("AKS_CONFIG_VALUE." + key);
    if (!raw) return "";
    try {
      var record = JSON.parse(raw);
      return text_(record && record.value);
    } catch (failure) {
      throw failure_("ATTENDANCE_WRITE_FAILED", "Le paramétrage Analytics est illisible.");
    }
  }

  function values_(sheet) {
    return sheet.getDataRange().getValues();
  }

  function header_(sheet, required) {
    var values = values_(sheet);
    var index = -1;
    values.forEach(function (row, rowIndex) {
      if (index !== -1) return;
      var normalized = row.map(text_);
      if (required.every(function (name) { return normalized.indexOf(name) !== -1; })) {
        index = rowIndex;
      }
    });
    if (index === -1) {
      throw failure_("ATTENDANCE_WRITE_FAILED",
        "Les en-têtes obligatoires sont absents de " + sheet.getName() + ".");
    }
    return { row: index, names: values[index].map(text_), values: values };
  }

  function ensureHeaders_(sheet, required) {
    var found = header_(sheet, required.slice(0, 3));
    var names = found.names.slice();
    required.forEach(function (name) {
      if (names.indexOf(name) === -1) names.push(name);
    });
    if (names.length !== found.names.length) {
      sheet.getRange(found.row + 1, 1, 1, names.length).setValues([names]);
      found = header_(sheet, required.slice(0, 3));
    }
    return found;
  }

  function objects_(sheet, required) {
    var found = header_(sheet, required);
    return found.values.slice(found.row + 1).filter(function (row) {
      return row.some(function (value) { return text_(value) !== ""; });
    }).map(function (row) {
      var object = {};
      found.names.forEach(function (name, index) {
        if (name) object[name] = row[index];
      });
      return object;
    });
  }

  function config_(book) {
    var sheet = book.getSheetByName("Configuration");
    if (!sheet) throw failure_("ATTENDANCE_WRITE_FAILED", "Feuille Configuration absente.");
    var result = {};
    objects_(sheet, ["Clé", "Valeur"]).forEach(function (row) {
      result[text_(row.Clé)] = text_(row.Valeur);
    });
    return result;
  }

  function eligible_(book, sessionDate) {
    var sheet = book.getSheetByName("Licenciés");
    if (!sheet) throw failure_("ATTENDANCE_WRITE_FAILED", "Feuille Licenciés absente.");
    return objects_(sheet, ["ID licencié", "Date entrée", "Date sortie"])
      .filter(function (row) {
        var entry = dateText_(row["Date entrée"], timeZone_(book));
        var exit = dateText_(row["Date sortie"], timeZone_(book));
        return (!entry || entry <= sessionDate) && (!exit || exit >= sessionDate);
      }).map(function (row) { return { id: text_(row["ID licencié"]) }; })
      .filter(function (member) { return member.id !== ""; });
  }

  function rowObject_(names, values) {
    return names.map(function (name) {
      return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : "";
    });
  }

  function rewrite_(sheet, headerInfo, rows) {
    var width = headerInfo.names.length;
    var existingRows = Math.max(sheet.getLastRow() - headerInfo.row - 1, 0);
    if (existingRows) {
      sheet.getRange(headerInfo.row + 2, 1, existingRows, width).clearContent();
    }
    if (rows.length) {
      sheet.getRange(headerInfo.row + 2, 1, rows.length, width).setValues(rows);
    }
  }

  function create(options) {
    options = options || {};
    var spreadsheetOpener = options.spreadsheet_opener || function (spreadsheetId) {
      return SpreadsheetApp.openById(spreadsheetId);
    };

    function spreadsheetId_(courseCode, key) {
      if (typeof options.spreadsheet_id_resolver === "function") {
        return text_(options.spreadsheet_id_resolver(courseCode));
      }
      return property_(key);
    }

    function listCourses() {
      return Object.keys(COURSE_PROPERTIES).map(function (courseCode) {
        var spreadsheetId = spreadsheetId_(courseCode, COURSE_PROPERTIES[courseCode]);
        if (!spreadsheetId) return null;
        var book = spreadsheetOpener(spreadsheetId);
        var configuration = config_(book);
        if (configuration.code_cours !== courseCode ||
            configuration.version_modele !== "1.0" ||
            !/^\d{4}-\d{4}$/.test(configuration.saison)) {
          throw failure_("ACCESS_REGISTRY_INVALID",
            "Le catalogue des cours Analytics est incohérent.");
        }
        return {
          code: courseCode,
          season: configuration.saison,
          active: true
        };
      }).filter(function (course) { return course !== null; });
    }

    function resolve(courseCode, season) {
      var key = COURSE_PROPERTIES[courseCode];
      if (!key) throw failure_("ACCESS_SCOPE_INVALID", "Le cours est inconnu.");
      var spreadsheetId = spreadsheetId_(courseCode, key);
      if (!spreadsheetId) throw failure_("ATTENDANCE_WRITE_FAILED", "Classeur non configuré.");
      var book = spreadsheetOpener(spreadsheetId);
      var configuration = config_(book);
      if (configuration.saison !== season || configuration.code_cours !== courseCode ||
          configuration.version_modele !== "1.0") {
        throw failure_("ATTENDANCE_WRITE_FAILED", "Le classeur ne correspond pas au périmètre.");
      }
      return {
        book: book,
        courseCode: courseCode,
        season: season,
        eligibleMembers: []
      };
    }

    function findSession(context, sessionId, sessionDate) {
      var sheet = context.book.getSheetByName("Séances");
      if (!sheet) throw failure_("ATTENDANCE_WRITE_FAILED", "Feuille Séances absente.");
      var matches = objects_(sheet, ["ID séance", "Date séance", "État"])
        .filter(function (row) {
          return sessionId ?
            text_(row["ID séance"]) === sessionId :
            dateText_(row["Date séance"], timeZone_(context.book)) === sessionDate;
        });
      if (matches.length > 1) {
        throw failure_("ATTENDANCE_SESSION_DUPLICATE", "Plusieurs séances correspondent.");
      }
      var row = matches[0];
      var date = row ? dateText_(row["Date séance"], timeZone_(context.book)) : sessionDate;
      context.eligibleMembers = eligible_(context.book, date);
      return row ? {
        id: text_(row["ID séance"]),
        date: date,
        state: text_(row.État).toUpperCase(),
        workflowState: text_(row["État saisie"]).toUpperCase() || "CLOTUREE",
        version: Number(row["Version saisie"] || 0)
      } : null;
    }

    function snapshot(context) {
      return {
        sessions: values_(context.book.getSheetByName("Séances")),
        attendances: values_(context.book.getSheetByName("Présences"))
      };
    }

    function replaceBatch(context, session, attendances) {
      var sessionSheet = context.book.getSheetByName("Séances");
      var attendanceSheet = context.book.getSheetByName("Présences");
      if (!sessionSheet || !attendanceSheet) {
        throw failure_("ATTENDANCE_WRITE_FAILED", "Une feuille obligatoire est absente.");
      }
      var sessionHeader = ensureHeaders_(sessionSheet, SESSION_HEADERS);
      var sessionObjects = objects_(sessionSheet, ["ID séance", "Date séance", "État"]);
      var replaced = false;
      sessionObjects = sessionObjects.map(function (row) {
        if (text_(row["ID séance"]) !== session.id) return row;
        replaced = true;
        return rowObject_(sessionHeader.names, {
          "ID séance": session.id, "Date séance": session.date, "État": session.state,
          "État saisie": session.workflowState, "Version saisie": session.version,
          "Modifiée le": session.modifiedAt, "Modifiée par": session.modifiedBy
        });
      });
      sessionObjects = sessionObjects.map(function (row) {
        return Array.isArray(row) ? row : rowObject_(sessionHeader.names, row);
      });
      if (!replaced) {
        sessionObjects.push(rowObject_(sessionHeader.names, {
          "ID séance": session.id, "Date séance": session.date, "État": session.state,
          "État saisie": session.workflowState, "Version saisie": session.version,
          "Modifiée le": session.modifiedAt, "Modifiée par": session.modifiedBy
        }));
      }
      rewrite_(sessionSheet, sessionHeader, sessionObjects);

      var attendanceHeader = ensureHeaders_(attendanceSheet, ATTENDANCE_HEADERS);
      var attendanceObjects = objects_(attendanceSheet,
        ["Saison", "Cours", "Date séance", "ID licencié", "Statut"])
        .filter(function (row) {
          var sameId = text_(row["ID séance"]) === session.id;
          var legacySameDate = !text_(row["ID séance"]) &&
            text_(row.Saison) === context.season &&
            text_(row.Cours) === context.courseCode &&
            dateText_(row["Date séance"], timeZone_(context.book)) === session.date;
          return !sameId && !legacySameDate;
        });
      var rows = attendanceObjects.map(function (row) {
        return rowObject_(attendanceHeader.names, row);
      });
      attendances.forEach(function (attendance) {
        rows.push(rowObject_(attendanceHeader.names, {
          "Saison": context.season,
          "Cours": context.courseCode,
          "Date séance": session.date,
          "ID licencié": attendance.licencieId,
          "Statut": attendance.status,
          "ID séance": session.id,
          "Version saisie": session.version,
          "Modifiée le": session.modifiedAt,
          "Modifiée par": session.modifiedBy
        }));
      });
      rewrite_(attendanceSheet, attendanceHeader, rows);
    }

    function verify(context, session, attendances) {
      var persisted = findSession(context, session.id, "");
      if (!persisted || persisted.version !== session.version ||
          persisted.workflowState !== session.workflowState) {
        throw failure_("ATTENDANCE_WRITE_FAILED", "La séance relue est incohérente.");
      }
      var rows = objects_(context.book.getSheetByName("Présences"),
        ["Saison", "Cours", "Date séance", "ID licencié", "Statut"]);
      var count = rows.filter(function (row) {
        return text_(row["ID séance"]) === session.id;
      }).length;
      if (count !== attendances.length) {
        throw failure_("ATTENDANCE_WRITE_FAILED", "Le lot relu est incomplet.");
      }
    }

    function restore(context, snapshot) {
      ["Séances", "Présences"].forEach(function (name) {
        var sheet = context.book.getSheetByName(name);
        var data = name === "Séances" ? snapshot.sessions : snapshot.attendances;
        sheet.clearContents();
        if (data.length && data[0].length) {
          sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
        }
      });
    }

    function getSession(context, sessionId) {
      var session = findSession(context, sessionId, "");
      if (!session) throw failure_("ATTENDANCE_SESSION_NOT_FOUND", "Séance introuvable.");
      return session;
    }

    var repository = {
      resolve: resolve,
      findSession: findSession,
      snapshot: snapshot,
      replaceBatch: replaceBatch,
      verify: verify,
      restore: restore,
      getSession: getSession
    };
    return {
      resolver: repository,
      adapter: repository,
      courseProvider: Object.freeze({ list: listCourses })
    };
  }

  return Object.freeze({
    COURSE_PROPERTIES: COURSE_PROPERTIES,
    create: create
  });
}());
