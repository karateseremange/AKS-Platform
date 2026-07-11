var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.Module = Object.freeze({
  id: "health-questionnaire",
  name: "Questionnaire santé",
  version: "0.1.0",
  status: "active",

  getDescriptor: function () {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      status: this.status
    };
  },

  install: function () {
    if (
      AKS.Modules.HealthQuestionnaire.SheetsRepository
    ) {
      AKS.Modules.HealthQuestionnaire
        .SheetsRepository()
        .ensureStorage();
    }
  }
});
