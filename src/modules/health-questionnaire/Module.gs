var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.Module = Object.freeze({
  id: "health-questionnaire",
  name: "Questionnaire santé",
  version: "0.3.0",
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

    if (!AKS.Core.Container.has(
      "healthQuestionnaire.repository"
    )) {
      AKS.Core.Container.register(
        "healthQuestionnaire.repository",
        repository
      );
    }

    if (!AKS.Core.Container.has(
      "healthQuestionnaire.settings"
    )) {
      AKS.Core.Container.register(
        "healthQuestionnaire.settings",
        AKS.Modules.HealthQuestionnaire
          .HealthQuestionnaireSettings()
      );
    }

    if (!AKS.Core.Container.has(
      "healthQuestionnaire.service"
    )) {
      AKS.Core.Container.factory(
        "healthQuestionnaire.service",
        function (container) {
          return AKS.Modules.HealthQuestionnaire
            .HealthQuestionnaireApplicationService(
              container.resolve(
                "healthQuestionnaire.repository"
              )
            );
        }
      );
    }

    if (!AKS.Core.Container.has(
      "healthQuestionnaire.controller"
    )) {
      AKS.Core.Container.factory(
        "healthQuestionnaire.controller",
        function (container) {
          return AKS.Modules.HealthQuestionnaire
            .HealthQuestionnaireController(
              container.resolve(
                "healthQuestionnaire.repository"
              ),
              container.resolve(
                "healthQuestionnaire.service"
              ),
              container.resolve(
                "healthQuestionnaire.settings"
              )
            );
        }
      );
    }
  }
});
