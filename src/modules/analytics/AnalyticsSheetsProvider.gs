var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Lit en lecture seule les quatre classeurs conformes au modèle officiel
 * AKS Analytics et produit directement l'entrée de CourseOrchestrator.
 */
AKS.Analytics.SheetsProvider = (function () {
  "use strict";

  var RULE_VERSION = "analytics-sheets-provider/1.0.0";
  var MODEL_VERSION = "1.0";
  var EXPECTED_COURSES = ["ADO_ADULTE", "BABY", "ENFANT_1", "ENFANT_2"];
  var COURSE_PROPERTIES = {
    ADO_ADULTE: "analytics.sheets.adoAdulteSpreadsheetId",
    BABY: "analytics.sheets.babySpreadsheetId",
    ENFANT_1: "analytics.sheets.enfant1SpreadsheetId",
    ENFANT_2: "analytics.sheets.enfant2SpreadsheetId"
  };
  var REQUIRED_SHEETS = ["Configuration", "Licenciés", "Séances", "Présences"];

  function error_(code, message, details) {
    var error = new Error(message);
    error.code = code;
    error.details = details || null;
    return error;
  }

  function text_(value) {
    return value === null || typeof value === "undefined" ? "" : String(value).trim();
  }

  function dateText_(value) {
    if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
      return Utilities.formatDate(value, "UTC", "yyyy-MM-dd");
    }
    return text_(value);
  }

  function validateSeason_(season) {
    season = text_(season);
    if (!/^\d{4}-\d{4}$/.test(season) ||
        Number(season.slice(5)) !== Number(season.slice(0, 4)) + 1) {
      throw error_("ANALYTICS_SHEETS_SEASON_INVALID",
        "La saison doit respecter le format AAAA-AAAA avec deux années consécutives.");
    }
    return season;
  }

  function property_(key) {
    var raw = PropertiesService.getScriptProperties().getProperty("AKS_CONFIG_VALUE." + key);
    if (!raw) return "";
    try {
      var record = JSON.parse(raw);
      return text_(record && record.value);
    } catch (failure) {
      throw error_("ANALYTICS_SHEETS_CONFIG_INVALID",
        "Le paramètre " + key + " est illisible.");
    }
  }

  function defaultAdapter_() {
    return {
      openById: function (id) { return SpreadsheetApp.openById(id); },
      spreadsheetId: function (book) { return book.getId(); },
      sheetValues: function (book, name) {
        var sheet = book.getSheetByName(name);
        return sheet ? sheet.getDataRange().getValues() : null;
      }
    };
  }

  function headerIndex_(values, sheetName, requiredHeaders) {
    if (!values || !values.length) {
      throw error_("ANALYTICS_SHEETS_REQUIRED_SHEET_MISSING",
        "La feuille obligatoire est absente ou vide : " + sheetName, { sheet: sheetName });
    }
    var headerIndex = -1;
    var bestMissing = requiredHeaders.slice();
    values.forEach(function (valuesRow, index) {
      if (headerIndex !== -1) return;
      var actual = valuesRow.map(text_);
      var missing = requiredHeaders.filter(function (header) {
        return actual.indexOf(header) === -1;
      });
      if (missing.length < bestMissing.length) bestMissing = missing;
      if (!missing.length) headerIndex = index;
    });
    if (headerIndex === -1) {
      throw error_("ANALYTICS_SHEETS_COLUMNS_MISSING",
        "Colonnes obligatoires absentes de " + sheetName + " : " + bestMissing.join(", "),
        { sheet: sheetName, columns: bestMissing });
    }
    return headerIndex;
  }

  function rows_(values, sheetName, requiredHeaders) {
    var headerIndex = headerIndex_(values, sheetName, requiredHeaders);
    var headers = values[headerIndex].map(text_);
    var result = [];
    values.slice(headerIndex + 1).forEach(function (valuesRow, index) {
      if (!valuesRow.some(function (value) { return text_(value) !== ""; })) return;
      var row = { __row: headerIndex + index + 2 };
      headers.forEach(function (header, column) {
        if (header) row[header] = valuesRow[column];
      });
      result.push(row);
    });
    return result;
  }

  function configuration_(values) {
    var config = {};
    rows_(values, "Configuration", ["Clé", "Valeur"]).forEach(function (row) {
      config[text_(row.Clé)] = text_(row.Valeur);
    });
    return config;
  }

  function assertHeaders_(values, sheetName, headers) {
    headerIndex_(values, sheetName, headers);
  }

  function loadCourse_(courseCode, season, spreadsheetId, adapter) {
    var diagnostics = { errors: [], warnings: [], exclusions: [] };
    try {
      var book = adapter.openById(spreadsheetId);
      var values = {};
      REQUIRED_SHEETS.forEach(function (name) {
        values[name] = adapter.sheetValues(book, name);
        if (!values[name]) {
          throw error_("ANALYTICS_SHEETS_REQUIRED_SHEET_MISSING",
            "Feuille obligatoire absente : " + name, { sheet: name });
        }
      });
      assertHeaders_(values.Configuration, "Configuration", ["Clé", "Valeur"]);
      assertHeaders_(values.Licenciés, "Licenciés",
        ["ID licencié", "Numéro licence FFK", "Date entrée", "Date sortie"]);
      assertHeaders_(values.Séances, "Séances", ["ID séance", "Date séance", "État"]);
      assertHeaders_(values.Présences, "Présences",
        ["Saison", "Cours", "Date séance", "ID licencié", "Statut"]);

      var config = configuration_(values.Configuration);
      if (config.saison !== season || config.code_cours !== courseCode ||
          config.version_modele !== MODEL_VERSION) {
        throw error_("ANALYTICS_SHEETS_MODEL_MISMATCH",
          "Le classeur ne correspond pas à la saison, au cours ou à la version attendue.");
      }

      var members = rows_(values.Licenciés, "Licenciés",
        ["ID licencié", "Numéro licence FFK", "Date entrée", "Date sortie"]).map(function (row) {
        return {
          licencie_id: text_(row["ID licencié"]),
          numero_licence: text_(row["Numéro licence FFK"]) || null,
          nom: text_(row.Nom) || null,
          prenom: text_(row.Prénom) || null,
          entry_date: dateText_(row["Date entrée"]) || null,
          exit_date: dateText_(row["Date sortie"]) || null
        };
      });
      var sessions = {};
      rows_(values.Séances, "Séances",
        ["ID séance", "Date séance", "État"]).forEach(function (row) {
        sessions[dateText_(row["Date séance"])] = text_(row.État).toUpperCase();
      });
      var attendances = rows_(values.Présences, "Présences",
        ["Saison", "Cours", "Date séance", "ID licencié", "Statut"]).map(function (row) {
        var sessionDate = dateText_(row["Date séance"]);
        return {
          session_date: sessionDate,
          licencie_id: text_(row["ID licencié"]),
          status: text_(row.Statut).toUpperCase() || "NON_RENSEIGNE",
          session_status: sessions[sessionDate] || "REALISEE"
        };
      }).filter(function (row) {
        if (row.session_status !== "REALISEE") {
          diagnostics.exclusions.push({
            code: "SEANCE_NON_REALISEE", course_code: courseCode,
            details: { session_date: row.session_date }
          });
          return false;
        }
        return true;
      });
      if (!attendances.length) {
        diagnostics.warnings.push({
          code: "ANALYTICS_SHEETS_NO_ATTENDANCE", course_code: courseCode
        });
      }
      return {
        code: courseCode, season: season, spreadsheet_id: adapter.spreadsheetId(book),
        members: members, attendances: attendances, warnings: diagnostics.warnings,
        exclusions: diagnostics.exclusions, source_state: attendances.length ? "VALIDE" : "NON_CALCULABLE",
        diagnostics: diagnostics
      };
    } catch (failure) {
      diagnostics.errors.push({
        code: failure.code || "ANALYTICS_SHEETS_READ_FAILED", course_code: courseCode,
        details: failure.details || null
      });
      return {
        code: courseCode, season: season, spreadsheet_id: spreadsheetId,
        members: [], attendances: [], warnings: [], exclusions: [],
        source_state: "ERREUR", diagnostics: diagnostics
      };
    }
  }

  function load(options) {
    options = options || {};
    var season = validateSeason_(options.season);
    var adapter = options.adapter || defaultAdapter_();
    var ids = options.spreadsheet_ids || {};
    var courses = EXPECTED_COURSES.map(function (courseCode) {
      var id = text_(ids[courseCode] || property_(COURSE_PROPERTIES[courseCode]));
      if (!id) {
        return {
          code: courseCode, season: season, spreadsheet_id: null,
          members: [], attendances: [], warnings: [], exclusions: [],
          source_state: "ERREUR",
          diagnostics: { errors: [{
            code: "ANALYTICS_SHEETS_ID_REQUIRED", course_code: courseCode,
            details: { property: COURSE_PROPERTIES[courseCode] }
          }], warnings: [], exclusions: [] }
        };
      }
      return loadCourse_(courseCode, season, id, adapter);
    });
    var validCount = courses.filter(function (course) {
      return course.source_state === "VALIDE";
    }).length;
    return Object.freeze({
      rule_version: RULE_VERSION,
      model_version: MODEL_VERSION,
      season: season,
      state: validCount === EXPECTED_COURSES.length ? "VALIDE" :
        (validCount ? "PARTIEL" : "ERREUR"),
      expected_courses: EXPECTED_COURSES.slice(),
      courses: courses,
      orchestrator_input: {
        season: season,
        expected_courses: EXPECTED_COURSES.slice(),
        courses: courses.filter(function (course) {
          return course.source_state !== "ERREUR";
        }).map(function (course) {
          return {
            code: course.code, season: season, members: course.members,
            attendances: course.attendances, warnings: course.warnings,
            exclusions: course.exclusions
          };
        })
      },
      summary: {
        expected_count: EXPECTED_COURSES.length,
        valid_count: validCount,
        error_count: courses.filter(function (course) {
          return course.source_state === "ERREUR";
        }).length
      }
    });
  }

  return Object.freeze({
    RULE_VERSION: RULE_VERSION,
    MODEL_VERSION: MODEL_VERSION,
    EXPECTED_COURSES: EXPECTED_COURSES.slice(),
    COURSE_PROPERTIES: COURSE_PROPERTIES,
    load: load
  });
}());
