AKS.Tests = AKS.Tests || {};
AKS.Tests.HealthQuestionnaireWebRuntimeFix = {
  run: function () {
    var view = HtmlService.createHtmlOutputFromFile(
      "modules/health-questionnaire/web/HealthQuestionnaireWebView"
    ).getContent();
    var client = HtmlService.createHtmlOutputFromFile(
      "modules/health-questionnaire/web/HealthQuestionnaireClient.js"
    ).getContent();

    AKS.Tests.assertFalse(
      view.indexOf("AKS_HEALTH_FLOW") !== -1,
      "La vue ne doit plus injecter le flux dans une instruction JavaScript."
    );
    AKS.Tests.assertTrue(
      client.indexOf('document.querySelectorAll("[data-step-id]")') !== -1,
      "Le client doit reconstruire le flux depuis le DOM."
    );
    AKS.Tests.assertTrue(
      client.indexOf("identityNext.disabled = !valid") !== -1,
      "La validation doit piloter l'état du bouton Continuer."
    );
  }
};
