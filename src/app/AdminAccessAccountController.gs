var AKS = AKS || {};
AKS.Admin = AKS.Admin || {};

/** ACCESS-002-03 protected administration controller. */
function AKS_createAdminAccessAccountController_(options) {
  "use strict";
  options = options || {};
  var accessService = options.accessService;
  var projection = options.projection;
  var lifecycle = options.lifecycle;
  var baseUrlProvider = options.baseUrlProvider || function () { return ""; };

  function authorize_() {
    if (!accessService ||
        accessService.assertAdministrativeCapability("ACCESS_MANAGE") !== true) {
      var error = new Error("Gestion des accès non autorisée.");
      error.code = "ACCESS_CAPABILITY_DENIED";
      throw error;
    }
  }

  function list(query) {
    authorize_();
    return projection.listAccounts(query || {});
  }

  function viewModel(query) {
    var model = list(query);
    return Object.freeze({
      navigation: Object.freeze({
        homeTarget: baseUrlProvider() + "?app=admin",
        accessTarget: baseUrlProvider() + "?app=access"
      }),
      projection: model,
      roles: Object.freeze([
        "ADMINISTRATEUR", "ASSISTANT_AFA", "CONSULTATION", "PROFESSEUR"
      ])
    });
  }

  function command_(method, command) {
    authorize_();
    return lifecycle[method](command || {});
  }

  return Object.freeze({
    getViewModel: viewModel,
    listAccounts: list,
    createAccount: function (command) { return command_("createAccount", command); },
    deactivateAccount: function (command) { return command_("deactivateAccount", command); },
    reactivateAccount: function (command) { return command_("reactivateAccount", command); }
  });
}

function AKS_createProductionAdminAccessAccountController_() {
  var accessService = AKS_createAccessService_();
  var admin = AKS.Core.AccessAdmin.create({ accessService: accessService });
  return AKS_createAdminAccessAccountController_({
    accessService: accessService,
    projection: AKS.Core.AccessAccountProjection.create({ accessAdmin: admin }),
    lifecycle: AKS.Core.AccessAccountLifecycle.create({ accessAdmin: admin }),
    baseUrlProvider: function () { return ScriptApp.getService().getUrl() || ""; }
  });
}

AKS.Admin.AccessAccounts = Object.freeze({
  getViewModel: function (query) {
    return AKS_createProductionAdminAccessAccountController_().getViewModel(query);
  },
  render: function (query) {
    var template = HtmlService.createTemplateFromFile("ui/admin/AccessAccounts");
    template.viewModel = this.getViewModel(query);
    return template.evaluate().setTitle("Comptes et accès — AKS Platform")
      .addMetaTag("viewport", "width=device-width, initial-scale=1");
  }
});

function AKS_listAdminAccessAccounts(query) {
  return AKS_createProductionAdminAccessAccountController_().listAccounts(query);
}
function AKS_createAdminAccessAccount(command) {
  return AKS_createProductionAdminAccessAccountController_().createAccount(command);
}
function AKS_deactivateAdminAccessAccount(command) {
  return AKS_createProductionAdminAccessAccountController_().deactivateAccount(command);
}
function AKS_reactivateAdminAccessAccount(command) {
  return AKS_createProductionAdminAccessAccountController_().reactivateAccount(command);
}
function AKS_includeAdminAccessAccountFile_(path) {
  return HtmlService.createHtmlOutputFromFile(path).getContent();
}
