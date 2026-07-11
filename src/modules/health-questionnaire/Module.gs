var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.Module = Object.freeze({
  id: "health-questionnaire",
  name: "Questionnaire santé",
  version: "0.2.1",
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
    var repository =
      AKS.Modules.HealthQuestionnaire
        .HealthQuestionnaireSheetsRepository();

    repository.ensureStorage();

    if (!AKS.Core.Container.has("healthQuestionnaire.repository")) {
      AKS.Core.Container.register(
        "healthQuestionnaire.repository",
        repository
      );
    }

    if (!AKS.Core.Container.has("healthQuestionnaire.service")) {
      AKS.Core.Container.factory(
        "healthQuestionnaire.service",
        function (container) {
          return AKS.Modules.HealthQuestionnaire
            .HealthQuestionnaireApplicationService(
              container.resolve("healthQuestionnaire.repository")
            );
        }
      );
    }
  }
});
