var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.Module = Object.freeze({
  id: "health-questionnaire",
  name: "Questionnaire santé",
  version: "0.7.0",
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

    if (!AKS.Core.Container.has(
      "healthQuestionnaire.webController"
    )) {
      AKS.Core.Container.factory(
        "healthQuestionnaire.webController",
        function (container) {
          return AKS.Modules.HealthQuestionnaire
            .HealthQuestionnaireWebController(
              container.resolve(
                "healthQuestionnaire.repository"
              ),
              container.resolve(
                "healthQuestionnaire.settings"
              ),
              container.resolve(
                "healthQuestionnaire.attestationService"
              ),
              container.resolve(
                "healthQuestionnaire.notificationService"
              )
            );
        }
      );
    }

    if (!AKS.Core.Container.has(
      "healthQuestionnaire.attestationGenerator"
    )) {
      AKS.Core.Container.factory(
        "healthQuestionnaire.attestationGenerator",
        function () {
          return AKS.Modules.HealthQuestionnaire
            .HealthQuestionnaireAttestationGenerator();
        }
      );
    }

    if (!AKS.Core.Container.has(
      "healthQuestionnaire.attestationService"
    )) {
      AKS.Core.Container.factory(
        "healthQuestionnaire.attestationService",
        function (container) {
          return AKS.Modules.HealthQuestionnaire
            .HealthQuestionnaireAttestationService(
              container.resolve("healthQuestionnaire.repository"),
              container.resolve("healthQuestionnaire.attestationGenerator")
            );
        }
      );
    }

    if (!AKS.Core.Container.has(
      "healthQuestionnaire.emailGateway"
    )) {
      AKS.Core.Container.factory(
        "healthQuestionnaire.emailGateway",
        function () {
          return AKS.Modules.HealthQuestionnaire
            .HealthQuestionnaireEmailGateway();
        }
      );
    }

    if (!AKS.Core.Container.has(
      "healthQuestionnaire.notificationService"
    )) {
      AKS.Core.Container.factory(
        "healthQuestionnaire.notificationService",
        function (container) {
          return AKS.Modules.HealthQuestionnaire
            .HealthQuestionnaireNotificationService(
              container.resolve("healthQuestionnaire.repository"),
              container.resolve("healthQuestionnaire.emailGateway"),
              {
                clubEmail: "contact@karate-seremange.fr",
                senderName: "Association Karaté Serémange"
              }
            );
        }
      );
    }
  }
});
