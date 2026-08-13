var AKS = AKS || {};
AKS.Admin = AKS.Admin || {};

/**
 * Administrative Dashboard controller.
 *
 * The controller authorizes the current Google user, reads release metadata
 * from AKS.Version and passes a presentation model to the HTML view.
 */
AKS.Admin.Dashboard = (function () {
  function getWebAppUrl_() {
    try {
      return ScriptApp.getService().getUrl() || "";
    } catch (error) {
      return "";
    }
  }

  function buildViewModel_(authorizedEmail, baseUrl, accessManageAuthorized) {
    var releaseInfo = AKS.Version.getReleaseInfo();
    var navigation = AKS.Admin.Navigation.getModel(
      typeof baseUrl === "string" ? baseUrl : getWebAppUrl_(),
      accessManageAuthorized === true
    );

    return Object.freeze({
      platform: Object.freeze({
        name: "AKS Platform",
        version: releaseInfo.version,
        releaseName: releaseInfo.releaseName
      }),
      administrator: Object.freeze({
        email: authorizedEmail
      }),
      navigation: navigation,
      actions: navigation.quickActions,
      recentLogs: AKS.Admin.Logs.getDashboardModelForAuthorizedUser(
        authorizedEmail,
        typeof baseUrl === "string" ? baseUrl : getWebAppUrl_()
      )
    });
  }

  function getViewModel() {
    var authorizedEmail = AKS.Admin.Access.assertCurrentUserAuthorized();
    var accessManageAuthorized = false;
    try {
      accessManageAuthorized =
        AKS_createAccessService_().assertAdministrativeCapability("ACCESS_MANAGE") === true;
    } catch (ignoredAccessRefusal) {}
    return buildViewModel_(authorizedEmail, undefined, accessManageAuthorized);
  }

  function render() {
    var template = HtmlService.createTemplateFromFile("ui/admin/Dashboard");
    template.viewModel = getViewModel();

    return template
      .evaluate()
      .setTitle("Administration — AKS Platform")
      .addMetaTag("viewport", "width=device-width, initial-scale=1");
  }

  return Object.freeze({
    getViewModel: getViewModel,
    render: render,
    buildViewModelForAuthorizedUser: function (email, baseUrl, accessManageAuthorized) {
      return buildViewModel_(
        AKS.Admin.Access.assertAuthorized(email),
        baseUrl,
        accessManageAuthorized
      );
    }
  });
})();

/**
 * Includes a static Dashboard fragment.
 *
 * @param {string} path
 * @returns {string}
 */
function AKS_includeAdminDashboardFile_(path) {
  return HtmlService.createHtmlOutputFromFile(path).getContent();
}
