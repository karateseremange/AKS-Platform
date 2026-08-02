var AKS = AKS || {};
AKS.Inscriptions = AKS.Inscriptions || {};

/** Moteur déterministe sans I/O du premier incrément Inscriptions. */
AKS.Inscriptions.ReadOnlyEngine = (function () {
  "use strict";

  var ABSENT = "ABSENT";

  function normalizeText_(value) {
    if (value === null || typeof value === "undefined" || String(value).trim() === "") return ABSENT;
    return String(value).trim().toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
  }

  function normalizeAnswer_(value) {
    if (value === null || typeof value === "undefined" || String(value).trim() === "") return ABSENT;
    var normalized = normalizeText_(value);
    if (["OUI", "YES", "1"].indexOf(normalized) !== -1) return "OUI";
    if (["NON", "NO", "0"].indexOf(normalized) !== -1) return "NON";
    return "INVALIDE";
  }

  function adaptForm_(input) {
    var row = input.row || {};
    var mappings = {
      KARATE: { lastName: "Nom", firstName: "Prénom", birthDate: "Date de naissance", email: "Adresse e-mail" },
      FEMININ: { lastName: "Nom", firstName: "Prénom", birthDate: null, email: "Adresse e-mail" },
      BODY_KARATE: { lastName: "Nom", firstName: "Prénom", birthDate: "Date de naissance", email: "Adresse e-mail" }
    };
    var mapping = mappings[input.source];
    if (!mapping) throw new Error("SOURCE_FORMULAIRE_INCONNUE");
    function read_(name) { return name && Object.prototype.hasOwnProperty.call(row, name) ? row[name] : null; }
    return {
      source: input.source,
      lastName: normalizeText_(read_(mapping.lastName)),
      firstName: normalizeText_(read_(mapping.firstName)),
      birthDate: normalizeText_(read_(mapping.birthDate)),
      email: normalizeText_(read_(mapping.email)),
      synthesis: input.source === "BODY_KARATE" ? normalizeAnswer_(row["Réponse synthétique"]) : ABSENT
    };
  }

  function match_(input) {
    var subject = input.subject;
    var candidates = input.candidates.filter(function (candidate) {
      return normalizeText_(candidate.lastName) === normalizeText_(subject.lastName) &&
        normalizeText_(candidate.firstName) === normalizeText_(subject.firstName) &&
        normalizeText_(candidate.birthDate) === normalizeText_(subject.birthDate);
    });
    if (!candidates.length) return { decision: "ABSENT", ids: [] };
    if (candidates.length > 1) return { decision: "AMBIGU", ids: candidates.map(function (c) { return c.id; }).sort() };
    if (normalizeText_(candidates[0].email) === normalizeText_(subject.email)) {
      return { decision: "CERTAIN", ids: [candidates[0].id] };
    }
    return { decision: "PROBABLE", ids: [candidates[0].id] };
  }

  function allocate_(input) {
    var counters = JSON.parse(JSON.stringify(input.counters || {}));
    var ids = input.requests.map(function (request) {
      var scope = request.type + "|" + (request.year || "GLOBAL") + "|" + (request.importType || "GLOBAL");
      counters[scope] = (counters[scope] || 0) + 1;
      var number = ("000000" + counters[scope]).slice(-6);
      if (request.type === "LIC" || request.type === "RSP") return request.type + "-" + number;
      return request.type + "-" + request.year + "-" + number;
    });
    return { ids: ids, counters: counters };
  }

  function replay_(input) {
    var commands = {};
    var outcomes = input.commands.map(function (command) {
      var serialized = AKS.Inscriptions.GoldSupport.stableStringify(command.payload);
      if (!commands[command.key]) {
        commands[command.key] = serialized;
        return "APPLIQUEE";
      }
      return commands[command.key] === serialized ? "REJOUEE" : "CONFLIT";
    });
    return { outcomes: outcomes, uniqueCommands: Object.keys(commands).length };
  }

  function transitions_(input) {
    var allowed = {
      RECUE: ["A_EVALUER"],
      A_EVALUER: ["VALIDEE", "REJETEE"],
      VALIDEE: [], REJETEE: []
    };
    var state = input.initial;
    var accepted = [];
    input.targets.forEach(function (target) {
      if ((allowed[state] || []).indexOf(target) === -1) accepted.push(false);
      else { state = target; accepted.push(true); }
    });
    return { finalState: state, accepted: accepted };
  }

  function execute(dataset) {
    switch (dataset.operation) {
      case "ADAPT_FORM": return { status: "REUSSI", output: adaptForm_(dataset.input) };
      case "NORMALIZE_ANSWERS": return { status: "REUSSI", output: dataset.input.values.map(normalizeAnswer_) };
      case "MATCH": return { status: "REUSSI", output: match_(dataset.input) };
      case "ALLOCATE": return { status: "REUSSI", output: allocate_(dataset.input) };
      case "IDEMPOTENCY": return { status: "REUSSI", output: replay_(dataset.input) };
      case "TRANSITIONS": return { status: "REUSSI", output: transitions_(dataset.input) };
      case "DEPENDENCY_FAILURE": return { status: "REUSSI", output: { committed: false, reported: "AUDIT_REQUIRED" } };
      case "QS_LINK": return { status: "REUSSI", output: { reference: dataset.input.reference, administrativeResult: dataset.input.administrativeResult, medicalAnswersPresent: false } };
      case "DECLARED_PARTIAL": return { status: "PARTIEL", output: dataset.input.output };
      case "DECLARED_BLOCKED": return { status: "BLOQUE", output: dataset.input.output };
      default: throw new Error("OPERATION_INCONNUE");
    }
  }

  function run(datasets) {
    var details = datasets.map(function (dataset) {
      var actual = execute(dataset);
      return {
        id: dataset.id,
        status: actual.status,
        differences: AKS.Inscriptions.GoldSupport.compare(dataset.expected, actual)
      };
    });
    var counts = { REUSSI: 0, PARTIEL: 0, BLOQUE: 0, ECHEC: 0 };
    details.forEach(function (detail) {
      if (detail.differences.length) counts.ECHEC += 1;
      else counts[detail.status] += 1;
    });
    return AKS.Inscriptions.GoldSupport.deepFreeze({ counts: counts, details: details });
  }

  return Object.freeze({ ABSENT: ABSENT, execute: execute, run: run });
}());
