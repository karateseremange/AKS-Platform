function AKS_testLogger_exposesStablePublicApi() {
  assertTrue_(typeof AKS.Logger === "object", "AKS.Logger must exist.");
  assertTrue_(typeof AKS.Logger.info === "function", "AKS.Logger.info must exist.");
  assertTrue_(typeof AKS.Logger.warn === "function", "AKS.Logger.warn must exist.");
  assertTrue_(typeof AKS.Logger.error === "function", "AKS.Logger.error must exist.");
  assertTrue_(Object.isFrozen(AKS.Logger), "AKS.Logger public API must be immutable.");
}

function AKS_testLogger_acceptsCallsWithoutContext() {
  var api = AKS_createLoggerApi_(function () {});

  api.info("Information");
  api.warn("Warning");
  api.error("Error");
}

function AKS_testLogger_acceptsOptionalContext() {
  var api = AKS_createLoggerApi_(function () {});
  var context = {
    module: "LOGGER-001",
    requestId: "request-001",
    user: "admin@example.com"
  };

  api.info("Information", context);
  api.warn("Warning", context);
  api.error("Error", context);
}

function AKS_testLogger_delegatesToInternalProvider() {
  var events = [];
  var context = { module: "LOGGER-001" };
  var api = AKS_createLoggerApi_(function (level, message, receivedContext) {
    events.push({
      level: level,
      message: message,
      context: receivedContext
    });
  });

  api.info("Information", context);
  api.warn("Warning", context);
  api.error("Error", context);

  assertEquals_(3, events.length);
  assertEquals_("INFO", events[0].level);
  assertEquals_("WARN", events[1].level);
  assertEquals_("ERROR", events[2].level);
  assertEquals_(context, events[0].context);
  assertEquals_(context, events[1].context);
  assertEquals_(context, events[2].context);
}
