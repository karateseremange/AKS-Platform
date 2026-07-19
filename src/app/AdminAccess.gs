var AKS = AKS || {};
AKS.Admin = AKS.Admin || {};

/**
 * Server-side authorization rules for the AKS administration.
 *
 * Authentication is delegated to Google. This component only decides whether
 * the authenticated address is allowed to access administrative functions.
 */
AKS.Admin.Access = (function () {
  function normalizeEmail_(email) {
    return String(email || "").trim().toLowerCase();
  }

  function getConfiguredEmails_() {
    if (
      typeof CONFIG === "undefined" ||
      !CONFIG ||
      !CONFIG.ADMIN ||
      !Array.isArray(CONFIG.ADMIN.AUTHORIZED_EMAILS) ||
      CONFIG.ADMIN.AUTHORIZED_EMAILS.length === 0
    ) {
      return [];
    }

    return CONFIG.ADMIN.AUTHORIZED_EMAILS
      .map(normalizeEmail_)
      .filter(function (email) {
        return email.length > 0;
      });
  }

  function isAuthorizedEmail(email, authorizedEmails) {
    var normalizedEmail = normalizeEmail_(email);
    var configuredEmails = arguments.length > 1
      ? (Array.isArray(authorizedEmails) ? authorizedEmails : [])
          .map(normalizeEmail_)
          .filter(function (configuredEmail) {
            return configuredEmail.length > 0;
          })
      : getConfiguredEmails_();

    return normalizedEmail.length > 0 &&
      configuredEmails.indexOf(normalizedEmail) !== -1;
  }

  function getCurrentUserEmail() {
    return normalizeEmail_(Session.getActiveUser().getEmail());
  }

  function assertAuthorized(email, authorizedEmails) {
    var normalizedEmail = normalizeEmail_(email);
    var authorized = arguments.length > 1
      ? isAuthorizedEmail(normalizedEmail, authorizedEmails)
      : isAuthorizedEmail(normalizedEmail);

    if (!authorized) {
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
