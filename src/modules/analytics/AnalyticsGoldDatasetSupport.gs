var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Infrastructure de test des jeux d'or Analytics.
 * Ce composant ne lit aucune source externe et n'exécute aucun calcul métier.
 */
AKS.Analytics.GoldDatasetSupport = (function () {
  "use strict";

  var REQUIRED_IDS = [
    "GOLD-001", "GOLD-002", "GOLD-003", "GOLD-004", "GOLD-005",
    "GOLD-006", "GOLD-007", "GOLD-008", "GOLD-009", "GOLD-010"
  ];

  function clone_(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function deepFreeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { deepFreeze_(value[key]); });
    return Object.freeze(value);
  }

  function validate(datasets) {
    var errors = [];
    var ids = {};

    if (!Array.isArray(datasets)) return ["La collection des jeux d'or doit être un tableau."];

    datasets.forEach(function (dataset, index) {
      var path = "datasets[" + index + "]";
      if (!dataset || typeof dataset !== "object") {
        errors.push(path + " doit être un objet.");
        return;
      }
      ["id", "title", "purpose", "input", "expected"].forEach(function (property) {
        if (!Object.prototype.hasOwnProperty.call(dataset, property)) {
          errors.push(path + "." + property + " est obligatoire.");
        }
      });
      if (ids[dataset.id]) errors.push("Identifiant dupliqué : " + dataset.id + ".");
      ids[dataset.id] = true;
    });

    REQUIRED_IDS.forEach(function (id) {
      if (!ids[id]) errors.push("Jeu d'or manquant : " + id + ".");
    });
    if (datasets.length !== REQUIRED_IDS.length) {
      errors.push("Exactement dix jeux d'or sont attendus.");
    }
    return errors;
  }

  function compare(expected, actual) {
    var differences = [];

    function visit_(left, right, path) {
      if (left === right) return;
      if (typeof left !== typeof right || left === null || right === null) {
        differences.push(path + " : attendu " + JSON.stringify(left) + ", obtenu " + JSON.stringify(right));
        return;
      }
      if (typeof left !== "object") {
        differences.push(path + " : attendu " + JSON.stringify(left) + ", obtenu " + JSON.stringify(right));
        return;
      }
      if (Array.isArray(left) !== Array.isArray(right)) {
        differences.push(path + " : types de collection différents.");
        return;
      }
      var keys = {};
      Object.keys(left).concat(Object.keys(right)).forEach(function (key) { keys[key] = true; });
      Object.keys(keys).sort().forEach(function (key) {
        if (!Object.prototype.hasOwnProperty.call(left, key)) {
          differences.push(path + "." + key + " : propriété inattendue.");
        } else if (!Object.prototype.hasOwnProperty.call(right, key)) {
          differences.push(path + "." + key + " : propriété manquante.");
        } else {
          visit_(left[key], right[key], path + "." + key);
        }
      });
    }

    visit_(expected, actual, "$");
    return differences;
  }

  function prepare(datasets) {
    var errors = validate(datasets);
    if (errors.length) throw new Error("Jeux d'or invalides :\n" + errors.join("\n"));
    return deepFreeze_(clone_(datasets));
  }

  return Object.freeze({
    compare: compare,
    prepare: prepare,
    validate: validate
  });
}());
