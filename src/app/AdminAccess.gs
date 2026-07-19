var AKS = AKS || {};
AKS.Admin = AKS.Admin || {};

/**
 * Server-side authorization rules for the AKS administration.
 *
 * Authentication is delegated to Google. This component only decides whether
 * the authenticated address is allowed to access administrative functions.
 */
AKS.Admin.Access = (function () {
  var AUTHORIZED_EMAILS = Object.freeze([
    "karate-seremange@gmail.com"
  ]);

  function normalizeEmail_(email) {
    return String(email || "").trim().toLowerCase();
  }

  function isAuthorizedEmail(email) {
    return AUTHORIZED_EMAILS.indexOf(normalizeEmail_(email)) !== -1;
  }

  function getCurrentUserEmail() {
    return normalizeEmail_(Session.getActiveUser().getEmail());
  }

  function assertAuthorized(email) {
    var normalizedEmail = normalizeEmail_(email);

    if (!normalizedEmail || !isAuthorizedEmail(normalizedEmail)) {
      var error = new Error("Accès à l’administration refusé.");
      error.code = "ADMIN001_ACCESS_DENIED";
      throw error;
    }

    return normalizedEmail;
  }

  function assertCurrentUserAuthorized() {
    return assertAuthorized(getCurrentUserEmail());
  }

  return Object.freeze({
    isAuthorizedEmail: isAuthorizedEmail,
    getCurrentUserEmail: getCurrentUserEmail,
    assertAuthorized: assertAuthorized,
    assertCurrentUserAuthorized: assertCurrentUserAuthorized
  });
})();
