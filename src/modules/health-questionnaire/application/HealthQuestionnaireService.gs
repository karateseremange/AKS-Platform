var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire = AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.Service = (function () {
  var repository = null;

  function configure(options) {
    if (!options || !options.repository) {
      throw new AKS.Core.Exception("HEALTH_REPOSITORY_REQUIRED", "A repository is required.");
    }
    repository = options.repository;
  }

  function submit(questionnaire, submissionData) {
    if (!repository) {
      throw new AKS.Core.Exception("HEALTH_SERVICE_NOT_CONFIGURED", "Service is not configured.");
    }

    var submission = AKS.Modules.HealthQuestionnaire.Submission(submissionData);
    var evaluation = AKS.Modules.HealthQuestionnaire.Evaluation.evaluate(questionnaire, submission);
    var record = Object.freeze({submission: submission, evaluation: evaluation});
    repository.save(record);
    return AKS.Core.Result.success(record);
  }

  function resetForTests() {
    repository = null;
  }

  return Object.freeze({configure: configure, submit: submit, resetForTests: resetForTests});
})();
