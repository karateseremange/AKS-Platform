/**
 * Editor-only ADMIN-006 prerequisite. Uses the existing ACCESS transaction,
 * persistent AUDIT and exact restore; no transport, private flag or deployment.
 * The configured manager receives ACCESS_MANAGE + LOG_READ, not LOG_READ alone.
 * Installation and each Google mutation require separate operator approval.
 */
function AKS_preflightAccess002LogReadRecipe() {
  var result = AKS_createDefaultAccess002Recipe_({ recipeProfile: "LOG_READ" }).preflight();
  console.log("PRÉCONTRÔLE RECETTE LOG_READ: " + JSON.stringify(result));
  return result;
}

function AKS_applyAccess002LogReadRecipe() {
  var result = AKS_createDefaultAccess002Recipe_({ recipeProfile: "LOG_READ" }).apply();
  console.log("APPLICATION RECETTE LOG_READ: " + JSON.stringify(result));
  return result;
}

function AKS_restoreAccess002LogReadRecipe() {
  var result = AKS_createDefaultAccess002Recipe_({ recipeProfile: "LOG_READ" }).restore();
  console.log("RESTAURATION RECETTE LOG_READ: " + JSON.stringify(result));
  return result;
}
