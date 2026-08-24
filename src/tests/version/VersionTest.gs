var AKS = AKS || {};

function AKS_assertVersion001_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function AKS_assertVersion001ErrorCode_(callback, expectedCode, message) {
  var thrownError = null;

  try {
    callback();
  } catch (error) {
    thrownError = error;
  }

  AKS_assertVersion001_(thrownError !== null, message + " Aucune erreur n'a été levée.");
  AKS_assertVersion001_(
    thrownError.code === expectedCode,
    message + " Code reçu : " + String(thrownError.code)
  );
}

function AKS_testVersion001ApiExists_() {
  AKS_assertVersion001_(AKS.Version !== null && typeof AKS.Version === "object", "AKS.Version doit exister.");
  AKS_assertVersion001_(
    typeof AKS.Version.getReleaseInfo === "function",
    "AKS.Version.getReleaseInfo doit être une fonction."
  );
  AKS_assertVersion001_(Object.isFrozen(AKS.Version), "L'API publique AKS.Version doit être figée.");
}

function AKS_testVersion001ReleaseInfoStructure_() {
  var releaseInfo = AKS.Version.getReleaseInfo();
  var propertyNames = Object.keys(releaseInfo).sort();

  AKS_assertVersion001_(propertyNames.length === 3, "Les métadonnées doivent exposer exactement trois propriétés.");
  AKS_assertVersion001_(
    propertyNames.join(",") === "build,releaseName,version",
    "Les propriétés publiques attendues sont version, build et releaseName."
  );
  AKS_assertVersion001_(typeof releaseInfo.version === "string" && releaseInfo.version.length > 0, "version doit être une chaîne non vide.");
  AKS_assertVersion001_(typeof releaseInfo.build === "string" && releaseInfo.build.length > 0, "build doit être une chaîne non vide.");
  AKS_assertVersion001_(typeof releaseInfo.releaseName === "string" && releaseInfo.releaseName.length > 0, "releaseName doit être une chaîne non vide.");
}

function AKS_testVersion001ReleaseInfoIsImmutable_() {
  var releaseInfo = AKS.Version.getReleaseInfo();

  AKS_assertVersion001_(Object.isFrozen(releaseInfo), "L'objet retourné doit être figé.");

  var originalVersion = releaseInfo.version;
  releaseInfo.version = "9.9.9";

  AKS_assertVersion001_(releaseInfo.version === originalVersion, "Une tentative de modification ne doit pas altérer l'objet retourné.");
  AKS_assertVersion001_(
    AKS.Version.getReleaseInfo().version === originalVersion,
    "Une tentative de modification ne doit pas altérer les appels suivants."
  );
}

function AKS_testVersion001ReturnsDefensiveCopies_() {
  var firstReleaseInfo = AKS.Version.getReleaseInfo();
  var secondReleaseInfo = AKS.Version.getReleaseInfo();

  AKS_assertVersion001_(
    firstReleaseInfo !== secondReleaseInfo,
    "Chaque appel doit retourner une nouvelle instance."
  );
  AKS_assertVersion001_(
    JSON.stringify(firstReleaseInfo) === JSON.stringify(secondReleaseInfo),
    "Les copies successives doivent contenir les mêmes métadonnées."
  );
}

function AKS_testVersion001RejectsInvalidProvider_() {
  var versionApi = AKS_createVersionApi_(null);

  AKS_assertVersion001ErrorCode_(function () {
    versionApi.getReleaseInfo();
  }, "VERSION001_INVALID_RELEASE_METADATA", "Un provider invalide doit être rejeté.");
}

function AKS_testVersion001RejectsInvalidProviderResult_() {
  var invalidResults = [
    null,
    [],
    {},
    { version: "1.1.0", build: "build" },
    { version: "", build: "build", releaseName: "Release" },
    { version: "1.1.0", build: "", releaseName: "Release" },
    { version: "1.1.0", build: "build", releaseName: "" },
    { version: 110, build: "build", releaseName: "Release" }
  ];

  invalidResults.forEach(function (invalidResult) {
    var versionApi = AKS_createVersionApi_(function () {
      return invalidResult;
    });

    AKS_assertVersion001ErrorCode_(function () {
      versionApi.getReleaseInfo();
    }, "VERSION001_INVALID_RELEASE_METADATA", "Des métadonnées invalides doivent être rejetées.");
  });
}

function AKS_testVersion001NormalizesRequiredStrings_() {
  var versionApi = AKS_createVersionApi_(function () {
    return {
      version: " 1.1.0 ",
      build: " build-001 ",
      releaseName: " Release V1.1 "
    };
  });
  var releaseInfo = versionApi.getReleaseInfo();

  AKS_assertVersion001_(releaseInfo.version === "1.1.0", "version doit être normalisée.");
  AKS_assertVersion001_(releaseInfo.build === "build-001", "build doit être normalisé.");
  AKS_assertVersion001_(releaseInfo.releaseName === "Release V1.1", "releaseName doit être normalisé.");
}

function AKS_testVersion001ExposesExactReleaseCandidate_() {
  var releaseInfo = AKS.Version.getReleaseInfo();
  AKS_assertVersion001_(releaseInfo.version === "1.4.0-rc.5",
    "La version embarquée doit identifier exactement la candidate RC5.");
  AKS_assertVersion001_(releaseInfo.build === "20260824.rc5.206c436",
    "Le build RC doit rester explicite et traçable sans prétendre être le build final.");
  AKS_assertVersion001_(releaseInfo.releaseName ===
    "ACCESS et administration sécurisée — RC5",
    "Le nom de release doit identifier explicitement la candidate.");
  AKS_assertVersion001_(AKS.version === releaseInfo.version,
    "Le marqueur historique et l'API de version doivent rester alignés.");
}
