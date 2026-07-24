var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * ADMIN-004 contract for dashboard providers and declarative widgets.
 */
function AKS_createDashboardContract_() {
  var CONTRACT_VERSION = "1.0";
  var WIDGET_TYPES = [
    "information",
    "metric",
    "status",
    "navigation",
    "notification",
    "empty-state"
  ];
  var WIDGET_ZONES = ["header", "summary", "modules", "quick-actions"];
  var WIDGET_STATES = [
    "loading",
    "available",
    "empty",
    "unavailable",
    "error",
    "access-denied",
    "disabled"
  ];
  var ACTION_TYPES = ["navigate", "open-document", "open-external"];

  function createError_(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function isNonEmptyString_(value) {
    return typeof value === "string" && value.trim() !== "";
  }

  function contains_(values, value) {
    return values.indexOf(value) !== -1;
  }

  function assertDeclarative_(value, path, seen) {
    if (typeof value === "function" || typeof value === "undefined") {
      throw createError_(
        "ADMIN004_INVALID_WIDGET",
        path + " doit être entièrement déclaratif."
      );
    }

    if (!value || typeof value !== "object") {
      return;
    }

    if (
      Object.prototype.toString.call(value) !== "[object Object]" &&
      !Array.isArray(value)
    ) {
      throw createError_(
        "ADMIN004_INVALID_WIDGET",
        path + " contient un type non sérialisable."
      );
    }

    if (seen.indexOf(value) !== -1) {
      throw createError_(
        "ADMIN004_INVALID_WIDGET",
        path + " contient une référence circulaire."
      );
    }

    seen.push(value);
    Object.keys(value).forEach(function (key) {
      assertDeclarative_(value[key], path + "." + key, seen);
    });
    seen.pop();
  }

  function validateProvider(provider) {
    if (
      !provider ||
      typeof provider.getProviderId !== "function" ||
      typeof provider.getProviderMetadata !== "function" ||
      typeof provider.getWidgets !== "function"
    ) {
      throw createError_(
        "ADMIN004_PROVIDER_FAILURE",
        "Le fournisseur DashboardProvider est incomplet."
      );
    }

    var providerId = provider.getProviderId();
    var metadata = provider.getProviderMetadata();

    if (
      !isNonEmptyString_(providerId) ||
      !metadata ||
      typeof metadata !== "object" ||
      metadata.providerId !== providerId ||
      !isNonEmptyString_(metadata.moduleId) ||
      !isNonEmptyString_(metadata.label) ||
      !isNonEmptyString_(metadata.providerVersion) ||
      typeof metadata.enabled !== "boolean"
    ) {
      throw createError_(
        "ADMIN004_PROVIDER_FAILURE",
        "Les métadonnées du fournisseur sont invalides."
      );
    }

    if (metadata.contractVersion !== CONTRACT_VERSION) {
      throw createError_(
        "ADMIN004_UNSUPPORTED_CONTRACT",
        "Version de contrat DashboardProvider non supportée."
      );
    }

    assertDeclarative_(metadata, "providerMetadata", []);
    return metadata;
  }

  function validateAction_(action) {
    if (
      !action ||
      !isNonEmptyString_(action.actionId) ||
      !isNonEmptyString_(action.label) ||
      !contains_(ACTION_TYPES, action.type) ||
      !isNonEmptyString_(action.target)
    ) {
      throw createError_(
        "ADMIN004_INVALID_WIDGET",
        "Une action du widget est invalide."
      );
    }
  }

  function validateWidget(widget, providerId) {
    if (
      !widget ||
      !isNonEmptyString_(widget.widgetId) ||
      widget.providerId !== providerId ||
      !contains_(WIDGET_TYPES, widget.type) ||
      !contains_(WIDGET_ZONES, widget.zone) ||
      !isNonEmptyString_(widget.title) ||
      !contains_(WIDGET_STATES, widget.state) ||
      typeof widget.priority !== "number" ||
      !isFinite(widget.priority) ||
      !Object.prototype.hasOwnProperty.call(widget, "content")
    ) {
      throw createError_(
        "ADMIN004_INVALID_WIDGET",
        "Le DashboardWidget ne respecte pas le contrat minimal."
      );
    }

    if (widget.actions !== undefined) {
      if (!Array.isArray(widget.actions)) {
        throw createError_(
          "ADMIN004_INVALID_WIDGET",
          "Les actions du widget doivent former une collection."
        );
      }
      widget.actions.forEach(validateAction_);
    }

    assertDeclarative_(widget, "widget", []);
    return widget;
  }

  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    widgetTypes: Object.freeze(WIDGET_TYPES.slice()),
    widgetZones: Object.freeze(WIDGET_ZONES.slice()),
    widgetStates: Object.freeze(WIDGET_STATES.slice()),
    actionTypes: Object.freeze(ACTION_TYPES.slice()),
    validateProvider: validateProvider,
    validateWidget: validateWidget
  });
}

AKS.Core.DashboardContract = AKS_createDashboardContract_();
