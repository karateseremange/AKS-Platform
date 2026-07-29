var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * ANALYTICS-SAISIE-003 mobile attendance page.
 * Authorization data is resolved server-side before the template is rendered.
 */
function AKS_createAttendancePage_(baseUrlProvider) {
  function baseUrl_() {
    try {
      return typeof baseUrlProvider === "function" ? baseUrlProvider() || "" : "";
    } catch (ignored) {
      return "";
    }
  }

  function getViewModel_(recipeMode) {
    var accessViewModel = recipeMode ?
      AKS.Analytics.AttendanceMobileRecipe.getAccessContext() :
      AKS_createAttendanceServerApi_().getAccessContext();
    var viewModel = {};
    Object.keys(accessViewModel).forEach(function (key) {
      viewModel[key] = accessViewModel[key];
    });
    viewModel.navigation = {
      homeTarget: String(baseUrl_()) + "?app=admin"
    };
    return viewModel;
  }

  return Object.freeze({
    getViewModel: function (options) {
      options = options || {};
      return getViewModel_(options.recipe === true);
    },

    render: function (options) {
      options = options || {};
      var recipeMode = options.recipe === true;
      var viewModel = getViewModel_(recipeMode);
      var template = HtmlService.createTemplateFromFile(
        "ui/analytics/Attendance"
      );
      template.viewModel = viewModel;
      template.recipeMode = recipeMode;

      return template
        .evaluate()
        .setTitle("Présences — Association Karaté Serémange")
        .addMetaTag("viewport", "width=device-width, initial-scale=1");
    }
  });
}

AKS.Analytics.AttendancePage = AKS_createAttendancePage_(function () {
  return ScriptApp.getService().getUrl();
});

function AKS_includeAttendanceFile_(path) {
  return HtmlService.createHtmlOutputFromFile(path).getContent();
}
