var AKS = AKS || {};
AKS.Admin = AKS.Admin || {};

/**
 * Administrative Dashboard controller.
 *
 * The controller authorizes the current Google user, reads release metadata
 * from AKS.Version and passes a presentation model to the HTML view.
 */
AKS.Admin.Dashboard = (function () {
  function buildViewModel_(authorizedEmail) {
    var releaseInfo = AKS.Version.getReleaseInfo();

    return Object.freeze({
      platform: Object.freeze({
        name: "AKS Platform",
        version: releaseInfo.version,
        releaseName: releaseInfo.releaseName
      }),
      administrator: Object.freeze({
        email: authorizedEmail
      }),
      actions: Object.freeze([])
    });
  }

  function getViewModel() {
    var authorizedEmail = AKS.Admin.Access.assertCurrentUserAuthorized();
    return buildViewModel_(authorizedEmail);
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
    buildViewModelForAuthorizedUser: function (email) {
      return buildViewModel_(AKS.Admin.Access.assertAuthorized(email));
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
