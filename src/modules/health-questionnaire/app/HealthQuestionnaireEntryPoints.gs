/**
 * Opens the health questionnaire sidebar.
 */
function AKS_openHealthQuestionnaire() {
  var installResult =
    AKS.Core.Application.install();

  if (!installResult.ok) {
    SpreadsheetApp.getUi().alert(
      "AKS Platform",
      installResult.error.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  var template = HtmlService.createTemplateFromFile(
    "modules/health-questionnaire/ui/HealthQuestionnaireSidebar"
  );

  var html = template
    .evaluate()
    .setTitle("Questionnaire santé");

  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Returns the current questionnaire context to the sidebar.
 *
 * @param {string} participantId
 * @returns {Object}
 */
function AKS_getHealthQuestionnaireContext(participantId) {
  AKS.Core.Application.install();

  return AKS.Core.Container
    .resolve("healthQuestionnaire.controller")
    .getContext(participantId || null);
}

/**
 * Submits answers from the sidebar.
 *
 * @param {Object} payload
 * @returns {Object}
 */
function AKS_submitHealthQuestionnaire(payload) {
  AKS.Core.Application.install();

  return AKS.Core.Container
    .resolve("healthQuestionnaire.controller")
    .submit(payload);
}

/**
 * Prompts the administrator for the active campaign id.
 */
function AKS_configureActiveHealthCampaign() {
  AKS.Core.Application.install();

  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    "Questionnaire santé",
    "Identifiant de la campagne à activer :",
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  var result = AKS.Core.Container
    .resolve("healthQuestionnaire.controller")
    .setActiveCampaign(
      response.getResponseText().trim()
    );

  ui.alert(
    "Questionnaire santé",
    result.ok
      ? "La campagne active a été enregistrée."
      : result.error.message,
    ui.ButtonSet.OK
  );
}
