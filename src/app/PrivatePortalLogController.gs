/** D4: shells contain no events, secrets, endpoint or Google support IDs. */
function AKS_privatePortalLogShell_(access, view, baseUrl) {
  var status = "DENIED";
  try {
    AKS_authorizePrivatePortal_(access);
    status = "LOADING";
  } catch (ignoredRefusal) {}
  return Object.freeze({
    privateAsync: true, view: view, status: status,
    available: false, events: Object.freeze([]),
    navigation: Object.freeze({ homeTarget: baseUrl + "?app=admin",
      logsTarget: baseUrl + "?app=logs" })
  });
}

function AKS_renderPrivatePortalLogs_() {
  var model;
  try {
    if (!AKS_privatePortalIsRecipe_()) throw AKS_privatePortalFailure_();
    model = AKS_privatePortalLogShell_(AKS_createAccessService_(), "page",
      ScriptApp.getService().getUrl() || "");
  } catch (ignoredFailure) {
    model = AKS_privatePortalLogShell_(null, "page", "");
  }
  var template = HtmlService.createTemplateFromFile("ui/admin/PrivateLogs");
  template.privateLogsModel = model;
  return template.evaluate().setTitle("Journaux — AKS Platform")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function AKS_renderPrivatePortalLogContent_(model) {
  var template = HtmlService.createTemplateFromFile("ui/admin/PrivateLogsContent");
  template.privateLogsModel = model;
  return template.evaluate().getContent();
}

function AKS_handlePrivatePortalLogsRpc_(input, runtimeFactory) {
  if (!input || Object.prototype.toString.call(input) !== "[object Object]" ||
      ["widget", "page"].indexOf(input.view) === -1 ||
      Object.keys(input).some(function (key) {
        return ["view", "severity"].indexOf(key) === -1;
      }) || (input.view === "widget" && typeof input.severity !== "undefined") ||
      (typeof input.severity !== "undefined" &&
        ["DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"].indexOf(input.severity) === -1)) {
    return { status: "DENIED", available: false, events: [] };
  }
  try {
    var query = { limit: input.view === "widget" ? 5 : 20 };
    if (input.severity) query.severity = input.severity;
    return (runtimeFactory || AKS_createPrivatePortalRuntime_)().readRecent(query);
  } catch (ignoredFailure) {
    return { status: "UNAVAILABLE", available: false, events: [] };
  }
}

/** The only browser RPC. Dependencies and actor are never browser arguments. */
function AKS_readPrivatePortalLogs(input) {
  return AKS_handlePrivatePortalLogsRpc_(input);
}
