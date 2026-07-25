var AKS = AKS || {};

/**
 * Builds the public configuration API.
 *
 * The factory remains internal so validation scenarios can be tested without
 * exposing or mutating the embedded CONFIG object.
 *
 * @param {Function} configProvider
 * @returns {Object}
 */
function AKS_createConfigApi_(configProvider) {
  function configurationError_(message) {
    var error = new Error(message);
    error.code = "CONFIG001_INVALID_ADMIN_CONFIGURATION";
    return error;
  }

  function normalizeEmail_(email) {
    return String(email || "").trim().toLowerCase();
  }

  function isValidEmail_(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function getAuthorizedAdminEmails() {
    var config = typeof configProvider === "function" ? configProvider() : null;
    var rawEmails = config && config.ADMIN
      ? config.ADMIN.AUTHORIZED_ADMIN_EMAILS
      : null;

    if (!Array.isArray(rawEmails) || rawEmails.length === 0) {
      throw configurationError_(
        "La configuration des administrateurs autorisés est absente ou vide."
      );
    }

    var normalizedEmails = [];
    var seenEmails = {};

    rawEmails.forEach(function (rawEmail) {
      if (typeof rawEmail !== "string") {
        throw configurationError_(
          "Chaque administrateur autorisé doit être défini par une adresse e-mail."
        );
      }

      var normalizedEmail = normalizeEmail_(rawEmail);

      if (!normalizedEmail || !isValidEmail_(normalizedEmail)) {
        throw configurationError_(
          "Une adresse e-mail administrateur est vide ou invalide."
        );
      }

      if (seenEmails[normalizedEmail]) {
        throw configurationError_(
          "La configuration contient une adresse e-mail administrateur en double."
        );
      }

      seenEmails[normalizedEmail] = true;
      normalizedEmails.push(normalizedEmail);
    });

    return Object.freeze(normalizedEmails.slice());
  }

  return Object.freeze({
    getAuthorizedAdminEmails: getAuthorizedAdminEmails
  });
}

AKS.Config = AKS_createConfigApi_(function () {
  return typeof CONFIG === "undefined" ? null : CONFIG;
});
