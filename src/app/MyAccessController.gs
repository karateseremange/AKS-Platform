var AKS = AKS || {};
AKS.App = AKS.App || {};

function AKS_immutableMyAccessView_(value) {
  function freeze_(entry) {
    if (!entry || typeof entry !== "object" || Object.isFrozen(entry)) return entry;
    Object.keys(entry).forEach(function (key) { freeze_(entry[key]); });
    return Object.freeze(entry);
  }
  return freeze_(JSON.parse(JSON.stringify(value)));
}

function AKS_createMyAccessDeniedViewModel_() {
  return AKS_immutableMyAccessView_({
    identity: { email: "" }, roles: [], state: "DENIED",
    message: "Accès non autorisé.", assignments: [],
    navigation: { homeTarget: "" }
  });
}

function AKS_createMyAccessController_(options) {
  "use strict";
  options = options || {};
  var service = options.service;
  var baseUrlProvider = options.baseUrlProvider || function () { return ""; };
  if (!service || typeof service.getMyAccess !== "function") {
    var failure = new Error("Consultation de vos accès indisponible.");
    failure.code = "ACCESS_MY_ACCESS_UNAVAILABLE"; throw failure;
  }
  function getViewModel() {
    var result = service.getMyAccess();
    return AKS_immutableMyAccessView_({
      identity: result.identity, roles: result.roles, state: result.state,
      message: result.message, assignments: result.assignments,
      navigation: Object.freeze({ homeTarget: baseUrlProvider() + "?app=admin" })
    });
  }
  return Object.freeze({ getViewModel: getViewModel });
}

function AKS_createProductionMyAccessController_() {
  return AKS_createMyAccessController_({
    service: AKS.Core.AccessMyAccess.create({ accessService: AKS_createAccessService_() }),
    baseUrlProvider: function () { return ScriptApp.getService().getUrl() || ""; }
  });
}

AKS.App.MyAccess = Object.freeze({
  render: function () {
    var template = HtmlService.createTemplateFromFile("ui/admin/MyAccess");
    try {
      template.viewModel = AKS_createProductionMyAccessController_().getViewModel();
    } catch (ignoredAccessRefusal) {
      template.viewModel = AKS_createMyAccessDeniedViewModel_();
    }
    return template.evaluate().setTitle("Mes accès — AKS Platform")
      .addMetaTag("viewport", "width=device-width, initial-scale=1");
  }
});

function AKS_getMyAccess() {
  return AKS_createProductionMyAccessController_().getViewModel();
}

function AKS_includeMyAccessFile_(path) {
  return HtmlService.createHtmlOutputFromFile(path).getContent();
}
