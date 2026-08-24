var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/** ACCESS-002-05 read-only projection for the active Google identity. */
function AKS_createAccessMyAccessService_(options) {
  "use strict";
  options = options || {};
  var accessService = options.accessService;
  function error_() {
    var failure = new Error("Consultation de vos accès indisponible.");
    failure.code = "ACCESS_MY_ACCESS_UNAVAILABLE"; return failure;
  }
  if (!accessService || typeof accessService.getEffectiveAccessSnapshot !== "function") {
    throw error_();
  }
  function immutable_(value) {
    function freeze_(entry) {
      if (!entry || typeof entry !== "object" || Object.isFrozen(entry)) return entry;
      Object.keys(entry).forEach(function (key) { freeze_(entry[key]); });
      return Object.freeze(entry);
    }
    return freeze_(JSON.parse(JSON.stringify(value)));
  }
  function getMyAccess() {
    var snapshot = accessService.getEffectiveAccessSnapshot();
    if (snapshot.bootstrap === true) {
      throw error_();
    }
    return immutable_({
      identity: { email: snapshot.email },
      roles: snapshot.roles.slice(),
      state: snapshot.assignments.length ? "AUTHORIZED" : "NO_ACCESS",
      message: snapshot.assignments.length ? "" :
        "Aucun accès n’est actuellement attribué à votre compte.",
      assignments: snapshot.assignments.map(function (entry) {
        return {
          module: entry.module, capabilities: entry.capabilities.slice(),
          season: entry.season, section: entry.section, courseCode: entry.courseCode,
          validFrom: entry.validFrom, validUntil: entry.validUntil
        };
      })
    });
  }
  return Object.freeze({ getMyAccess: getMyAccess });
}

AKS.Core.AccessMyAccess = Object.freeze({ create: AKS_createAccessMyAccessService_ });
