function test_HQ0052_S41_allNoAllowsAttestation() {
  var decision = evaluateHQ0052Decision_(["NO", "NO", "NO"]);

  assertEquals_(
    "NO_MEDICAL_CERTIFICATE_REQUIRED",
    decision.result
  );
  assertEquals_(0, decision.positiveAnswerCount);
}

function test_HQ0052_S41_oneYesRequiresCertificate() {
  var decision = evaluateHQ0052Decision_(["NO", "YES", "NO"]);

  assertEquals_("MEDICAL_CERTIFICATE_REQUIRED", decision.result);
  assertEquals_(1, decision.positiveAnswerCount);
}

function test_HQ0052_S41_countsAllPositiveAnswers() {
  var answers = [];
  var index;

  for (index = 0; 24 > index; index += 1) {
    answers.push("YES");
  }

  var decision = evaluateHQ0052Decision_(answers);

  assertEquals_("MEDICAL_CERTIFICATE_REQUIRED", decision.result);
  assertEquals_(24, decision.positiveAnswerCount);
}

function test_HQ0052_S41_acceptsQuestionAnswerMap() {
  var decision = evaluateHQ0052Decision_({
    Q1: "NO",
    Q2: "YES",
    Q3: "YES"
  });

  assertEquals_("MEDICAL_CERTIFICATE_REQUIRED", decision.result);
  assertEquals_(2, decision.positiveAnswerCount);
}

function test_HQ0052_S41_rejectsMissingAnswers() {
  assertThrows_(
    function () {
      evaluateHQ0052Decision_(null);
    },
    "HEALTH_DECISION_ANSWERS_REQUIRED"
  );
}

function test_HQ0052_S41_rejectsInvalidAnswer() {
  assertThrows_(
    function () {
      evaluateHQ0052Decision_(["NO", "MAYBE"]);
    },
    "HEALTH_DECISION_ANSWER_INVALID"
  );
}

function test_HQ0052_S41_resultContainsNoDetailedAnswers() {
  var decision = evaluateHQ0052Decision_({ Q1: "YES", Q2: "NO" });

  assertEquals_(undefined, decision.answers);
  assertEquals_(undefined, decision.positiveQuestionIds);
  assertEquals_(true, Object.isFrozen(decision));
}

function evaluateHQ0052Decision_(answers) {
  return AKS.Modules.HealthQuestionnaire.Services
    .HealthQuestionnaireDecisionEngine.evaluate(answers);
}
