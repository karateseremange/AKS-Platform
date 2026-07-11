function AKS_upgradeHQ0052Sprint31() {
  var installResult = AKS_install();

  if (!installResult || !installResult.ok) {
    throw new Error(
      installResult && installResult.error && installResult.error.message
        ? installResult.error.message
        : "Impossible d'installer AKS Platform avant la mise à niveau réglementaire."
    );
  }

  var repository = AKS.Core.Container.resolve(
    "healthQuestionnaire.repository"
  );
  var questionnaire =
    AKS.Modules.HealthQuestionnaire.Definition();

  repository.saveQuestionnaire(questionnaire);

  return {
    questionnaireId: questionnaire.id,
    version: questionnaire.version,
    questionCount: questionnaire.questions.length
  };
}
