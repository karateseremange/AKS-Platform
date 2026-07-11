var AKS = AKS || {};
AKS.Core = AKS.Core || {};

AKS.Core.Logger = (function () {
  function write(level, message, context) {
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
      return write("ERROR", message, {
        name: error && error.name ? error.name : null,
        message: error && error.message
          ? error.message
          : String(error || ""),
        stack: error && error.stack ? error.stack : null
      });
    }
  });
})();