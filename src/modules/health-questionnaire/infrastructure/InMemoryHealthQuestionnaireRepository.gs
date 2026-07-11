var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.HealthQuestionnaireInMemoryRepository =
  function () {
    var submissions = Object.create(null);
    var submissionOrder = [];
    var campaigns = Object.create(null);
    var questionnaires = Object.create(null);

    function listCampaigns() {
      return Object.keys(campaigns)
        .map(function (campaignId) {
          return campaigns[campaignId];
        })
        .sort(function (left, right) {
          var seasonComparison = String(right.season).localeCompare(
            String(left.season)
          );
          return seasonComparison !== 0
            ? seasonComparison
            : String(left.name).localeCompare(String(right.name));
        });
    }

    return AKS.Modules.HealthQuestionnaire.RepositoryContract.validate(
      Object.freeze({
        saveSubmission: function (submission) {
          if (Object.prototype.hasOwnProperty.call(submission, "answers")) {
            throw new AKS.Core.Exception(
              "HEALTH_REPOSITORY_ANSWERS_FORBIDDEN",
              "Detailed answers must not be persisted."
            );
          }

          if (!submissions[submission.id]) {
            submissionOrder.push(submission.id);
          }
          submissions[submission.id] = submission;
          return submission;
        },

        findSubmissionById: function (submissionId) {
          return submissions[submissionId] || null;
        },

        listSubmissionsByCampaign: function (campaignId) {
          return submissionOrder
            .map(function (submissionId) {
              return submissions[submissionId];
            })
            .filter(function (submission) {
              return submission.campaignId === String(campaignId);
            });
        },

        saveCampaign: function (campaign) {
          campaigns[campaign.id] = campaign;
          return campaign;
        },

        findCampaignById: function (campaignId) {
          return campaigns[campaignId] || null;
        },

        listCampaigns: listCampaigns,

        saveQuestionnaire: function (questionnaire) {
          questionnaires[questionnaire.id] = questionnaire;
          return questionnaire;
        },

        findQuestionnaireById: function (questionnaireId) {
          return questionnaires[questionnaireId] || null;
        },

        clear: function () {
          submissions = Object.create(null);
          submissionOrder = [];
          campaigns = Object.create(null);
          questionnaires = Object.create(null);
        }
      })
    );
  };
