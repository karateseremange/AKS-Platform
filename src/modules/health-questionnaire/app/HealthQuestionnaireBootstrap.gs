function AKS_healthQuestionnaire_setup() {
  try {
    var repository = AKS.Modules.HealthQuestionnaire.SheetsRepository();
    repository.ensureStorage();
    AKS.Modules.HealthQuestionnaire.Service.configure({repository: repository});
    return AKS.Core.Result.success({module: "health-questionnaire", configured: true});
  } catch (error) {
    AKS.Core.Logger.error("Health questionnaire setup failed.", error);
    return AKS.Core.Result.failure(error.code || "HEALTH_SETUP_FAILED", error.message || String(error));
  }
}
