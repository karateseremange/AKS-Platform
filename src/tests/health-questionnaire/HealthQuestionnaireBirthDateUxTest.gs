function test_HQ008_acceptsValidLeapDayForMinor() {
  var fixture = createHQ0051Fixture_();
  var identity = createHQ0052ValidIdentity_();
  identity.birthDate = "2012-02-29";

  var result = fixture.controller.validateIdentity(
    identity,
    new Date(2026, 6, 13)
  );

  assertTrue_(result.ok);
  assertEquals_(14, result.data.age);
}

function test_HQ008_rejectsImpossibleCalendarDate() {
  var fixture = createHQ0051Fixture_();
  var identity = createHQ0052ValidIdentity_();
  identity.birthDate = "2014-02-31";

  var result = fixture.controller.validateIdentity(
    identity,
    new Date(2026, 6, 13)
  );

  assertTrue_(!result.ok);
  assertTrue_(!!result.error.details.birthDate);
}

function test_HQ008_keepsIsoDateContract() {
  var fixture = createHQ0051Fixture_();
  var identity = createHQ0052ValidIdentity_();
  identity.birthDate = "2014-07-13";

  var result = fixture.controller.validateIdentity(
    identity,
    new Date(2026, 6, 13)
  );

  assertTrue_(result.ok);
  assertEquals_(12, result.data.age);
  assertEquals_("2014-07-13", result.data.birthDate);
}
