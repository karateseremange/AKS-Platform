/**
 * Public Web App entry point for the health questionnaire.
 *
 * HQ-005.2 Sprint 1 only renders the public flow. No submission endpoint is
 * exposed yet.
 *
 * @param {Object=} event
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet(event) {
  var installResult = AKS.Core.Application.install();

  if (!installResult.ok) {
    return AKS_renderHealthQuestionnaireWebError_(
      "APPLICATION_UNAVAILABLE",
      "Le questionnaire santé est temporairement indisponible."
    );
  }

  var controller = AKS.Core.Container.resolve(
    "healthQuestionnaire.webController"
  );
  var viewResult = controller.getPublicViewModel(event || {});

  if (!viewResult.ok) {
    return AKS_renderHealthQuestionnaireWebError_(
      viewResult.error.code,
      viewResult.error.message
    );
  }

  return AKS_evaluateHealthQuestionnaireWebTemplate_(viewResult.data);
}

/**
 * Evaluates the public shell with the supplied presentation model.
 *
 * @param {Object} viewModel
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function AKS_evaluateHealthQuestionnaireWebTemplate_(viewModel) {
  var template = HtmlService.createTemplateFromFile(
    "modules/health-questionnaire/web/HealthQuestionnaireWebView"
  );
  template.viewModel = viewModel;

  return template
    .evaluate()
    .setTitle("Questionnaire santé — Association Karaté Serémange")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/**
 * Renders a dynamic HTML partial with the current view model.
 *
 * @param {string} path
 * @param {Object} viewModel
 * @returns {string}
 */
function AKS_renderHealthQuestionnaireWebPartial_(path, viewModel) {
  var template = HtmlService.createTemplateFromFile(path);
  template.viewModel = viewModel;
  return template.evaluate().getContent();
}

/**
 * Includes a static HTML, CSS or JavaScript fragment.
 *
 * @param {string} path
 * @returns {string}
 */
function AKS_includeHealthQuestionnaireWebFile_(path) {
  return HtmlService.createHtmlOutputFromFile(path).getContent();
}

/**
 * Renders a public error page without exposing technical details.
 *
 * @param {string} code
 * @param {string} message
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function AKS_renderHealthQuestionnaireWebError_(code, message) {
  return AKS_evaluateHealthQuestionnaireWebTemplate_({
    available: false,
    errorCode: code || "UNEXPECTED_ERROR",
    errorMessage: message ||
      "Le questionnaire santé est temporairement indisponible.",
    brand: {
      clubName: "Association Karaté Serémange",
      primaryColor: "#2a4b9b"
    }
  });
}
