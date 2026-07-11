var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Google Sheets repository for the health questionnaire module.
 *
 * @param {string=} spreadsheetId
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.HealthQuestionnaireSheetsRepository =
  function (spreadsheetId) {
    var SHEETS = Object.freeze({
      campaigns: "HQ_Campaigns",
      questionnaires: "HQ_Questionnaires",
      submissions: "HQ_Submissions"
    });

    var HEADERS = Object.freeze({
      campaigns: [
        "id",
        "name",
        "season",
        "questionnaireId",
        "status",
        "opensAt",
        "closesAt",
        "createdAt"
      ],
      questionnaires: [
        "id",
        "title",
        "version",
        "audience",
        "source",
        "effectiveFrom",
        "effectiveTo",
        "questionsJson"
      ],
      submissions: [
        "submissionId",
        "campaignId",
        "questionnaireId",
        "participantId",
        "respondentType",
        "answersJson",
        "declarationAccepted",
        "status",
        "missingQuestionIdsJson",
        "positiveQuestionIdsJson",
        "submittedAt",
        "evaluatedAt"
      ]
    });

    function getSpreadsheet_() {
      if (spreadsheetId) {
        return SpreadsheetApp.openById(spreadsheetId);
      }

      var active = SpreadsheetApp.getActiveSpreadsheet();

      if (!active) {
        throw new AKS.Core.Exception(
          "HEALTH_SPREADSHEET_NOT_AVAILABLE",
          "No active spreadsheet is available."
        );
      }

      return active;
    }

    function ensureSheet_(name, headers) {
      var spreadsheet = getSpreadsheet_();
      var sheet = spreadsheet.getSheetByName(name);

      if (!sheet) {
        sheet = spreadsheet.insertSheet(name);
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
      }

      return sheet;
    }

    function ensureStorage() {
      ensureSheet_(SHEETS.campaigns, HEADERS.campaigns);
      ensureSheet_(SHEETS.questionnaires, HEADERS.questionnaires);
      ensureSheet_(SHEETS.submissions, HEADERS.submissions);

      return {
        spreadsheetId: getSpreadsheet_().getId(),
        sheets: [
          SHEETS.campaigns,
          SHEETS.questionnaires,
          SHEETS.submissions
        ]
      };
    }

    function saveCampaign(campaign) {
      upsertById_(
        SHEETS.campaigns,
        HEADERS.campaigns,
        campaign.id,
        [
          campaign.id,
          campaign.name,
          campaign.season,
          campaign.questionnaireId,
          campaign.status,
          campaign.opensAt || "",
          campaign.closesAt || "",
          campaign.createdAt || new Date()
        ]
      );

      return campaign;
    }

    function findCampaignById(campaignId) {
      var row = findRowById_(
        SHEETS.campaigns,
        HEADERS.campaigns,
        campaignId
      );

      if (!row) {
        return null;
      }

      return AKS.Modules.HealthQuestionnaire.HealthCampaign({
        id: row[0],
        name: row[1],
        season: row[2],
        questionnaireId: row[3],
        status: row[4],
        opensAt: row[5] || null,
        closesAt: row[6] || null,
        createdAt: row[7] || null
      });
    }

    function saveQuestionnaire(questionnaire) {
      upsertById_(
        SHEETS.questionnaires,
        HEADERS.questionnaires,
        questionnaire.id,
        [
          questionnaire.id,
          questionnaire.title,
          questionnaire.version,
          questionnaire.audience,
          questionnaire.source || "",
          questionnaire.effectiveFrom || "",
          questionnaire.effectiveTo || "",
          JSON.stringify(questionnaire.questions)
        ]
      );

      return questionnaire;
    }

    function findQuestionnaireById(questionnaireId) {
      var row = findRowById_(
        SHEETS.questionnaires,
        HEADERS.questionnaires,
        questionnaireId
      );

      if (!row) {
        return null;
      }

      return AKS.Modules.HealthQuestionnaire.Questionnaire({
        id: row[0],
        title: row[1],
        version: row[2],
        audience: row[3],
        source: row[4] || null,
        effectiveFrom: row[5] || null,
        effectiveTo: row[6] || null,
        questions: JSON.parse(row[7] || "[]")
      });
    }

    function saveSubmission(record) {
      var submission = record.submission;
      var evaluation = record.evaluation;

      ensureSheet_(
        SHEETS.submissions,
        HEADERS.submissions
      ).appendRow([
        submission.id,
        submission.campaignId,
        submission.questionnaireId,
        submission.participantId,
        submission.respondentType,
        JSON.stringify(submission.answers),
        submission.declarationAccepted,
        evaluation.status,
        JSON.stringify(evaluation.missingQuestionIds),
        JSON.stringify(evaluation.positiveQuestionIds),
        submission.submittedAt,
        evaluation.evaluatedAt
      ]);

      return record;
    }

    function findLatestSubmissionByParticipant(
      participantId,
      campaignId
    ) {
      var values = ensureSheet_(
        SHEETS.submissions,
        HEADERS.submissions
      ).getDataRange().getValues();

      for (var index = values.length - 1; index >= 1; index -= 1) {
        var row = values[index];

        if (
          String(row[3]) === String(participantId) &&
          String(row[1]) === String(campaignId)
        ) {
          return {
            submission: AKS.Modules.HealthQuestionnaire.Submission({
              id: row[0],
              campaignId: row[1],
              questionnaireId: row[2],
              participantId: row[3],
              respondentType: row[4],
              answers: JSON.parse(row[5] || "{}"),
              declarationAccepted: row[6] === true,
              submittedAt: row[10]
            }),
            evaluation: Object.freeze({
              status: row[7],
              missingQuestionIds: Object.freeze(
                JSON.parse(row[8] || "[]")
              ),
              positiveQuestionIds: Object.freeze(
                JSON.parse(row[9] || "[]")
              ),
              evaluatedAt: row[11]
            })
          };
        }
      }

      return null;
    }

    function upsertById_(sheetName, headers, id, rowValues) {
      var sheet = ensureSheet_(sheetName, headers);
      var values = sheet.getDataRange().getValues();

      for (var index = 1; index < values.length; index += 1) {
        if (String(values[index][0]) === String(id)) {
          sheet
            .getRange(index + 1, 1, 1, rowValues.length)
            .setValues([rowValues]);
          return;
        }
      }

      sheet.appendRow(rowValues);
    }

    function findRowById_(sheetName, headers, id) {
      var sheet = ensureSheet_(sheetName, headers);
      var values = sheet.getDataRange().getValues();

      for (var index = 1; index < values.length; index += 1) {
        if (String(values[index][0]) === String(id)) {
          return values[index];
        }
      }

      return null;
    }

    return AKS.Modules.HealthQuestionnaire.RepositoryContract.validate(
      Object.freeze({
        ensureStorage: ensureStorage,
        saveSubmission: saveSubmission,
        findLatestSubmissionByParticipant:
          findLatestSubmissionByParticipant,
        saveCampaign: saveCampaign,
        findCampaignById: findCampaignById,
        saveQuestionnaire: saveQuestionnaire,
        findQuestionnaireById: findQuestionnaireById
      })
    );
  };
