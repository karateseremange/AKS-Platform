function AKS_analyticsSheetsFixture_(overrides) {
  var sheets = {
    "Configuration": [["Clé", "Valeur"], ["saison", "2026-2027"],
      ["code_cours", "BABY"], ["version_modele", "1.0"]],
    "Licenciés": [["ID licencié", "Numéro licence FFK", "Nom", "Prénom", "Date entrée", "Date sortie"],
      ["LIC-000001", "", "TEST", "Alice", "2026-09-01", ""]],
    "Séances": [["ID séance", "Date séance", "État"],
      ["SEA-000001", "2026-09-05", "REALISEE"]],
    "Présences": [["Saison", "Cours", "Date séance", "ID licencié", "Statut"],
      ["2026-2027", "BABY", "2026-09-05", "LIC-000001", "PRESENT"]]
  };
  Object.keys(overrides || {}).forEach(function (key) { sheets[key] = overrides[key]; });
  return sheets;
}

function AKS_analyticsSheetsOptions_(mutator) {
  var books = {};
  ["ADO_ADULTE", "BABY", "ENFANT_1", "ENFANT_2"].forEach(function (code) {
    var sheets = AKS_analyticsSheetsFixture_();
    sheets.Configuration[2][1] = code;
    books["ID-" + code] = { id: "ID-" + code, sheets: sheets };
  });
  if (mutator) mutator(books);
  return {
    season: "2026-2027",
    spreadsheet_ids: {
      ADO_ADULTE: "ID-ADO_ADULTE", BABY: "ID-BABY",
      ENFANT_1: "ID-ENFANT_1", ENFANT_2: "ID-ENFANT_2"
    },
    adapter: {
      openById: function (id) {
        if (!books[id]) throw new Error("introuvable");
        return books[id];
      },
      spreadsheetId: function (book) { return book.id; },
      sheetValues: function (book, name) { return book.sheets[name] || null; }
    }
  };
}

function AKS_testAnalyticsSheets_loadsOfficialModel_() {
  var result = AKS.Analytics.SheetsProvider.load(AKS_analyticsSheetsOptions_());
  assertEquals_("VALIDE", result.state);
  assertEquals_(4, result.orchestrator_input.courses.length);
}
function AKS_testAnalyticsSheets_detectsHeadersAfterPreamble_() {
  var options = AKS_analyticsSheetsOptions_(function (books) {
    Object.keys(books).forEach(function (bookId) {
      var sheets = books[bookId].sheets;
      Object.keys(sheets).forEach(function (sheetName) {
        sheets[sheetName] = [
          ["AKS Analytics — " + sheetName],
          ["Consignes du modèle officiel"],
          []
        ].concat(sheets[sheetName]);
      });
    });
  });
  var result = AKS.Analytics.SheetsProvider.load(options);
  assertEquals_("VALIDE", result.state);
  assertEquals_(4, result.summary.valid_count);
}
function AKS_testAnalyticsSheets_rejectsInvalidSeason_() {
  var options = AKS_analyticsSheetsOptions_(); options.season = "2026";
  assertThrows_(function () {
    AKS.Analytics.SheetsProvider.load(options);
  }, "ANALYTICS_SHEETS_SEASON_INVALID");
}
function AKS_testAnalyticsSheets_requiresFourIds_() {
  var options = AKS_analyticsSheetsOptions_(); delete options.spreadsheet_ids.BABY;
  var result = AKS.Analytics.SheetsProvider.load(options);
  assertEquals_("ANALYTICS_SHEETS_ID_REQUIRED", result.courses[1].diagnostics.errors[0].code);
}
function AKS_testAnalyticsSheets_detectsMissingSheet_() {
  var options = AKS_analyticsSheetsOptions_(function (books) {
    delete books["ID-BABY"].sheets.Présences;
  });
  var result = AKS.Analytics.SheetsProvider.load(options);
  assertEquals_("ANALYTICS_SHEETS_REQUIRED_SHEET_MISSING", result.courses[1].diagnostics.errors[0].code);
}
function AKS_testAnalyticsSheets_detectsMissingColumn_() {
  var options = AKS_analyticsSheetsOptions_(function (books) {
    books["ID-BABY"].sheets.Présences[0][4] = "Valeur";
  });
  var result = AKS.Analytics.SheetsProvider.load(options);
  assertEquals_("ANALYTICS_SHEETS_COLUMNS_MISSING", result.courses[1].diagnostics.errors[0].code);
}
function AKS_testAnalyticsSheets_validatesModelIdentity_() {
  var options = AKS_analyticsSheetsOptions_(function (books) {
    books["ID-BABY"].sheets.Configuration[3][1] = "99.0";
  });
  var result = AKS.Analytics.SheetsProvider.load(options);
  assertEquals_("ANALYTICS_SHEETS_MODEL_MISMATCH", result.courses[1].diagnostics.errors[0].code);
}
function AKS_testAnalyticsSheets_preservesBlankAsUnknown_() {
  var options = AKS_analyticsSheetsOptions_(function (books) {
    books["ID-BABY"].sheets.Présences[1][4] = "";
  });
  var result = AKS.Analytics.SheetsProvider.load(options);
  assertEquals_("NON_RENSEIGNE", result.courses[1].attendances[0].status);
}
function AKS_testAnalyticsSheets_excludesCancelledSession_() {
  var options = AKS_analyticsSheetsOptions_(function (books) {
    books["ID-BABY"].sheets.Séances[1][2] = "ANNULEE";
  });
  var result = AKS.Analytics.SheetsProvider.load(options);
  assertEquals_(0, result.courses[1].attendances.length);
  assertEquals_("SEANCE_NON_REALISEE", result.courses[1].diagnostics.exclusions[0].code);
}
function AKS_testAnalyticsSheets_isolatesCourseFailure_() {
  var options = AKS_analyticsSheetsOptions_(function (books) {
    books["ID-ENFANT_1"].sheets.Configuration[1][1] = "2025-2026";
  });
  var result = AKS.Analytics.SheetsProvider.load(options);
  assertEquals_("PARTIEL", result.state);
  assertEquals_(3, result.summary.valid_count);
}
function AKS_testAnalyticsSheets_feedsOrchestrator_() {
  var source = AKS.Analytics.SheetsProvider.load(AKS_analyticsSheetsOptions_());
  var result = AKS.Analytics.CourseOrchestrator.run(source.orchestrator_input);
  assertEquals_(4, result.summary.exploitable_count);
}

function AKS_runAnalyticsSheetsProviderSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — fournisseur Google Sheets", [
    { name: "ANALYTICS / Sheets modèle officiel", test: AKS_testAnalyticsSheets_loadsOfficialModel_ },
    { name: "ANALYTICS / Sheets en-têtes après préambule", test: AKS_testAnalyticsSheets_detectsHeadersAfterPreamble_ },
    { name: "ANALYTICS / Sheets saison", test: AKS_testAnalyticsSheets_rejectsInvalidSeason_ },
    { name: "ANALYTICS / Sheets quatre IDs", test: AKS_testAnalyticsSheets_requiresFourIds_ },
    { name: "ANALYTICS / Sheets feuille obligatoire", test: AKS_testAnalyticsSheets_detectsMissingSheet_ },
    { name: "ANALYTICS / Sheets colonnes", test: AKS_testAnalyticsSheets_detectsMissingColumn_ },
    { name: "ANALYTICS / Sheets identité modèle", test: AKS_testAnalyticsSheets_validatesModelIdentity_ },
    { name: "ANALYTICS / Sheets vide non renseigné", test: AKS_testAnalyticsSheets_preservesBlankAsUnknown_ },
    { name: "ANALYTICS / Sheets séance annulée", test: AKS_testAnalyticsSheets_excludesCancelledSession_ },
    { name: "ANALYTICS / Sheets isolation cours", test: AKS_testAnalyticsSheets_isolatesCourseFailure_ },
    { name: "ANALYTICS / Sheets orchestration", test: AKS_testAnalyticsSheets_feedsOrchestrator_ }
  ]);
}

function AKS_runAnalyticsSheetsIntegrationSuite() {
  var ids = {
    ADO_ADULTE: PropertiesService.getScriptProperties().getProperty("ANALYTICS_SHEETS_TEST_ADO_ADULTE_ID"),
    BABY: PropertiesService.getScriptProperties().getProperty("ANALYTICS_SHEETS_TEST_BABY_ID"),
    ENFANT_1: PropertiesService.getScriptProperties().getProperty("ANALYTICS_SHEETS_TEST_ENFANT_1_ID"),
    ENFANT_2: PropertiesService.getScriptProperties().getProperty("ANALYTICS_SHEETS_TEST_ENFANT_2_ID")
  };
  return AKS_runNamedTestSuite_("AKS Analytics — intégration Sheets en lecture seule", [{
    name: "ANALYTICS / Sheets lecture réelle des quatre classeurs",
    test: function () {
      var result = AKS.Analytics.SheetsProvider.load({
        season: PropertiesService.getScriptProperties().getProperty(
          "ANALYTICS_SHEETS_TEST_SEASON") || "2026-2027",
        spreadsheet_ids: ids
      });
      assertEquals_(4, result.summary.valid_count);
      assertEquals_(4, result.orchestrator_input.courses.length);
    }
  }]);
}
