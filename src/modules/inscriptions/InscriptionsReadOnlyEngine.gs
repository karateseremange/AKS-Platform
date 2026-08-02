var AKS = AKS || {};
AKS.Inscriptions = AKS.Inscriptions || {};

/** Fabrique inspectable du moteur déterministe sans I/O. */
AKS.Inscriptions.createReadOnlyEngine = function () {
  "use strict";

  var ABSENT = "ABSENT";

  function clone_(value) { return JSON.parse(JSON.stringify(value)); }

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

  function canonicalTimestamp_(value) {
    var instant = new Date(value);
    if (isNaN(instant.getTime())) throw new Error("HORODATAGE_INVALIDE");
    return instant.toISOString();
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

  function createDossier_(input) {
    return {
      person: adaptForm_({ source: input.source, row: input.row }),
      submittedAtUtc: canonicalTimestamp_(input.submittedAt),
      timeZone: "Europe/Paris",
      states: { reception: "RECUE", verification: "A_EVALUER", preparation: "NON_PREPARE", activation: "INACTIF" }
    };
  }

  function normalizeValues_(input) {
    return {
      answers: input.values.map(normalizeAnswer_),
      submittedAtUtc: canonicalTimestamp_(input.submittedAt),
      sourceTimeZone: input.sourceTimeZone,
      targetTimeZone: "Europe/Paris"
    };
  }

  function responseChanges_(input) {
    var seen = {};
    return input.responses.map(function (response) {
      var status;
      if (seen[response.responseId]) status = "DUPLIQUEE";
      else if (response.currentFingerprint !== response.originalFingerprint) status = "MODIFIEE";
      else if (response.currentRow !== response.originalRow) status = "DEPLACEE";
      else status = "CONNUE";
      seen[response.responseId] = true;
      return { responseId: response.responseId, status: status };
    });
  }

  function matchOne_(subject, candidates) {
    var matches = candidates.filter(function (candidate) {
      return normalizeText_(candidate.lastName) === normalizeText_(subject.lastName) &&
        normalizeText_(candidate.firstName) === normalizeText_(subject.firstName) &&
        normalizeText_(candidate.birthDate) === normalizeText_(subject.birthDate);
    });
    if (!matches.length) return { decision: "ABSENT", ids: [] };
    if (matches.length > 1) return { decision: "AMBIGU", ids: matches.map(function (c) { return c.id; }).sort() };
    return {
      decision: normalizeText_(matches[0].email) === normalizeText_(subject.email) ? "CERTAIN" : "PROBABLE",
      ids: [matches[0].id]
    };
  }

  function matchBatch_(input) {
    return input.subjects.map(function (subject) { return matchOne_(subject, input.candidates); });
  }

  function buildGuardians_(input) {
    var guardiansByKey = {};
    var next = 0;
    var links = [];
    input.minors.forEach(function (minor) {
      minor.guardians.forEach(function (guardian) {
        var key = normalizeText_(guardian.email);
        if (!guardiansByKey[key]) {
          next += 1;
          guardiansByKey[key] = { id: "RSP-" + ("000000" + next).slice(-6), email: key };
        }
        links.push({ minorId: minor.id, guardianId: guardiansByKey[key].id });
      });
    });
    return {
      guardians: Object.keys(guardiansByKey).sort().map(function (key) { return guardiansByKey[key]; }),
      links: links
    };
  }

  function formatId_(request, number) {
    var suffix = ("000000" + number).slice(-6);
    return request.type === "LIC" || request.type === "RSP" ? request.type + "-" + suffix : request.type + "-" + request.year + "-" + suffix;
  }

  function allocate_(input) {
    var counters = clone_(input.counters || {});
    var issued = {};
    var lockOrder = [];
    (input.issuedIds || []).forEach(function (id) { issued[id] = true; });
    var ids = input.requests.map(function (request) {
      lockOrder.push(request.worker);
      var scope = request.type + "|" + (request.year || "GLOBAL") + "|" + (request.importType || "GLOBAL");
      var candidate;
      do {
        counters[scope] = (counters[scope] || 0) + 1;
        candidate = formatId_(request, counters[scope]);
      } while (issued[candidate]);
      issued[candidate] = true;
      return candidate;
    });
    return {
      ids: ids,
      counters: counters,
      unique: Object.keys(issued).length === (input.issuedIds || []).length + ids.length,
      lockOrder: lockOrder
    };
  }

  function replay_(input) {
    var commands = {};
    var completed = {};
    var outcomes = input.commands.map(function (command) {
      var serialized = AKS.Inscriptions.GoldSupport.stableStringify(command.payload);
      if (!commands[command.key]) {
        commands[command.key] = serialized;
        if (command.interruptAfterPrepare) return "INTERROMPUE";
        completed[command.key] = true;
        return "APPLIQUEE";
      }
      if (commands[command.key] !== serialized) return "CONFLIT";
      if (!completed[command.key]) { completed[command.key] = true; return "REPRISE"; }
      return "REJOUEE";
    });
    return { outcomes: outcomes, uniqueCommands: Object.keys(commands).length, completedCommands: Object.keys(completed).length };
  }

  function transitionAxis_(initial, targets, allowed) {
    var state = initial;
    var accepted = [];
    targets.forEach(function (target) {
      if ((allowed[state] || []).indexOf(target) === -1) accepted.push(false);
      else { state = target; accepted.push(true); }
    });
    return { finalState: state, accepted: accepted };
  }

  function transitions_(input) {
    var rules = {
      reception: { RECUE: ["A_EVALUER"], A_EVALUER: ["VALIDEE", "REJETEE"], VALIDEE: [], REJETEE: [] },
      verification: { A_EVALUER: ["VERIFIEE", "A_CORRIGER"], A_CORRIGER: ["A_EVALUER"], VERIFIEE: [] },
      preparation: { NON_PREPARE: ["EN_PREPARATION"], EN_PREPARATION: ["PRET"], PRET: [] },
      activation: { INACTIF: ["ACTIF"], ACTIF: ["SUSPENDU"], SUSPENDU: ["ACTIF", "INACTIF"] }
    };
    var output = {};
    Object.keys(input.axes).forEach(function (axis) {
      output[axis] = transitionAxis_(input.axes[axis].initial, input.axes[axis].targets, rules[axis]);
    });
    return output;
  }

  function accessGate_(input, dependencies) {
    var access = dependencies.authorize(input.capability);
    if (!access.allowed) return { status: "PARTIEL", output: { decision: "REFUSE", repositoryReads: dependencies.repository.readCount(), missingCapabilities: input.missingCapabilities } };
    dependencies.repository.read();
    return { status: "REUSSI", output: { decision: "AUTORISE", repositoryReads: dependencies.repository.readCount(), missingCapabilities: [] } };
  }

  function auditedCommand_(input, dependencies) {
    dependencies.repository.prepare(input.command);
    if (!dependencies.audit.append(input.auditEvent)) {
      dependencies.repository.rollback();
      return { committed: dependencies.repository.committed(), reported: "AUDIT_REQUIRED" };
    }
    dependencies.repository.commit();
    return { committed: dependencies.repository.committed(), reported: "OK" };
  }

  function prerequisite_(input) {
    var missing = input.required.filter(function (name) { return input.available.indexOf(name) === -1; });
    return { ready: missing.length === 0, missing: missing };
  }

  function qsLink_(input) {
    return { reference: input.reference, administrativeResult: input.administrativeResult, medicalAnswersPresent: Object.prototype.hasOwnProperty.call(input, "medicalAnswers") };
  }

  function restoreMemory_(input) {
    var repository = clone_(input.before);
    var snapshot = clone_(repository);
    repository.records = clone_(input.attemptedRecords);
    if (input.failAfterWrite) repository = snapshot;
    return { restored: AKS.Inscriptions.GoldSupport.compare(input.before, repository).length === 0, final: repository, googleRestore: "NON_EXECUTEE" };
  }

  function defaultDependencies_(input) {
    var readCount = 0;
    var staged = false;
    var committed = false;
    return {
      authorize: function () { return { allowed: input && input.accessAllowed === true }; },
      repository: {
        read: function () { readCount += 1; },
        readCount: function () { return readCount; },
        prepare: function () { staged = true; },
        rollback: function () { staged = false; },
        commit: function () { if (staged) committed = true; },
        committed: function () { return committed; }
      },
      audit: { append: function () { return input && input.auditSucceeds === true; } }
    };
  }

  function execute(dataset, dependencies) {
    var deps = dependencies || defaultDependencies_(dataset.input);
    var output;
    var status = "REUSSI";
    switch (dataset.operation) {
      case "CREATE_DOSSIER": output = createDossier_(dataset.input); break;
      case "ADAPT_FORM": output = adaptForm_(dataset.input); break;
      case "NORMALIZE_VALUES": output = normalizeValues_(dataset.input); break;
      case "DETECT_RESPONSES": output = responseChanges_(dataset.input); break;
      case "MATCH_BATCH": output = matchBatch_(dataset.input); break;
      case "BUILD_GUARDIANS": output = buildGuardians_(dataset.input); break;
      case "ALLOCATE": output = allocate_(dataset.input); break;
      case "IDEMPOTENCY": output = replay_(dataset.input); break;
      case "TRANSITIONS": output = transitions_(dataset.input); break;
      case "ACCESS_GATE": return accessGate_(dataset.input, deps);
      case "AUDITED_COMMAND": output = auditedCommand_(dataset.input, deps); break;
      case "CHECK_PREREQUISITES":
        output = prerequisite_(dataset.input);
        status = output.ready ? "REUSSI" : "BLOQUE";
        break;
      case "QS_LINK": output = qsLink_(dataset.input); break;
      case "RESTORE_MEMORY":
        output = restoreMemory_(dataset.input);
        status = "PARTIEL";
        break;
      default: throw new Error("OPERATION_INCONNUE");
    }
    return { status: status, output: output };
  }

  function run(datasets) {
    var details = datasets.map(function (dataset) {
      var actual = execute(dataset);
      return { id: dataset.id, status: actual.status, differences: AKS.Inscriptions.GoldSupport.compare(dataset.expected, actual) };
    });
    var counts = { REUSSI: 0, PARTIEL: 0, BLOQUE: 0, ECHEC: 0 };
    details.forEach(function (detail) {
      if (detail.differences.length) counts.ECHEC += 1;
      else counts[detail.status] += 1;
    });
    return AKS.Inscriptions.GoldSupport.deepFreeze({ counts: counts, details: details });
  }

  return Object.freeze({ ABSENT: ABSENT, execute: execute, run: run });
};

AKS.Inscriptions.ReadOnlyEngine = AKS.Inscriptions.createReadOnlyEngine();
