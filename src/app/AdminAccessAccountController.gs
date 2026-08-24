var AKS = AKS || {};
AKS.Admin = AKS.Admin || {};

/** ACCESS-002-03 protected administration controller. */
function AKS_createAdminAccessAccountController_(options) {
  "use strict";
  options = options || {};
  var accessService = options.accessService;
  var projection = options.projection;
  var detail = options.detail;
  var history = options.history;
  var historyProvider = options.historyProvider || function () { return history; };
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

  function detail_(method, value) {
    authorize_();
    return detail[method](value);
  }

  return Object.freeze({
    getViewModel: viewModel,
    listAccounts: list,
    getAccountDetail: function (accountId) {
      return detail_("getAccountDetail", accountId);
    },
    previewAccountAccess: function (command) {
      return detail_("previewAccountAccess", command || {});
    },
    saveAccountAccess: function (command) {
      return detail_("saveAccountAccess", command || {});
    },
    getAccountHistory: function (accountId, cursor) {
      authorize_();
      try {
        var historyService = historyProvider();
        if (!historyService ||
            typeof historyService.getAccountHistory !== "function") {
          throw new Error("Historique indisponible.");
        }
        return historyService.getAccountHistory(accountId, cursor || "");
      } catch (failure) {
        var unavailable = new Error(
          "L’historique des modifications est temporairement indisponible."
        );
        unavailable.code = "ACCESS_HISTORY_UNAVAILABLE";
        throw unavailable;
      }
    },
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
    detail: AKS.Core.AccessAccountDetail.create({ accessAdmin: admin }),
    historyProvider: AKS_createDefaultAccessAccountHistoryService_,
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
function AKS_getAdminAccessAccountDetail(accountId) {
  return AKS_createProductionAdminAccessAccountController_().getAccountDetail(accountId);
}
function AKS_previewAdminAccessAccount(command) {
  return AKS_createProductionAdminAccessAccountController_().previewAccountAccess(command);
}
function AKS_saveAdminAccessAccount(command) {
  return AKS_createProductionAdminAccessAccountController_().saveAccountAccess(command);
}
function AKS_getAdminAccessAccountHistory(accountId, cursor) {
  return AKS_createProductionAdminAccessAccountController_()
    .getAccountHistory(accountId, cursor);
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
