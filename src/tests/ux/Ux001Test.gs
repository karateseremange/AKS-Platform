var AKS = AKS || {};

function AKS_assertUx001_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function AKS_ux001FoundationSource_() {
  return AKS_includeAdminDashboardFile_("ui/admin/AdminFoundationStyle");
}

function AKS_renderUx001AdminView_(path, viewModel) {
  var template = HtmlService.createTemplateFromFile(path);
  template.viewModel = viewModel;
  return template.evaluate().getContent();
}

function AKS_testUx001AdminViewsUseSharedFoundation_() {
  var dashboard = AKS_renderUx001AdminView_("ui/admin/Dashboard", {
    platform: { name: "AKS Platform", version: "test", releaseName: "test" },
    administrator: { email: "admin@example.invalid" },
    navigation: { families: [] },
    actions: [],
    recentLogs: {
      available: true,
      events: [],
      navigation: { logsTarget: "?app=logs" }
    }
  });
  var configuration = AKS_renderUx001AdminView_("ui/admin/Configuration", {
    navigation: {
      configurationTarget: "?app=configuration",
      homeTarget: "?app=admin"
    },
    parameters: []
  });
  var logs = AKS_renderUx001AdminView_("ui/admin/Logs", {
    navigation: {
      homeTarget: "?app=admin",
      resetTarget: "?app=logs"
    },
    filters: { level: "", category: "", module: "", search: "", limit: 25 },
    options: { levels: [], categories: [], limits: [25] },
    result: { count: 0, filtered: false },
    events: []
  });
  var marker = "--aks-primary-dark";

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

function AKS_ux001ConfigurationClientSource_() {
  return AKS_includeAdminConfigurationFile_("ui/admin/ConfigurationClient");
}

function AKS_testUx001ConfigurationPreventsDuplicateActions_() {
  var source = AKS_ux001ConfigurationClientSource_();
  AKS_assertUx001_(
    source.indexOf('form.getAttribute("data-busy") === "true"') !== -1 &&
      source.indexOf("setBusy(form, true)") !== -1 &&
      source.indexOf("control.disabled = busy") !== -1,
    "Le paramétrage doit verrouiller ses contrôles et prévenir les doubles actions."
  );
}

function AKS_testUx001ConfigurationAnnouncesPendingAction_() {
  var source = AKS_ux001ConfigurationClientSource_();
  AKS_assertUx001_(
    source.indexOf('"Enregistrement en cours…"') !== -1 &&
      source.indexOf('"Restauration en cours…"') !== -1 &&
      source.indexOf('message.setAttribute("role"') !== -1,
    "Le paramétrage doit annoncer les traitements en cours de manière accessible."
  );
}

function AKS_testUx001ConfigurationRecoversAfterFailure_() {
  var source = AKS_ux001ConfigurationClientSource_();
  AKS_assertUx001_(
    source.indexOf("setBusy(container, false)") !== -1 &&
      source.indexOf(".withFailureHandler(fail(form))") !== -1,
    "Le paramétrage doit réactiver les contrôles après un échec."
  );
}

function AKS_testUx001ConfigurationHidesTechnicalFailureDetails_() {
  var source = AKS_ux001ConfigurationClientSource_();
  AKS_assertUx001_(
    source.indexOf("error.message") === -1 &&
      source.indexOf("Réessayez dans quelques instants.") !== -1 &&
      source.indexOf('state === "error" ? "alert" : "status"') !== -1,
    "Le paramétrage doit afficher un échec exploitable sans exposer de détail technique."
  );
}

function AKS_createUx001LogViewModel_(filtered, events) {
  events = events || [];
  return {
    navigation: {
      homeTarget: "?app=admin",
      resetTarget: "?app=logs"
    },
    filters: {
      level: filtered ? "ERROR" : "",
      category: "",
      module: "",
      search: "",
      limit: 25
    },
    result: {
      count: events.length,
      filtered: filtered
    },
    options: {
      levels: ["ERROR"],
      categories: [],
      limits: [25]
    },
    events: events
  };
}

function AKS_testUx001LogModelDescribesFilteredResults_() {
  var event = {
    eventId: "evt-ux-001",
    timestamp: "2026-07-25T18:00:00.000Z",
    level: "ERROR",
    category: "technical",
    source: "AKS",
    module: "UX",
    eventType: "ux.test",
    message: "Événement de recette",
    outcome: "",
    correlationId: "corr-ux-001",
    reference: "",
    durationMs: null,
    actorJson: "",
    contextJson: ""
  };
  var model = AKS_createLog001AdminFixture_({
    events: [event]
  }).controller.getViewModel({ level: "ERROR" });

  AKS_assertUx001_(
    model.result.count === 1 &&
      model.result.filtered === true &&
      model.navigation.resetTarget.indexOf("?app=logs") !== -1,
    "La consultation doit décrire le résultat filtré et fournir une réinitialisation."
  );
}

function AKS_testUx001LogViewAnnouncesResultCount_() {
  var html = AKS_renderUx001AdminView_(
    "ui/admin/Logs",
    AKS_createUx001LogViewModel_(false, [])
  );

  AKS_assertUx001_(
    html.indexOf('role="status"') !== -1 &&
      html.indexOf('aria-live="polite"') !== -1 &&
      html.indexOf("<strong>0</strong>") !== -1,
    "Le nombre de résultats doit être annoncé sans interrompre la navigation."
  );
}

function AKS_testUx001FilteredEmptyLogViewOffersReset_() {
  var html = AKS_renderUx001AdminView_(
    "ui/admin/Logs",
    AKS_createUx001LogViewModel_(true, [])
  );

  AKS_assertUx001_(
    html.indexOf("Aucun événement ne correspond aux critères.") !== -1 &&
      html.indexOf("Réinitialiser les filtres") !== -1 &&
      html.indexOf("Afficher tous les événements") !== -1,
    "Un résultat filtré vide doit expliquer l'état et proposer une sortie immédiate."
  );
}
