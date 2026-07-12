function test_HQ006_generatesOnlyForEligibleSubmission() {
  var fixture = createHQ006Fixture_();
  var updated = fixture.service.generateForSubmission(
    createHQ006Submission_("NO_MEDICAL_CERTIFICATE_REQUIRED")
  );

  assertEquals_("PDF_GENERATED", updated.status);
  assertEquals_("drive-file-1", updated.attestationFileId);
  assertEquals_("https://drive.example/file-1", updated.attestationFileUrl);
}

function test_HQ006_rejectsMedicalCertificateResult() {
  var fixture = createHQ006Fixture_();

  assertThrows_(function () {
    fixture.service.generateForSubmission(
      createHQ006Submission_("MEDICAL_CERTIFICATE_REQUIRED")
    );
  }, "HEALTH_ATTESTATION_NOT_ALLOWED");
}

function test_HQ006_qrContainsOpaqueReferenceOnly() {
  var fixture = createHQ006Fixture_();
  fixture.service.generateForSubmission(
    createHQ006Submission_("NO_MEDICAL_CERTIFICATE_REQUIRED")
  );

  assertEquals_("AKS-QS|1|QS-2026-000001", fixture.generated.qrPayload);
  assertTrue_(fixture.generated.qrPayload.indexOf("DUPONT") === -1);
  assertTrue_(fixture.generated.qrPayload.indexOf("NO_MEDICAL") === -1);
}

function test_HQ006_prefillsNamesAndKeepsAnswersOutsideGenerator() {
  var fixture = createHQ006Fixture_();
  fixture.service.generateForSubmission(
    createHQ006Submission_("NO_MEDICAL_CERTIFICATE_REQUIRED")
  );

  assertEquals_("Marie DUPONT", fixture.generated.viewModel.legalRepresentativeName);
  assertEquals_("Alice DUPONT", fixture.generated.viewModel.minorName);
  assertEquals_(
    "https://qr.example/test.png",
    fixture.generated.viewModel.qrCodeUrl
  );
  assertTrue_(!Object.prototype.hasOwnProperty.call(
    fixture.generated.viewModel,
    "answers"
  ));
}

function createHQ006Fixture_() {
  var repository =
    AKS.Modules.HealthQuestionnaire.HealthQuestionnaireInMemoryRepository();
  var generated = {};
  var generator = AKS.Modules.HealthQuestionnaire
    .HealthQuestionnaireAttestationGenerator({
      qrProvider: function (payload) {
        generated.qrPayload = payload;
        return "https://qr.example/test.png";
      },
      pdfRenderer: function (viewModel) {
        generated.viewModel = viewModel;
        return { fakeBlob: true };
      },
      fileStore: function () {
        return {
          fileId: "drive-file-1",
          fileUrl: "https://drive.example/file-1"
        };
      }
    });

  return {
    repository: repository,
    generated: generated,
    service: AKS.Modules.HealthQuestionnaire
      .HealthQuestionnaireAttestationService(repository, generator)
  };
}

function createHQ006Submission_(result) {
  return AKS.Modules.HealthQuestionnaire.Submission({
    id: "QS-2026-000001",
    campaignId: "CAMPAIGN-WEB-1",
    questionnaireId: "QUESTIONNAIRE-WEB-1",
    questionnaireVersion: "1.0.0",
    email: "parent@example.org",
    lastName: "DUPONT",
    firstName: "Alice",
    birthDate: "2014-05-12",
    sex: "FEMALE",
    legalRepresentativeLastName: "DUPONT",
    legalRepresentativeFirstName: "Marie",
    result: result,
    status: "CREATED",
    processingVersion: "hq-006",
    submittedAt: new Date("2026-07-12T10:00:00Z")
  });
}
