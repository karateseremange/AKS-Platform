/**
 * Public Web App entry point for the health questionnaire and routed
 * administrative Dashboard.
 *
 * The public deployment continues to render the questionnaire by default.
 * The administrative deployment uses the query parameter `app=admin` and
 * applies server-side Google account authorization before rendering data.
 *
 * @param {Object=} event
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet(event) {
  event = event || {};

  if (event.parameter && event.parameter.app === "admin") {
    return AKS.Admin.Dashboard.render();
  }

  if (event.parameter && event.parameter.app === "config") {
    return AKS.Admin.Configuration.render();
  }

  if (event.parameter && event.parameter.app === "logs") {
    return AKS.Admin.Logs.render(event.parameter);
  }

  if (event.parameter && event.parameter.app === "analytics") {
    return AKS.Admin.Analytics.render(event.parameter);
  }

  if (event.parameter && event.parameter.app === "access") {
    return AKS.Admin.AccessAccounts.render(event.parameter);
  }

  if (event.parameter && event.parameter.app === "my-access") {
    return AKS.App.MyAccess.render();
  }

  if (event.parameter && event.parameter.app === "attendance-recipe") {
    return AKS.Analytics.AttendanceRecipePage.render();
  }

  if (event.parameter && event.parameter.app === "attendance") {
    return AKS.Analytics.AttendancePage.render();
  }

  var installResult = AKS.Core.Application.install();

  if (!installResult.ok) {
    return AKS_renderHealthQuestionnaireWebError_(
      "APPLICATION_UNAVAILABLE",
      "Le questionnaire santé est temporairement indisponible."
    );
  }

  var controller = AKS.Core.Container.resolve(
    "healthQuestionnaire.webController"
  );
  var viewResult = controller.getPublicViewModel(event);

  if (!viewResult.ok) {
    return AKS_renderHealthQuestionnaireWebError_(
      viewResult.error.code,
      viewResult.error.message
    );
  }

  return AKS_evaluateHealthQuestionnaireWebTemplate_(viewResult.data);
}

/**
 * Signed server-to-server endpoint used by the WordPress connector.
 * Authentication is performed before any business payload is parsed.
 *
 * @param {Object=} event
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function doPost(event) {
  var response = AKS_handleHealthQuestionnaireApiRequest_(event || {});

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Evaluates the public shell with the supplied presentation model.
 *
 * @param {Object} viewModel
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function AKS_evaluateHealthQuestionnaireWebTemplate_(viewModel) {
  var template = HtmlService.createTemplateFromFile(
    "modules/health-questionnaire/web/HealthQuestionnaireWebView"
  );
  template.viewModel = viewModel;

  return template
    .evaluate()
    .setTitle("Questionnaire santé — Association Karaté Serémange")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/**
 * Renders a dynamic HTML partial with the current view model.
 *
 * @param {string} path
 * @param {Object} viewModel
 * @returns {string}
 */
function AKS_renderHealthQuestionnaireWebPartial_(path, viewModel) {
  var template = HtmlService.createTemplateFromFile(path);
  template.viewModel = viewModel;
  return template.evaluate().getContent();
}

/**
 * Includes a static HTML, CSS or JavaScript fragment.
 *
 * @param {string} path
 * @returns {string}
 */
function AKS_includeHealthQuestionnaireWebFile_(path) {
  return HtmlService.createHtmlOutputFromFile(path).getContent();
}

/**
 * Renders a public error page without exposing technical details.
 *
 * @param {string} code
 * @param {string} message
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function AKS_renderHealthQuestionnaireWebError_(code, message) {
  return AKS_evaluateHealthQuestionnaireWebTemplate_({
    available: false,
    errorCode: code || "UNEXPECTED_ERROR",
    errorMessage: message ||
      "Le questionnaire santé est temporairement indisponible.",
    brand: {
      clubName: "Association Karaté Serémange",
      primaryColor: "#2a4b9b"
    }
  });
}

/**
 * Prepares the declaration step from transient questionnaire answers.
 * Detailed answers are never returned or persisted.
 *
 * @param {Object<string,string>} answers
 * @returns {Object}
 */
function AKS_prepareHealthQuestionnaireDeclaration(answers) {
  var installResult = AKS.Core.Application.install();

  if (!installResult.ok) {
    return AKS.Core.Result.failure(
      "APPLICATION_UNAVAILABLE",
      "Le questionnaire santé est temporairement indisponible."
    );
  }

  return AKS.Core.Container
    .resolve("healthQuestionnaire.webController")
    .prepareDeclaration(answers || {});
}

/**
 * Persists the administrative outcome of the public questionnaire.
 * The request id makes repeated client calls idempotent.
 *
 * @param {Object} payload
 * @returns {Object}
 */
function AKS_submitPublicHealthQuestionnaire(payload) {
  var data = payload || {};
  var requestId = String(data.requestId || "").trim();
  var lock = LockService.getScriptLock();
  var cache = CacheService.getScriptCache();
  var propertyKey;
  var cached;
  var installResult;
  var result;

  if (!requestId) {
    return AKS.Core.Result.failure(
      "HEALTH_SUBMISSION_REQUEST_ID_REQUIRED",
      "La requête de transmission est invalide."
    );
  }

  propertyKey = "HQ_SUBMISSION_REQUEST_" + requestId;
  lock.waitLock(30000);

  try {
    cached = cache.get(propertyKey);
    if (cached) {
      return JSON.parse(cached);
    }

    installResult = AKS.Core.Application.install();
    if (!installResult.ok) {
      return AKS.Core.Result.failure(
        "APPLICATION_UNAVAILABLE",
        "Le questionnaire santé est temporairement indisponible."
      );
    }

    result = AKS.Core.Container
      .resolve("healthQuestionnaire.webController")
      .submitQuestionnaire(data);

    if (result.ok) {
      cache.put(propertyKey, JSON.stringify(result), 600);
    }

    return result;
  } finally {
    lock.releaseLock();
  }
}
