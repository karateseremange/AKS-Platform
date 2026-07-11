function test_HQ0052_S42_flowIncludesDeclarationStep() {
  var fixture = createHQ0051Fixture_();
  fixture.repository.saveQuestionnaire(createHQ0051Questionnaire_());
  fixture.repository.saveCampaign(createHQ0051Campaign_("OPEN"));
  fixture.settings.setActiveCampaignId("CAMPAIGN-WEB-1");

  var result = fixture.controller.getPublicViewModel();

  assertTrue_(result.ok);
  assertEquals_(4, result.data.flow.length);
  assertEquals_("declaration", result.data.flow[2].id);
  assertEquals_("Déclaration", result.data.flow[2].label);
}

function test_HQ0052_S42_prepareDeclarationAllNo() {
  var fixture = createHQ0052S42Fixture_();
  var result = fixture.controller.prepareDeclaration({ Q1: "NO", Q2: "NO" });

  assertTrue_(result.ok);
  assertEquals_("NO_MEDICAL_CERTIFICATE_REQUIRED", result.data.result);
  assertEquals_(undefined, result.data.answers);
}

function test_HQ0052_S42_prepareDeclarationWithYes() {
  var fixture = createHQ0052S42Fixture_();
  var result = fixture.controller.prepareDeclaration({ Q1: "YES", Q2: "NO" });

  assertTrue_(result.ok);
  assertEquals_("MEDICAL_CERTIFICATE_REQUIRED", result.data.result);
  assertEquals_(undefined, result.data.positiveAnswerCount);
}

function test_HQ0052_S42_prepareDeclarationRejectsMissingAnswer() {
  var fixture = createHQ0052S42Fixture_();
  var result = fixture.controller.prepareDeclaration({ Q1: "NO" });

  assertTrue_(!result.ok);
  assertEquals_("HEALTH_ANSWERS_INCOMPLETE", result.error.code);
}

function test_HQ0052_S42_validateDeclarationRequiresConsent() {
  var fixture = createHQ0051Fixture_();
  var result = fixture.controller.validateDeclaration({
    legalRepresentativeName: "Marie Dupont",
    accepted: false
  });

  assertTrue_(!result.ok);
  assertEquals_("HEALTH_DECLARATION_INVALID", result.error.code);
}

function test_HQ0052_S42_validateDeclarationAcceptsValidData() {
  var fixture = createHQ0051Fixture_();
  var result = fixture.controller.validateDeclaration({
    legalRepresentativeName: "Marie Dupont",
    accepted: true
  });

  assertTrue_(result.ok);
  assertEquals_("Marie Dupont", result.data.legalRepresentativeName);
  assertTrue_(result.data.accepted);
}

function createHQ0052S42Fixture_() {
  var fixture = createHQ0051Fixture_();
  fixture.repository.saveQuestionnaire(createHQ0051Questionnaire_());
  fixture.repository.saveCampaign(createHQ0051Campaign_("OPEN"));
  fixture.settings.setActiveCampaignId("CAMPAIGN-WEB-1");
  return fixture;
}
