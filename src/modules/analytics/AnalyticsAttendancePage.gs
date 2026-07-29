var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * ANALYTICS-SAISIE-003 mobile attendance page.
 * Authorization data is resolved server-side before the template is rendered.
 */
function AKS_createAttendancePage_(
  accessContextProvider,
  baseUrlProvider,
  recipeMode
) {
  function baseUrl_() {
    try {
      return typeof baseUrlProvider === "function" ? baseUrlProvider() || "" : "";
    } catch (ignored) {
      return "";
    }
  }

  function getViewModel_() {
    var accessViewModel = accessContextProvider();
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
    getViewModel: function () {
      return getViewModel_();
    },

    render: function () {
      var viewModel = getViewModel_();
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

AKS.Analytics.AttendancePage = AKS_createAttendancePage_(
  function () {
    return AKS_createAttendanceServerApi_().getAccessContext();
  },
  function () {
    return ScriptApp.getService().getUrl();
  },
  false
);

AKS.Analytics.AttendanceRecipePage = AKS_createAttendancePage_(
  function () {
    return AKS.Analytics.AttendanceMobileRecipe.getAccessContext();
  },
  function () {
    return ScriptApp.getService().getUrl();
  },
  true
);

function AKS_includeAttendanceFile_(path) {
  return HtmlService.createHtmlOutputFromFile(path).getContent();
}
