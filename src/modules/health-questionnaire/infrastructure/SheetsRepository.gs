var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire = AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.SheetsRepository = function (spreadsheetId) {
  var sheetName = "HealthQuestionnaireSubmissions";
  var headers = ["submissionId", "questionnaireId", "memberId", "season", "status", "answersJson", "declarationAccepted", "submittedAt"];

  function getSheet_() {
    var spreadsheet = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
    return sheet;
  }

  return Object.freeze({
    ensureStorage: getSheet_,
    save: function (record) {
      getSheet_().appendRow([
        record.submission.id,
        record.submission.questionnaireId,
        record.submission.memberId,
        record.submission.season || "",
        record.evaluation.status,
        JSON.stringify(record.submission.answers),
        record.submission.declarationAccepted,
        record.submission.submittedAt
      ]);
      return record;
    }
  });
};
