var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/** ACCESS-002-05 server-owned personal portal projection. */
function AKS_createAccessPortalProjectionService_(options) {
  "use strict";
  options = options || {};
  var accessService = options.accessService;
  var legacyAdministrator = options.legacyAdministrator || function () { return false; };
  var baseUrlProvider = options.baseUrlProvider || function () { return ""; };
  var DESTINATIONS = [
    { id: "module.analytics.attendance", label: "Saisie des présences",
      family: "modules", target: "?app=attendance", priority: 10,
      capabilities: ["COURSE_LIST", "ATTENDANCE_READ"] },
    { id: "module.analytics", label: "Analytics", family: "modules",
      target: "?app=analytics", priority: 20,
      capabilities: ["ANALYTICS_READ", "ANALYTICS_PREVIEW", "ANALYTICS_PUBLISH"] },
    { id: "admin.access", label: "Comptes et accès", family: "administration",
      target: "?app=access", priority: 10, capabilities: ["ACCESS_MANAGE"] },
    { id: "admin.config", label: "Paramétrage", family: "administration",
      target: "?app=config", priority: 20, historical: true },
    { id: "admin.logs", label: "Journaux", family: "administration",
      target: "?app=logs", priority: 30, historical: true },
    { id: "module.health-questionnaire", label: "Questionnaire santé",
      family: "modules", target: "?app=health-questionnaire", priority: 40,
      historical: true }
  ];

  function error_(code, message) {
    var failure = new Error(message); failure.code = code; return failure;
  }
  if (!accessService || typeof accessService.getEffectiveAccessSnapshot !== "function" ||
      typeof legacyAdministrator !== "function" || typeof baseUrlProvider !== "function") {
    throw error_("ACCESS_PORTAL_UNAVAILABLE", "Portail privé indisponible.");
  }
  function immutable_(value) {
    function freeze_(entry) {
      if (!entry || typeof entry !== "object" || Object.isFrozen(entry)) return entry;
      Object.keys(entry).forEach(function (key) { freeze_(entry[key]); });
      return Object.freeze(entry);
    }
    return freeze_(JSON.parse(JSON.stringify(value)));
  }
  function capabilities_(snapshot) {
    var result = {};
    snapshot.assignments.forEach(function (assignment) {
      assignment.capabilities.forEach(function (capability) { result[capability] = true; });
    });
    return result;
  }
  function target_(baseUrl, target) {
    return /^https:\/\/[^\s]+$/.test(baseUrl) && /^\?app=[a-z-]+$/.test(target)
      ? baseUrl + target : "";
  }
  function getPortalModel() {
    var snapshot = accessService.getEffectiveAccessSnapshot();
    var historical = legacyAdministrator(snapshot.email) === true;
    var capabilities = capabilities_(snapshot);
    var baseUrl = String(baseUrlProvider() || "").trim();
    var destinations = DESTINATIONS.filter(function (entry) {
      return entry.historical === true ? historical : entry.capabilities.some(function (capability) {
        return capabilities[capability] === true;
      });
    }).map(function (entry) {
      return {
        id: entry.id, label: entry.label, family: entry.family,
        target: target_(baseUrl, entry.target), priority: entry.priority,
        transitional: entry.historical === true
      };
    }).filter(function (entry) { return !!entry.target; }).sort(function (left, right) {
      return left.priority - right.priority || (left.id < right.id ? -1 : 1);
    });
    return immutable_({
      identity: { email: snapshot.email },
      state: destinations.length ? "AUTHORIZED" : "NO_ACCESS",
      hasEffectiveAccess: snapshot.assignments.length > 0,
      legacyAdministrativeAccess: historical,
      destinations: destinations
    });
  }
  return Object.freeze({ getPortalModel: getPortalModel });
}

AKS.Core.AccessPortalProjection = Object.freeze({
  create: AKS_createAccessPortalProjectionService_
});
