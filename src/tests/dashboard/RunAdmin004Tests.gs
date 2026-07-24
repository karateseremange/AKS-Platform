function AKS_runAdmin004Tests() {
  return AKS_runNamedTestSuite_("ADMIN-004", [
    { name: "Contrats publics", test: AKS_testAdmin004PublicContractsExist_ },
    { name: "Enregistrement valide", test: AKS_testAdmin004RegistersValidProvider_ },
    { name: "Doublon refusé", test: AKS_testAdmin004RejectsDuplicateProvider_ },
    { name: "Version incompatible", test: AKS_testAdmin004RejectsUnsupportedContract_ },
    { name: "Fournisseur désactivé", test: AKS_testAdmin004ExcludesDisabledProvider_ },
    { name: "Contenu exécutable refusé", test: AKS_testAdmin004RejectsExecutableWidgetContent_ },
    { name: "État vide", test: AKS_testAdmin004AcceptsEmptyWidget_ },
    { name: "État indisponible", test: AKS_testAdmin004AcceptsUnavailableWidget_ },
    { name: "Erreur isolée", test: AKS_testAdmin004IsolatesProviderFailure_ },
    { name: "Ordre stable", test: AKS_testAdmin004SortsWidgetsStably_ }
  ]);
}
