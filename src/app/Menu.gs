var AKS = AKS || {};
AKS.App = AKS.App || {};

/**
 * Builds the AKS Platform menu.
 */
AKS.App.Menu = Object.freeze({
  build: function () {
    var ui = SpreadsheetApp.getUi();

    ui.createMenu("AKS Platform")
      .addItem(
        "Ouvrir le questionnaire santé",
        "AKS_openHealthQuestionnaire"
      )
      .addItem(
        "Configurer la campagne active",
        "AKS_configureActiveHealthCampaign"
      )
      .addSeparator()
      .addItem(
        "Initialiser la plateforme",
        "AKS_install"
      )
      .addToUi();
  }
});
