var AKS = AKS || {};

function AKS_assertAdmin002_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function AKS_createAdmin002Entries_() {
  return [
    {
      id: "module.health",
      label: "Questionnaire santé",
      family: "modules",
      target: "?app=health-questionnaire",
      available: true,
      authorized: true,
      priority: 20,
      quickAction: true
    },
    {
      id: "admin.config",
      label: "Paramétrage",
      family: "administration",
      target: "?app=config",
      available: true,
      authorized: true,
      priority: 10
    }
  ];
}

function AKS_testAdmin002KeepsStableFamilyOrder_() {
  var model = AKS_createAdminNavigation_().build(
    AKS_createAdmin002Entries_(),
    "https://example.test/app"
  );

  AKS_assertAdmin002_(
    model.families.map(function (family) {
      return family.id;
    }).join(",") === "administration,modules",
    "L'ordre fonctionnel des familles doit rester stable."
  );
}

function AKS_testAdmin002HidesUnavailableDestinations_() {
  var entries = AKS_createAdmin002Entries_();
  entries.push({
    id: "module.analytics",
    label: "Analytics",
    family: "modules",
    target: "?app=analytics",
    available: false,
    authorized: true
  });
  var model = AKS_createAdminNavigation_().build(
    entries,
    "https://example.test/app"
  );

  AKS_assertAdmin002_(
    model.families[1].destinations.length === 1,
    "Une destination indisponible ne doit pas être affichée."
  );
}

function AKS_testAdmin002HidesUnauthorizedDestinations_() {
  var entries = AKS_createAdmin002Entries_();
  entries[0].authorized = false;
  var model = AKS_createAdminNavigation_().build(
    entries,
    "https://example.test/app"
  );

  AKS_assertAdmin002_(
    model.families.length === 1 &&
      model.families[0].id === "administration",
    "Une destination non autorisée et sa famille vide doivent disparaître."
  );
}

function AKS_testAdmin002RejectsUnsafeTargets_() {
  var entries = AKS_createAdmin002Entries_();
  entries.push({
    id: "unsafe",
    label: "Lien dangereux",
    family: "maintenance",
    target: "javascript:alert(1)",
    available: true,
    authorized: true,
    external: true
  });
  var model = AKS_createAdminNavigation_().build(
    entries,
    "https://example.test/app"
  );

  AKS_assertAdmin002_(
    model.families.length === 2,
    "Une cible non HTTPS ou non interne doit être rejetée."
  );
}

function AKS_testAdmin002IdentifiesExternalLinks_() {
  var entries = [{
    id: "external.help",
    label: "Aide",
    family: "maintenance",
    target: "https://example.test/help",
    available: true,
    authorized: true,
    external: true
  }];
  var model = AKS_createAdminNavigation_().build(
    entries,
    "https://example.test/app"
  );

  AKS_assertAdmin002_(
    model.families[0].destinations[0].external === true,
    "Un lien externe HTTPS doit être explicitement identifié."
  );
}

function AKS_testAdmin002ExposesDashboardReturn_() {
  var model = AKS_createAdminNavigation_().build(
    [],
    "https://example.test/app"
  );

  AKS_assertAdmin002_(
    model.home.target === "https://example.test/app?app=admin" &&
      model.currentSection === "control-center",
    "Le retour vers le Centre de pilotage doit être explicite."
  );
}

function AKS_testAdmin002PublishesOnlyActiveModules_() {
  var model = AKS.Admin.Navigation.getModel("https://example.test/app");
  var moduleDestinations = model.families.filter(function (family) {
    return family.id === "modules";
  })[0].destinations;

  AKS_assertAdmin002_(
    moduleDestinations.length === 2 &&
      moduleDestinations[0].id === "module.analytics" &&
      moduleDestinations[1].id === "module.health-questionnaire",
    "Seul le module actif et déclaré doit publier sa destination."
  );
}

function AKS_testAdmin002CreatesImmutableDefensiveModel_() {
  var entries = AKS_createAdmin002Entries_();
  var model = AKS_createAdminNavigation_().build(
    entries,
    "https://example.test/app"
  );

  AKS_assertAdmin002_(
    Object.isFrozen(model) &&
      Object.isFrozen(model.families) &&
      Object.isFrozen(model.families[0].destinations),
    "Le modèle de navigation doit être récursivement immuable."
  );
  AKS_assertAdmin002_(
    model.families[0].destinations[0] !== entries[1],
    "Le modèle de navigation doit utiliser des copies défensives."
  );
}
