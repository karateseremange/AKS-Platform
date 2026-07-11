/**
 * Opens the health questionnaire sidebar.
 */
function AKS_openHealthQuestionnaire() {
  var installResult = AKS.Core.Application.install();

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

  var html = template.evaluate().setTitle("Questionnaire santé");

  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Returns the current questionnaire context to the sidebar.
 *
 * @returns {Object}
 */
function AKS_getHealthQuestionnaireContext() {
  AKS.Core.Application.install();

  return AKS.Core.Container
    .resolve("healthQuestionnaire.controller")
    .getContext();
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
 * Lets the administrator select the active campaign from existing campaigns.
 */
function AKS_configureActiveHealthCampaign() {
  var installResult = AKS.Core.Application.install();
  var ui = SpreadsheetApp.getUi();

  if (!installResult.ok) {
    ui.alert(
      "Questionnaire santé",
      installResult.error.message,
      ui.ButtonSet.OK
    );
    return;
  }

  var controller = AKS.Core.Container.resolve(
    "healthQuestionnaire.controller"
  );
  var optionsResult = controller.getCampaignOptions();

  if (!optionsResult.ok) {
    ui.alert(
      "Questionnaire santé",
      optionsResult.error.message,
      ui.ButtonSet.OK
    );
    return;
  }

  var campaigns = optionsResult.data.campaigns;

  if (campaigns.length === 0) {
    ui.alert(
      "Questionnaire santé",
      "Aucune campagne n'est encore enregistrée.",
      ui.ButtonSet.OK
    );
    return;
  }

  var choices = campaigns.map(function (campaign, index) {
    var activeMarker = campaign.isActive ? " — active" : "";

    return (
      String(index + 1) +
      ". " +
      campaign.name +
      " (" +
      campaign.season +
      ", " +
      campaign.status +
      ")" +
      activeMarker
    );
  });

  var response = ui.prompt(
    "Questionnaire santé",
    "Saisissez le numéro de la campagne à activer :\n\n" +
      choices.join("\n"),
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  var selectedNumber = Number(response.getResponseText().trim());

  if (
    !Number.isInteger(selectedNumber) ||
    selectedNumber < 1 ||
    selectedNumber > campaigns.length
  ) {
    ui.alert(
      "Questionnaire santé",
      "Le numéro saisi ne correspond à aucune campagne.",
      ui.ButtonSet.OK
    );
    return;
  }

  var selectedCampaign = campaigns[selectedNumber - 1];
  var result = controller.setActiveCampaign(selectedCampaign.id);

  ui.alert(
    "Questionnaire santé",
    result.ok
      ? "La campagne « " + selectedCampaign.name + " » est maintenant active."
      : result.error.message,
    ui.ButtonSet.OK
  );
}

/**
 * Creates and activates a health questionnaire campaign.
 */
function AKS_createHealthCampaign() {
  var installResult = AKS.Core.Application.install();
  var ui = SpreadsheetApp.getUi();

  if (!installResult.ok) {
    ui.alert(
      "Questionnaire santé",
      installResult.error.message,
      ui.ButtonSet.OK
    );
    return;
  }

  var seasonResponse = ui.prompt(
    "Créer une campagne santé",
    "Indiquez la saison au format 2026-2027 :",
    ui.ButtonSet.OK_CANCEL
  );

  if (seasonResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  var season = seasonResponse.getResponseText().trim();

  if (!/^\d{4}-\d{4}$/.test(season)) {
    ui.alert(
      "Questionnaire santé",
      "La saison doit respecter le format 2026-2027.",
      ui.ButtonSet.OK
    );
    return;
  }

  var years = season.split("-");

  if (Number(years[1]) !== Number(years[0]) + 1) {
    ui.alert(
      "Questionnaire santé",
      "La seconde année doit suivre immédiatement la première.",
      ui.ButtonSet.OK
    );
    return;
  }

  var nameResponse = ui.prompt(
    "Créer une campagne santé",
    "Nom de la campagne (laisser vide pour « Campagne santé " +
      season + " ») :",
    ui.ButtonSet.OK_CANCEL
  );

  if (nameResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  var result = AKS.Core.Container
    .resolve("healthQuestionnaire.controller")
    .createCampaign({
      season: season,
      name: nameResponse.getResponseText().trim()
    });

  ui.alert(
    "Questionnaire santé",
    result.ok
      ? "La campagne « " + result.data.campaign.name +
        " » a été créée, ouverte et activée."
      : result.error.message,
    ui.ButtonSet.OK
  );
}
