var AKS = AKS || {};

function AKS_testAnalyticsSaisie006_locksRecipeIdentityAndTarget_() {
  var constants = AKS.Analytics.AttendanceMobileRecipe.constants;
  AKS_assertAnalyticsSaisie003_(
    constants.authorizedEmail === "karate.seremange@gmail.com" &&
    constants.spreadsheetId === "1iU9Q98uGtlmrEq8-ip5sO6HmW_uThbBYOwacw8iVOH4" &&
    constants.spreadsheetTitle === "[RECETTE] Analytics Baby 2026-2027",
    "La recette doit verrouiller l'identité et la copie Sheets exactes."
  );
}

function AKS_testAnalyticsSaisie006_locksRecipeScopeAndDate_() {
  var constants = AKS.Analytics.AttendanceMobileRecipe.constants;
  AKS_assertAnalyticsSaisie003_(
    constants.courseCode === "BABY" &&
    constants.season === "2026-2027" &&
    constants.sessionDate === "2026-09-19",
    "La recette doit être limitée au cours, à la saison et à la date réservés."
  );
}

function AKS_testAnalyticsSaisie006_exposesDistinctRecipeRoute_() {
  var webApp = String(doGet);
  AKS_assertAnalyticsSaisie003_(
    webApp.indexOf('app === "attendance-recipe"') !== -1 &&
    webApp.indexOf("AttendanceRecipePage.render") !== -1 &&
    AKS.Analytics.AttendancePage !== AKS.Analytics.AttendanceRecipePage,
    "La recette doit utiliser une route et une composition serveur distinctes."
  );
}

function AKS_testAnalyticsSaisie006_usesDedicatedClientEndpoints_() {
  var source = AKS_includeAttendanceFile_("ui/analytics/Attendance");
  var client = AKS_includeAttendanceFile_("ui/analytics/AttendanceClient");
  AKS_assertAnalyticsSaisie003_(
    source.indexOf("AKS_ATTENDANCE_RECIPE") !== -1 &&
    client.indexOf(".AKS_getAttendanceRecipeWorkspace") !== -1 &&
    client.indexOf(".AKS_saveAttendanceRecipeBatch") !== -1 &&
    client.indexOf(".AKS_getAttendanceWorkspace") !== -1 &&
    client.indexOf(".AKS_saveAttendanceBatch") !== -1,
    "Le client doit séparer les endpoints de recette et de production."
  );
}
