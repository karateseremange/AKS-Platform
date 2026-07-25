var AKS = AKS || {};

function AKS_assertUx001_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function AKS_ux001FoundationSource_() {
  return AKS_includeAdminDashboardFile_("ui/admin/AdminFoundationStyle");
}

function AKS_testUx001AdminViewsUseSharedFoundation_() {
  var dashboard = AKS_includeAdminDashboardFile_("ui/admin/Dashboard");
  var configuration = AKS_includeAdminConfigurationFile_("ui/admin/Configuration");
  var logs = AKS_includeAdminLogFile_("ui/admin/Logs");
  var marker = 'ui/admin/AdminFoundationStyle';

  AKS_assertUx001_(
    dashboard.indexOf(marker) !== -1 &&
      configuration.indexOf(marker) !== -1 &&
      logs.indexOf(marker) !== -1,
    "Tous les écrans administratifs doivent charger le socle UX commun."
  );
}

function AKS_testUx001ProvidesVisibleKeyboardFocus_() {
  var source = AKS_ux001FoundationSource_();
  AKS_assertUx001_(
    source.indexOf(":focus-visible") !== -1 &&
      source.indexOf("outline: 3px solid") !== -1,
    "Le socle UX doit fournir un focus clavier visible."
  );
}

function AKS_testUx001ProvidesAccessibleActionTargets_() {
  var source = AKS_ux001FoundationSource_();
  AKS_assertUx001_(
    source.indexOf("min-height: 44px") !== -1,
    "Les contrôles interactifs doivent disposer d'une cible d'au moins 44 px."
  );
}

function AKS_testUx001ProvidesExplicitDisabledState_() {
  var source = AKS_ux001FoundationSource_();
  AKS_assertUx001_(
    source.indexOf('button:disabled') !== -1 &&
      source.indexOf('[aria-disabled="true"]') !== -1 &&
      source.indexOf("cursor: not-allowed") !== -1,
    "Les actions indisponibles doivent présenter un état explicite et cohérent."
  );
}

function AKS_testUx001RespectsReducedMotionPreference_() {
  var source = AKS_ux001FoundationSource_();
  AKS_assertUx001_(
    source.indexOf("prefers-reduced-motion: reduce") !== -1,
    "Le socle UX doit respecter la préférence de réduction des animations."
  );
}
