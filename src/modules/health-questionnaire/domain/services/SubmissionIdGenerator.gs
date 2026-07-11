var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};
AKS.Modules.HealthQuestionnaire.Services =
  AKS.Modules.HealthQuestionnaire.Services || {};

/**
 * Generates a readable sequential id for a campaign season.
 *
 * @param {string} season
 * @param {string} campaignId
 * @param {Object} repository
 * @returns {string}
 */
AKS.Modules.HealthQuestionnaire.Services.SubmissionIdGenerator =
  Object.freeze({
    generate: function (season, campaignId, repository) {
      var normalizedSeason = requireText_(season, "Campaign season");
      var normalizedCampaignId = requireText_(campaignId, "Campaign id");
      var startYear = normalizedSeason.split("-")[0];
      var highest = 0;
      var pattern;

      if (!/^\d{4}$/.test(startYear)) {
        throw new AKS.Core.Exception(
          "HEALTH_SUBMISSION_SEASON_INVALID",
          "Campaign season must start with a four-digit year."
        );
      }

      AKS.Modules.HealthQuestionnaire.RepositoryContract.validate(repository);
      pattern = new RegExp("^QS-" + startYear + "-(\\d{6})$");

      repository.listSubmissionsByCampaign(normalizedCampaignId).forEach(
        function (submission) {
          var match = pattern.exec(String(submission.id || ""));
          var sequence;

          if (!match) {
            return;
          }

          sequence = Number(match[1]);
          if (sequence > highest) {
            highest = sequence;
          }
        }
      );

      return "QS-" + startYear + "-" +
        String(highest + 1).padStart(6, "0");
    }
  });
