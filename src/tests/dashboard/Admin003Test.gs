var AKS = AKS || {};

function AKS_assertAdmin003_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function AKS_createAdmin003Widget_(widgetId, zone, priority, state) {
  return {
    widgetId: widgetId,
    providerId: "aks.test.admin003",
    type: "information",
    zone: zone,
    title: widgetId,
    state: state || "available",
    priority: priority,
    content: { value: widgetId }
  };
}

function AKS_testAdmin003ExposesFourZones_() {
  var model = AKS_createDashboardComposer_().compose({ widgets: [] });

  AKS_assertAdmin003_(
    JSON.stringify(model.zoneOrder) ===
      JSON.stringify(["header", "summary", "modules", "quick-actions"]),
    "L'ordre des quatre zones fonctionnelles est incorrect."
  );
  AKS_assertAdmin003_(
    Array.isArray(model.zones.header) &&
      Array.isArray(model.zones.summary) &&
      Array.isArray(model.zones.modules) &&
      Array.isArray(model.zones.quickActions),
    "Les quatre zones fonctionnelles doivent être exposées."
  );
}

function AKS_testAdmin003GroupsWidgetsByZone_() {
  var widgets = [
    AKS_createAdmin003Widget_("header", "header", 10),
    AKS_createAdmin003Widget_("summary", "summary", 10),
    AKS_createAdmin003Widget_("module", "modules", 10),
    AKS_createAdmin003Widget_("action", "quick-actions", 10)
  ];
  var model = AKS_createDashboardComposer_().compose({ widgets: widgets });

  AKS_assertAdmin003_(model.zones.header[0].widgetId === "header", "La zone d'en-tête est incorrecte.");
  AKS_assertAdmin003_(model.zones.summary[0].widgetId === "summary", "La zone de synthèse est incorrecte.");
  AKS_assertAdmin003_(model.zones.modules[0].widgetId === "module", "La zone des modules est incorrecte.");
  AKS_assertAdmin003_(model.zones.quickActions[0].widgetId === "action", "La zone des actions rapides est incorrecte.");
}

function AKS_testAdmin003PreservesNormalizedStates_() {
  var states = [
    "loading",
    "available",
    "empty",
    "unavailable",
    "error",
    "access-denied",
    "disabled"
  ];
  var widgets = states.map(function (state, index) {
    return AKS_createAdmin003Widget_("state-" + index, "modules", index, state);
  });
  var model = AKS_createDashboardComposer_().compose({ widgets: widgets });

  AKS_assertAdmin003_(
    model.zones.modules.map(function (widget) {
      return widget.state;
    }).join(",") === states.join(","),
    "Les états normalisés ne doivent pas être interprétés par le composeur."
  );
}

function AKS_testAdmin003DoesNotDeriveGlobalHealth_() {
  var model = AKS_createDashboardComposer_().compose({
    widgets: [
      AKS_createAdmin003Widget_("error", "summary", 10, "error")
    ]
  });

  AKS_assertAdmin003_(
    !Object.prototype.hasOwnProperty.call(model, "status"),
    "Le Centre de pilotage ne doit pas déduire d'état global."
  );
}

function AKS_testAdmin003PreservesFreshness_() {
  var widget = AKS_createAdmin003Widget_("fresh", "summary", 10);
  widget.freshness = {
    updatedAt: "2026-07-24T20:00:00.000Z",
    state: "current"
  };
  var model = AKS_createDashboardComposer_().compose({ widgets: [widget] });

  AKS_assertAdmin003_(
    model.zones.summary[0].freshness.updatedAt ===
      "2026-07-24T20:00:00.000Z",
    "L'indication de fraîcheur doit être préservée."
  );
}

function AKS_testAdmin003CreatesDefensiveZoneCopies_() {
  var widget = AKS_createAdmin003Widget_("copy", "modules", 10);
  var model = AKS_createDashboardComposer_().compose({ widgets: [widget] });

  AKS_assertAdmin003_(
    model.widgets[0] !== widget &&
      model.zones.modules[0] !== widget &&
      model.widgets[0] !== model.zones.modules[0] &&
      model.widgets[0].content !== widget.content &&
      model.zones.modules[0].content !== widget.content,
    "Le composeur doit créer des copies défensives des cartes."
  );
}

function AKS_testAdmin003DashboardHasNoGlobalHealth_() {
  var model = AKS_createDashboard001NominalApi_().getDashboard();

  AKS_assertAdmin003_(
    !Object.prototype.hasOwnProperty.call(model, "status"),
    "L'API du Centre de pilotage ne doit plus publier status.healthy."
  );
}

function AKS_testAdmin003IsolatesUnavailableCard_() {
  var model = AKS_createDashboard001NominalApi_().getDashboard();
  var unavailable = AKS_createAdmin003Widget_(
    "unavailable",
    "modules",
    10,
    "unavailable"
  );
  var composed = AKS_createDashboardComposer_().compose({
    widgets: model.widgets.concat([unavailable])
  });

  AKS_assertAdmin003_(
    composed.zones.summary.length === model.zones.summary.length &&
      composed.zones.modules.length === 1,
    "Une carte indisponible ne doit pas bloquer les autres zones."
  );
}
