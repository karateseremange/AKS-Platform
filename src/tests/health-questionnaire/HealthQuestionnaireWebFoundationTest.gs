function test_HQ0052Sprint1_flowIsExplicitAndOrdered() {
  var fixture = createHQ0051Fixture_();
  fixture.repository.saveQuestionnaire(createHQ0051Questionnaire_());
  fixture.repository.saveCampaign(createHQ0051Campaign_("OPEN"));
  fixture.settings.setActiveCampaignId("CAMPAIGN-WEB-1");

  var result = fixture.controller.getPublicViewModel();

  assertTrue_(result.ok);
  assertEquals_(4, result.data.flow.length);
  assertEquals_("identity", result.data.flow[0].id);
  assertEquals_("questions", result.data.flow[1].id);
}

function test_HQ0052Sprint1_stepCountIsDerivedFromFlow() {
  var fixture = createHQ0051Fixture_();
  fixture.repository.saveQuestionnaire(createHQ0051Questionnaire_());
  fixture.repository.saveCampaign(createHQ0051Campaign_("OPEN"));
  fixture.settings.setActiveCampaignId("CAMPAIGN-WEB-1");

  var result = fixture.controller.getPublicViewModel();

  assertEquals_(result.data.flow.length, result.data.steps.total);
  assertEquals_(1, result.data.steps.current);
}

function test_HQ0052Sprint1_flowContainsPresentationDataOnly() {
  var fixture = createHQ0051Fixture_();
  fixture.repository.saveQuestionnaire(createHQ0051Questionnaire_());
  fixture.repository.saveCampaign(createHQ0051Campaign_("OPEN"));
  fixture.settings.setActiveCampaignId("CAMPAIGN-WEB-1");

  var result = fixture.controller.getPublicViewModel();
  var serialized = JSON.stringify(result.data.flow);

  assertTrue_(serialized.indexOf("CAMPAIGN-WEB-1") === -1);
  assertTrue_(serialized.indexOf("QUESTIONNAIRE-WEB-1") === -1);
}
