function AKS_runAdmin002Tests() {
  return AKS_runNamedTestSuite_("ADMIN-002", [
    { name: "Ordre des familles", test: AKS_testAdmin002KeepsStableFamilyOrder_ },
    { name: "Destination indisponible", test: AKS_testAdmin002HidesUnavailableDestinations_ },
    { name: "Destination non autorisée", test: AKS_testAdmin002HidesUnauthorizedDestinations_ },
    { name: "Cible non sûre", test: AKS_testAdmin002RejectsUnsafeTargets_ },
    { name: "Lien externe identifié", test: AKS_testAdmin002IdentifiesExternalLinks_ },
    { name: "Retour au Centre de pilotage", test: AKS_testAdmin002ExposesDashboardReturn_ },
    { name: "Modules actifs uniquement", test: AKS_testAdmin002PublishesOnlyActiveModules_ },
    { name: "Modèle immuable", test: AKS_testAdmin002CreatesImmutableDefensiveModel_ }
  ]);
}
