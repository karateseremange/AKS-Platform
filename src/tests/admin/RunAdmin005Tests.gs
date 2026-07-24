/**
 * Executes the ADMIN-005 acceptance and compliance tests.
 *
 * @returns {{suite: string, total: number, passed: number, failed: number}}
 */
function AKS_runAdmin005Tests() {
  return AKS_runNamedTestSuite_("ADMIN-005", [
    { name: "authorized access", test: AKS_testAdmin005AcceptsAuthorizedAccess_ },
    { name: "unauthorized access", test: AKS_testAdmin005RejectsUnauthorizedAccess_ },
    { name: "zero providers", test: AKS_testAdmin005SupportsZeroProviders_ },
    { name: "multiple providers and widgets", test: AKS_testAdmin005SupportsMultipleProvidersAndWidgets_ },
    { name: "server-side authorization", test: AKS_testAdmin005FiltersUnauthorizedDataServerSide_ },
    { name: "failure isolation and safe logging", test: AKS_testAdmin005IsolatesAndLogsProviderFailure_ },
    { name: "invalid contract", test: AKS_testAdmin005RejectsInvalidContractWithoutGlobalFailure_ },
    { name: "no fictitious destination", test: AKS_testAdmin005ExposesNoFictitiousDestination_ }
  ]);
}
