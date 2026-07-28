var AKS = AKS || {};

function AKS_testAnalyticsSaisie006_locksRecipeIdentityAndTarget_() {
  var source = String(AKS.Analytics.AttendanceMobileRecipe);
  AKS_assertAnalyticsSaisie003_(
    source.indexOf("karate.seremange@gmail.com") !== -1 &&
    source.indexOf("1iU9Q98uGtlmrEq8-ip5sO6HmW_uThbBYOwacw8iVOH4") !== -1 &&
    source.indexOf("[RECETTE] Analytics Baby 2026-2027") !== -1 &&
    source.indexOf("book.getId() === SPREADSHEET_ID") !== -1 &&
    source.indexOf("book.getName() === SPREADSHEET_TITLE") !== -1,
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
  var page = String(AKS.Analytics.AttendancePage.render);
  AKS_assertAnalyticsSaisie003_(
    webApp.indexOf('app === "attendance-recipe"') !== -1 &&
    page.indexOf("AttendanceMobileRecipe.getAccessContext") !== -1,
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
