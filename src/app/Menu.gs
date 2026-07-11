var AKS = AKS || {};
AKS.App = AKS.App || {};

/**
 * Builds the minimal AKS Platform menu.
 */
AKS.App.Menu = Object.freeze({
  build: function () {
    var ui = SpreadsheetApp.getUi();

    ui.createMenu("AKS Platform")
      .addItem("Initialiser la plateforme", "AKS_install")
      .addToUi();
  }
});
