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
        "questionnaireVersion",
        "email",
        "lastName",
        "firstName",
        "birthDate",
        "ageAtSubmission",
        "sex",
        "legalRepresentativeLastName",
        "legalRepresentativeFirstName",
        "result",
        "status",
        "processingVersion",
        "submittedAt",
        "respondentEmailSentAt",
        "clubEmailSentAt",
        "attestationFileId",
        "attestationFileUrl"
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

    function headersMatch_(sheet, expectedHeaders) {
      if (sheet.getLastColumn() !== expectedHeaders.length) {
        return false;
      }

      var actual = sheet
        .getRange(1, 1, 1, expectedHeaders.length)
        .getValues()[0];

      return expectedHeaders.every(function (header, index) {
        return String(actual[index]) === header;
      });
    }

    function createLegacySheetName_() {
      return "HQ_Submissions_Legacy_" +
        Utilities.formatDate(
          new Date(),
          Session.getScriptTimeZone(),
          "yyyyMMdd_HHmmss"
        );
    }

    function migrateSubmissionStorage() {
      var spreadsheet = getSpreadsheet_();
      var sheet = spreadsheet.getSheetByName(SHEETS.submissions);

      if (!sheet) {
        ensureSheet_(SHEETS.submissions, HEADERS.submissions);
        return { migrated: false, backupSheetName: null };
      }

      if (headersMatch_(sheet, HEADERS.submissions)) {
        return { migrated: false, backupSheetName: null };
      }

      var backupSheetName = createLegacySheetName_();
      sheet.setName(backupSheetName);
      ensureSheet_(SHEETS.submissions, HEADERS.submissions);

      return {
        migrated: true,
        backupSheetName: backupSheetName
      };
    }

    function ensureStorage() {
      ensureSheet_(SHEETS.campaigns, HEADERS.campaigns);
      ensureSheet_(SHEETS.questionnaires, HEADERS.questionnaires);
      var migration = migrateSubmissionStorage();

      return {
        spreadsheetId: getSpreadsheet_().getId(),
        sheets: [
          SHEETS.campaigns,
          SHEETS.questionnaires,
          SHEETS.submissions
        ],
        submissionMigration: migration
      };
    }

    function saveCampaign(campaign) {
      upsertById_(SHEETS.campaigns, HEADERS.campaigns, campaign.id, [
        campaign.id,
        campaign.name,
        campaign.season,
        campaign.questionnaireId,
        campaign.status,
        campaign.opensAt || "",
        campaign.closesAt || "",
        campaign.createdAt || new Date()
      ]);
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

    function listCampaigns() {
      var values = ensureSheet_(
        SHEETS.campaigns,
        HEADERS.campaigns
      ).getDataRange().getValues();
      var campaigns = [];

      for (var index = 1; index < values.length; index += 1) {
        var row = values[index];
        if (!row[0]) {
          continue;
        }
        campaigns.push(
          AKS.Modules.HealthQuestionnaire.HealthCampaign({
            id: row[0],
            name: row[1],
            season: row[2],
            questionnaireId: row[3],
            status: row[4],
            opensAt: row[5] || null,
            closesAt: row[6] || null,
            createdAt: row[7] || null
          })
        );
      }

      campaigns.sort(function (left, right) {
        var seasonComparison = String(right.season).localeCompare(
          String(left.season)
        );
        return seasonComparison !== 0
          ? seasonComparison
          : String(left.name).localeCompare(String(right.name));
      });
      return campaigns;
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
        version: normalizeQuestionnaireVersion_(row[2]),
        audience: row[3],
        source: row[4] || null,
        effectiveFrom: row[5] || null,
        effectiveTo: row[6] || null,
        questions: JSON.parse(row[7] || "[]")
      });
    }

    function normalizeQuestionnaireVersion_(value) {
      if (value instanceof Date) {
        return Utilities.formatDate(
          value,
          "UTC",
          "yyyy-MM-dd"
        );
      }

      return String(value || "").trim();
    }

    function saveSubmission(submission) {
      if (Object.prototype.hasOwnProperty.call(submission, "answers")) {
        throw new AKS.Core.Exception(
          "HEALTH_REPOSITORY_ANSWERS_FORBIDDEN",
          "Detailed answers must not be persisted."
        );
      }

      migrateSubmissionStorage();
      upsertById_(
        SHEETS.submissions,
        HEADERS.submissions,
        submission.id,
        [
          submission.id,
          submission.campaignId,
          submission.questionnaireId,
          submission.questionnaireVersion,
          submission.email,
          submission.lastName,
          submission.firstName,
          submission.birthDate,
          submission.ageAtSubmission,
          submission.sex,
          submission.legalRepresentativeLastName,
          submission.legalRepresentativeFirstName,
          submission.result,
          submission.status,
          submission.processingVersion,
          submission.submittedAt,
          submission.respondentEmailSentAt || "",
          submission.clubEmailSentAt || "",
          submission.attestationFileId || "",
          submission.attestationFileUrl || ""
        ]
      );
      return submission;
    }

    function rowToSubmission_(row) {
      return AKS.Modules.HealthQuestionnaire.Submission({
        id: row[0],
        campaignId: row[1],
        questionnaireId: row[2],
        questionnaireVersion: normalizeQuestionnaireVersion_(row[3]),
        email: row[4],
        lastName: row[5],
        firstName: row[6],
        birthDate: row[7],
        sex: row[9],
        legalRepresentativeLastName: row[10],
        legalRepresentativeFirstName: row[11],
        result: row[12],
        status: row[13],
        processingVersion: row[14],
        submittedAt: row[15],
        respondentEmailSentAt: row[16] || null,
        clubEmailSentAt: row[17] || null,
        attestationFileId: row[18] || null,
        attestationFileUrl: row[19] || null
      });
    }

    function findSubmissionById(submissionId) {
      migrateSubmissionStorage();
      var row = findRowById_(
        SHEETS.submissions,
        HEADERS.submissions,
        submissionId
      );
      return row ? rowToSubmission_(row) : null;
    }

    function listSubmissionsByCampaign(campaignId) {
      migrateSubmissionStorage();
      var values = ensureSheet_(
        SHEETS.submissions,
        HEADERS.submissions
      ).getDataRange().getValues();
      var submissions = [];

      for (var index = 1; index < values.length; index += 1) {
        var row = values[index];
        if (row[0] && String(row[1]) === String(campaignId)) {
          submissions.push(rowToSubmission_(row));
        }
      }
      return submissions;
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
        migrateSubmissionStorage: migrateSubmissionStorage,
        saveSubmission: saveSubmission,
        findSubmissionById: findSubmissionById,
        listSubmissionsByCampaign: listSubmissionsByCampaign,
        saveCampaign: saveCampaign,
        findCampaignById: findCampaignById,
        listCampaigns: listCampaigns,
        saveQuestionnaire: saveQuestionnaire,
        findQuestionnaireById: findQuestionnaireById
      })
    );
  };
