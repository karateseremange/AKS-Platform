var AKS = AKS || {};
AKS.Admin = AKS.Admin || {};

/**
 * Creates the CONFIG-001 administration controller.
 *
 * @param {Object} accessApi
 * @param {Object} configurationService
 * @param {Function=} baseUrlProvider
 * @returns {Object}
 */
function AKS_createAdminConfigurationController_(
  accessApi,
  configurationService,
  baseUrlProvider
) {
  function deepFreeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    Object.keys(value).forEach(function (key) {
      deepFreeze_(value[key]);
    });
    return Object.freeze(value);
  }

  function authorizedEmail_() {
    return accessApi.assertCurrentUserAuthorized();
  }

  function baseUrl_() {
    try {
      return typeof baseUrlProvider === "function" ? baseUrlProvider() || "" : "";
    } catch (error) {
      return "";
    }
  }

  function presentDefinition_(definition) {
    var resolved;
    var invalidCode = null;

    try {
      resolved = configurationService.resolve(definition.key);
    } catch (error) {
      invalidCode = error.code || "CONFIG001_RESOLUTION_FAILURE";
      resolved = {
        value: null,
        source: "invalid",
        explicit: false,
        valid: false,
        lastModifiedAt: null,
        modifiedBy: null
      };
    }

    return {
      key: definition.key,
      label: definition.label,
      description: definition.description,
      type: definition.type,
      scope: definition.scope,
      required: definition.required,
      sensitive: definition.sensitive,
      administrable: definition.administrable,
      value: definition.sensitive ? null : resolved.value,
      source: resolved.source,
      explicit: resolved.explicit,
      valid: resolved.valid !== false,
      errorCode: invalidCode,
      lastModifiedAt: resolved.lastModifiedAt || null,
      modifiedBy: resolved.modifiedBy || null,
      canReset: definition.administrable &&
        resolved.explicit === true &&
        (!definition.required || definition.hasDefault)
    };
  }

  function definitionByKey_(key) {
    var matches = configurationService.definitions().filter(function (definition) {
      return definition.key === key;
    });
    if (matches.length !== 1) {
      var error = new Error("Paramètre inconnu : " + key);
      error.code = "CONFIG001_UNKNOWN_PARAMETER";
      throw error;
    }
    return matches[0];
  }

  function getViewModel() {
    var email = authorizedEmail_();
    return deepFreeze_({
      administrator: { email: email },
      navigation: {
        homeTarget: baseUrl_() + "?app=admin"
      },
      parameters: configurationService.definitions().map(presentDefinition_)
    });
  }

  function save(key, value) {
    var email = authorizedEmail_();
    var definition = definitionByKey_(key);
    if (definition.sensitive) {
      var error = new Error(
        "Un paramètre sensible ne peut pas être modifié depuis cette interface."
      );
      error.code = "CONFIG001_SENSITIVE_WRITE_FORBIDDEN";
      throw error;
    }
    configurationService.set(key, value, { actor: email });
    return deepFreeze_({
      ok: true,
      parameter: presentDefinition_(definition)
    });
  }

  function reset(key) {
    var email = authorizedEmail_();
    var definition = definitionByKey_(key);
    if (definition.sensitive) {
      var error = new Error(
        "Un paramètre sensible ne peut pas être modifié depuis cette interface."
      );
      error.code = "CONFIG001_SENSITIVE_WRITE_FORBIDDEN";
      throw error;
    }
    configurationService.remove(key, { actor: email });
    return deepFreeze_({
      ok: true,
      parameter: presentDefinition_(definition)
    });
  }

  return Object.freeze({
    getViewModel: getViewModel,
    save: save,
    reset: reset
  });
}

function AKS_createProductionAdminConfigurationController_() {
  var service = AKS_createConfigurationService_(
    AKS_createPlatformParameterRegistry_(),
    AKS_createScriptParameterValueStore_()
  );

  return AKS_createAdminConfigurationController_(
    AKS.Admin.Access,
    service,
    function () {
      return ScriptApp.getService().getUrl() || "";
    }
  );
}

AKS.Admin.Configuration = Object.freeze({
  getViewModel: function () {
    return AKS_createProductionAdminConfigurationController_().getViewModel();
  },
  render: function () {
    var template = HtmlService.createTemplateFromFile("ui/admin/Configuration");
    template.viewModel = this.getViewModel();
    return template
      .evaluate()
      .setTitle("Paramétrage — AKS Platform")
      .addMetaTag("viewport", "width=device-width, initial-scale=1");
  }
});

function AKS_saveAdminConfigurationParameter(key, value) {
  return AKS_createProductionAdminConfigurationController_().save(key, value);
}

function AKS_resetAdminConfigurationParameter(key) {
  return AKS_createProductionAdminConfigurationController_().reset(key);
}

function AKS_includeAdminConfigurationFile_(path) {
  return HtmlService.createHtmlOutputFromFile(path).getContent();
}
