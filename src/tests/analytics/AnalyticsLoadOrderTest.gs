function AKS_withAnalyticsModelUnavailable_(operation) {
  var model = AKS.Analytics.NormalizedModel;
  var message = "";
  try {
    AKS.Analytics.NormalizedModel = undefined;
    operation();
  } catch (error) {
    message = error && error.message ? error.message : String(error);
  } finally {
    AKS.Analytics.NormalizedModel = model;
  }
  return message;
}

function AKS_testAnalyticsLoadOrder_modulesInitializeBeforeModel_() {
  assertTrue_(typeof AKS.Analytics.Consolidator.consolidate === "function", "Consolidator doit être chargé.");
  assertTrue_(typeof AKS.Analytics.Normalizer.normalizeCourse === "function", "Normalizer doit être chargé.");
  assertTrue_(typeof AKS.Analytics.IndicatorEngine.calculate === "function", "IndicatorEngine doit être chargé.");
  assertTrue_(typeof AKS.Analytics.CourseOrchestrator.run === "function", "CourseOrchestrator doit être chargé.");
}

function AKS_testAnalyticsLoadOrder_consolidatorResolvesModelAtCallTime_() {
  var message = AKS_withAnalyticsModelUnavailable_(function () {
    AKS.Analytics.Consolidator.consolidate({ attendances: [] });
  });
  assertTrue_(message.indexOf("AnalyticsNormalizedModel indisponible") >= 0, "La dépendance absente doit être explicite.");
  assertEquals_("VALIDE", AKS.Analytics.Consolidator.consolidate({ attendances: [] }).state);
}

function AKS_testAnalyticsLoadOrder_normalizerResolvesModelAtCallTime_() {
  var message = AKS_withAnalyticsModelUnavailable_(function () {
    AKS.Analytics.Normalizer.normalizeAttendanceStatus("P");
  });
  assertTrue_(message.indexOf("AnalyticsNormalizedModel indisponible") >= 0, "La dépendance absente doit être explicite.");
  assertEquals_("PRESENT", AKS.Analytics.Normalizer.normalizeAttendanceStatus("P").value);
}

function AKS_testAnalyticsLoadOrder_indicatorEngineResolvesModelAtCallTime_() {
  var message = AKS_withAnalyticsModelUnavailable_(function () {
    AKS.Analytics.IndicatorEngine.calculate({
      attendances: [
        { season: "2026-2027", course_code: "BABY", session_date: "2026-09-05", licencie_id: "LIC-LOAD-001", status: "PRESENT" }
      ]
    });
  });
  assertTrue_(message.indexOf("AnalyticsNormalizedModel indisponible") >= 0, "La dépendance absente doit être explicite.");
  assertTrue_(!!AKS.Analytics.IndicatorEngine.calculate({ attendances: [] }), "Le moteur doit reprendre après restauration.");
}

function AKS_testAnalyticsLoadOrder_orchestratorResolvesModelAtCallTime_() {
  var message = AKS_withAnalyticsModelUnavailable_(function () {
    AKS.Analytics.CourseOrchestrator.run({ season: "2026-2027", courses: [] });
  });
  assertTrue_(message.indexOf("AnalyticsNormalizedModel indisponible") >= 0, "La dépendance absente doit être explicite.");
  assertTrue_(!!AKS.Analytics.CourseOrchestrator.run({ season: "2026-2027", courses: [] }), "L'orchestrateur doit reprendre après restauration.");
}

function AKS_runAnalyticsLoadOrderSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — compatibilité ordre de chargement Apps Script", [
    { name: "ANALYTICS / modules avant modèle", test: AKS_testAnalyticsLoadOrder_modulesInitializeBeforeModel_ },
    { name: "ANALYTICS / résolution tardive consolidation", test: AKS_testAnalyticsLoadOrder_consolidatorResolvesModelAtCallTime_ },
    { name: "ANALYTICS / résolution tardive normalisation", test: AKS_testAnalyticsLoadOrder_normalizerResolvesModelAtCallTime_ },
    { name: "ANALYTICS / résolution tardive indicateurs", test: AKS_testAnalyticsLoadOrder_indicatorEngineResolvesModelAtCallTime_ },
    { name: "ANALYTICS / résolution tardive orchestration", test: AKS_testAnalyticsLoadOrder_orchestratorResolvesModelAtCallTime_ }
  ]);
}
