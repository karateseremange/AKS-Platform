var AKS = AKS || {};
AKS.Core = AKS.Core || {};

function AKS_createCoreLoggerApi_(structuredLogger) {
  function write(level, message, context) {
    if (structuredLogger && typeof structuredLogger.emit === "function") {
      return structuredLogger.emit({
        level: level,
        category: "technical",
        source: "AKS.Core",
        module: context && context.module ? context.module : "core",
        eventType: context && context.eventType
          ? context.eventType
          : "core.message",
        message: message,
        correlationId: context && (
          context.correlationId || context.requestId
        ),
        context: context || {}
      });
    }
    var entry = {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      context: context || null
    };

    console.log(JSON.stringify(entry));

    return entry;
  }

  return Object.freeze({
    debug: function (message, context) {
      return write("DEBUG", message, context);
    },

    info: function (message, context) {
      return write("INFO", message, context);
    },

    warn: function (message, context) {
      return write("WARN", message, context);
    },

    error: function (message, error) {
      var errorContext = {
        name: error && error.name ? error.name : null,
        message: error && error.message
          ? error.message
          : String(error || ""),
        stack: error && error.stack ? error.stack : null
      };
      return write("ERROR", message, errorContext);
    }
  });
}

AKS.Core.Logger = AKS_createCoreLoggerApi_({
  emit: function (event) {
    if (AKS.Logger && typeof AKS.Logger.emit === "function") {
      return AKS.Logger.emit(event);
    }
    return null;
  }
});
