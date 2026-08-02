var AKS = AKS || {};
AKS.Inscriptions = AKS.Inscriptions || {};

/** Infrastructure pure des jeux d'or Inscriptions. */
AKS.Inscriptions.GoldSupport = (function () {
  "use strict";

  var REQUIRED_IDS = [
    "INS-GOLD-001", "INS-GOLD-002", "INS-GOLD-003", "INS-GOLD-004",
    "INS-GOLD-005", "INS-GOLD-006", "INS-GOLD-007", "INS-GOLD-008",
    "INS-GOLD-009", "INS-GOLD-010", "INS-GOLD-011", "INS-GOLD-012",
    "INS-GOLD-013", "INS-GOLD-014", "INS-GOLD-015", "INS-GOLD-016"
  ];

  function clone_(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function deepFreeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) { deepFreeze_(value[key]); });
    return Object.freeze(value);
  }

  function stableStringify_(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) {
      return "[" + value.map(stableStringify_).join(",") + "]";
    }
    return "{" + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ":" + stableStringify_(value[key]);
    }).join(",") + "}";
  }

  // FNV-1a 32 bits, déterministe et indépendant des services Google.
  function fingerprint_(value) {
    var text = stableStringify_(value);
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return ("00000000" + (hash >>> 0).toString(16)).slice(-8);
  }

  function payloadForFingerprint_(dataset) {
    return {
      id: dataset.id,
      version: dataset.version,
      operation: dataset.operation,
      input: dataset.input,
      expected: dataset.expected
    };
  }

  function validate(datasets) {
    var errors = [];
    var ids = {};
    if (!Array.isArray(datasets)) return ["La collection doit être un tableau."];
    datasets.forEach(function (dataset, index) {
      var path = "datasets[" + index + "]";
      ["id", "version", "title", "operation", "input", "expected", "fingerprint"].forEach(function (key) {
        if (!dataset || !Object.prototype.hasOwnProperty.call(dataset, key)) {
          errors.push(path + "." + key + " est obligatoire.");
        }
      });
      if (!dataset) return;
      if (ids[dataset.id]) errors.push("Identifiant dupliqué : " + dataset.id + ".");
      ids[dataset.id] = true;
      if (dataset.version !== "1.0") errors.push(dataset.id + " : version inconnue.");
      if (dataset.fingerprint !== fingerprint_(payloadForFingerprint_(dataset))) {
        errors.push(dataset.id + " : empreinte invalide.");
      }
    });
    REQUIRED_IDS.forEach(function (id) {
      if (!ids[id]) errors.push("Jeu d'or manquant : " + id + ".");
    });
    if (datasets.length !== REQUIRED_IDS.length) errors.push("Exactement seize jeux d'or sont attendus.");
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
        if (!Object.prototype.hasOwnProperty.call(left, key)) differences.push(path + "." + key + " : propriété inattendue.");
        else if (!Object.prototype.hasOwnProperty.call(right, key)) differences.push(path + "." + key + " : propriété manquante.");
        else visit_(left[key], right[key], path + "." + key);
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
    deepFreeze: deepFreeze_,
    fingerprint: fingerprint_,
    prepare: prepare,
    stableStringify: stableStringify_,
    validate: validate
  });
}());
