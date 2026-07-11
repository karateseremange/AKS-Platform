var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire = AKS.Modules.HealthQuestionnaire || {};

AKS.Modules.HealthQuestionnaire.InMemoryRepository = function () {
  var records = [];
  return Object.freeze({
    save: function (record) { records.push(record); return record; },
    list: function () { return records.slice(); },
    clear: function () { records = []; }
  });
};
