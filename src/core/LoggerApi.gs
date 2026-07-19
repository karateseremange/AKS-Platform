var AKS = AKS || {};

/**
 * Builds the public logging API.
 *
 * The provider is intentionally internal. It may later target Apps Script
 * logging, Google Sheets, Cloud Logging or an external service without
 * changing the public AKS.Logger API.
 *
 * @param {Function} loggingProvider
 * @returns {Object}
 */
function AKS_createLoggerApi_(loggingProvider) {
  function emit_(level, message, context) {
    if (typeof loggingProvider === "function") {
      loggingProvider(level, message, context);
    }
  }

  function info(message, context) {
    emit_("INFO", message, context);
  }

  function warn(message, context) {
    emit_("WARN", message, context);
  }

  function error(message, context) {
    emit_("ERROR", message, context);
  }

  return Object.freeze({
    info: info,
    warn: warn,
    error: error
  });
}

AKS.Logger = AKS_createLoggerApi_(function (level, message) {
  Logger.log("[" + level + "] " + String(message));
});
