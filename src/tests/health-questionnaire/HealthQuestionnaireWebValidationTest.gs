function test_HQ0052Sprint2_viewModelExposesUxPresentationData() {
  var fixture = createHQ0051Fixture_();
  fixture.repository.saveQuestionnaire(createHQ0051Questionnaire_());
  fixture.repository.saveCampaign(createHQ0051Campaign_("OPEN"));
  fixture.settings.setActiveCampaignId("CAMPAIGN-WEB-1");

  var result = fixture.controller.getPublicViewModel();

  assertTrue_(result.ok);
  assertEquals_("Questionnaire officiel", result.data.presentation.officialLabel);
  assertEquals_("2 minutes", result.data.presentation.estimatedDuration);
  assertTrue_(
    result.data.presentation.confidentialityMessage.indexOf("ni conservées") >= 0
  );
}

function test_HQ0052Sprint2_identityValidationAcceptsValidMinor() {
  var fixture = createHQ0051Fixture_();
  var result = fixture.controller.validateIdentity(
    createHQ0052ValidIdentity_(),
    new Date(2026, 6, 11)
  );

  assertTrue_(result.ok);
  assertEquals_(12, result.data.age);
  assertEquals_("parent@example.fr", result.data.email);
}

function test_HQ0052Sprint2_identityValidationRejectsInvalidEmail() {
  var fixture = createHQ0051Fixture_();
  var identity = createHQ0052ValidIdentity_();
  identity.email = "adresse-invalide";

  var result = fixture.controller.validateIdentity(
    identity,
    new Date(2026, 6, 11)
  );

  assertTrue_(!result.ok);
  assertEquals_("HEALTH_IDENTITY_INVALID", result.error.code);
  assertTrue_(!!result.error.details.email);
}

function test_HQ0052Sprint2_identityValidationRejectsAdult() {
  var fixture = createHQ0051Fixture_();
  var identity = createHQ0052ValidIdentity_();
  identity.birthDate = "2000-07-10";

  var result = fixture.controller.validateIdentity(
    identity,
    new Date(2026, 6, 11)
  );

  assertTrue_(!result.ok);
  assertTrue_(
    result.error.details.birthDate.indexOf("mineurs") >= 0
  );
}

function test_HQ0052Sprint2_identityValidationRejectsMissingSex() {
  var fixture = createHQ0051Fixture_();
  var identity = createHQ0052ValidIdentity_();
  identity.sex = "";

  var result = fixture.controller.validateIdentity(
    identity,
    new Date(2026, 6, 11)
  );

  assertTrue_(!result.ok);
  assertTrue_(!!result.error.details.sex);
}

function createHQ0052ValidIdentity_() {
  return {
    email: "parent@example.fr",
    lastName: "DUPONT",
    firstName: "Camille",
    birthDate: "2014-07-10",
    sex: "FEMALE",
    legalRepresentativeLastName: "DUPONT",
    legalRepresentativeFirstName: "Alex"
  };
}
