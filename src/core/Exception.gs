var AKS = AKS || {};
AKS.Core = AKS.Core || {};

/**
 * Exception standard d'AKS Platform.
 *
 * @param {string} code Code fonctionnel ou technique.
 * @param {string} message Description de l'erreur.
 * @param {*} details Informations complémentaires.
 * @constructor
 */
AKS.Core.Exception = function (code, message, details) {
  this.name = "AKSException";
  this.code = code || "UNEXPECTED_ERROR";
  this.message = message || "An unexpected error occurred.";
  this.details = typeof details === "undefined" ? null : details;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, AKS.Core.Exception);
  }
};

AKS.Core.Exception.prototype = Object.create(Error.prototype);
AKS.Core.Exception.prototype.constructor = AKS.Core.Exception;