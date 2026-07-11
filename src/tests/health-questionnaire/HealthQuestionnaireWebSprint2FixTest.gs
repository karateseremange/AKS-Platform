function test_HQ0052Sprint2Fix_campaignNameIsNotDuplicatedBySeason() {
  var template = HtmlService.createTemplateFromFile(
    "modules/health-questionnaire/web/partials/Header"
  );
  template.viewModel = {
    campaign: { name: "Campagne santé 2026-2027", season: "2026-2027" },
    presentation: { estimatedDuration: "2 minutes" },
    questionnaire: { source: "Annexe II-23" },
    flow: [
      { label: "Identité" },
      { label: "Questionnaire santé" }
    ],
    steps: { total: 2 }
  };

  var html = template.evaluate().getContent();
  assertTrue_(html.indexOf("Campagne santé 2026-2027 — 2026-2027") === -1);
  assertTrue_(html.indexOf("Campagne santé 2026-2027") >= 0);
}

function test_HQ0052Sprint2Fix_clientContainsDeferredInitialization() {
  var source = HtmlService.createHtmlOutputFromFile(
    "modules/health-questionnaire/web/HealthQuestionnaireClient.js"
  ).getContent();

  assertTrue_(source.indexOf("DOMContentLoaded") >= 0);
  assertTrue_(source.indexOf("initHealthQuestionnaire") >= 0);
}

function test_HQ0052Sprint2Fix_clientContainsExplicitFieldFeedback() {
  var source = HtmlService.createHtmlOutputFromFile(
    "modules/health-questionnaire/web/HealthQuestionnaireClient.js"
  ).getContent();

  assertTrue_(source.indexOf("Veuillez renseigner le nom du mineur") >= 0);
  assertTrue_(source.indexOf("identityNext.disabled = !valid") >= 0);
}
