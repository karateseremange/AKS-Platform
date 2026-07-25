function AKS_runUx001Tests() {
  return AKS_runNamedTestSuite_("UX-001", [
    { name: "UX-001 / shared administration foundation", test: AKS_testUx001AdminViewsUseSharedFoundation_ },
    { name: "UX-001 / visible keyboard focus", test: AKS_testUx001ProvidesVisibleKeyboardFocus_ },
    { name: "UX-001 / accessible action targets", test: AKS_testUx001ProvidesAccessibleActionTargets_ },
    { name: "UX-001 / explicit disabled state", test: AKS_testUx001ProvidesExplicitDisabledState_ },
    { name: "UX-001 / reduced motion preference", test: AKS_testUx001RespectsReducedMotionPreference_ },
    { name: "UX-001 / duplicate configuration actions", test: AKS_testUx001ConfigurationPreventsDuplicateActions_ },
    { name: "UX-001 / pending configuration feedback", test: AKS_testUx001ConfigurationAnnouncesPendingAction_ },
    { name: "UX-001 / configuration failure recovery", test: AKS_testUx001ConfigurationRecoversAfterFailure_ },
    { name: "UX-001 / controlled configuration error", test: AKS_testUx001ConfigurationHidesTechnicalFailureDetails_ },
    { name: "UX-001 / filtered log result model", test: AKS_testUx001LogModelDescribesFilteredResults_ },
    { name: "UX-001 / announced log result count", test: AKS_testUx001LogViewAnnouncesResultCount_ },
    { name: "UX-001 / filtered empty log recovery", test: AKS_testUx001FilteredEmptyLogViewOffersReset_ },
    { name: "UX-001 / readable log metadata model", test: AKS_testUx001LogModelPresentsReadableEventMetadata_ },
    { name: "UX-001 / readable log event view", test: AKS_testUx001LogViewUsesReadableEventMetadata_ },
    { name: "UX-001 / readable dashboard event view", test: AKS_testUx001DashboardUsesReadableEventMetadata_ }
  ]);
}
