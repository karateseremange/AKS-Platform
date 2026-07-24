function AKS_runAdmin003Tests() {
  return AKS_runNamedTestSuite_("ADMIN-003", [
    { name: "quatre zones", test: AKS_testAdmin003ExposesFourZones_ },
    { name: "composition par zone", test: AKS_testAdmin003GroupsWidgetsByZone_ },
    { name: "états normalisés", test: AKS_testAdmin003PreservesNormalizedStates_ },
    { name: "absence d'état global", test: AKS_testAdmin003DoesNotDeriveGlobalHealth_ },
    { name: "fraîcheur", test: AKS_testAdmin003PreservesFreshness_ },
    { name: "copies défensives", test: AKS_testAdmin003CreatesDefensiveZoneCopies_ },
    { name: "API sans santé globale", test: AKS_testAdmin003DashboardHasNoGlobalHealth_ },
    { name: "dégradation isolée", test: AKS_testAdmin003IsolatesUnavailableCard_ }
  ]);
}
