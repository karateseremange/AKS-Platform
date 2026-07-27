function AKS_analyticsDrivePdfBundle_() {
  var bundle = AKS.Analytics.PdfReportConverter.convert(
    AKS_analyticsPdfHtmlBundle_(),
    { converter: AKS_analyticsPdfFakeConverter_([]) }
  );
  return {
    season: "2025-2026",
    documents: bundle.documents.map(function (document) {
      var historicalDocument = {};
      Object.keys(document).forEach(function (key) {
        historicalDocument[key] = document[key];
      });
      historicalDocument.season = "2025-2026";
      return historicalDocument;
    })
  };
}

function AKS_analyticsDriveFakeAdapter_(options) {
  options = options || {};
  var serial = 0;
  function resource_(name, kind, parent) {
    serial += 1;
    return {
      id: kind + "-" + serial,
      name: name,
      kind: kind,
      parent: parent || null,
      folders: [],
      files: [],
      trashed: false,
      mime: kind === "file" ? "application/pdf" : null,
      size: kind === "file" ? 10 : null
    };
  }
  var root = resource_("Racine de test", "folder", null);
  var calls = [];
  var adapter = {
    root: root,
    calls: calls,
    getFolderById: function (id) {
      calls.push(["getFolderById", id]);
      if (id !== root.id) throw new Error("Folder not found");
      return root;
    },
    childFolders: function (folder, name) {
      return folder.folders.filter(function (child) {
        return !child.trashed && child.name === name;
      });
    },
    createFolder: function (folder, name) {
      var child = resource_(name, "folder", folder);
      folder.folders.push(child);
      calls.push(["createFolder", name]);
      return child;
    },
    createFile: function (folder, blob) {
      if (options.failCreateAt === folder.files.length) throw new Error("create failed");
      var file = resource_(blob.getName(), "file", folder);
      folder.files.push(file);
      calls.push(["createFile", file.name]);
      return file;
    },
    files: function (folder) { return folder.files.filter(function (file) { return !file.trashed; }); },
    id: function (resource) { return resource.id; },
    name: function (resource) { return resource.name; },
    url: function (resource) { return "https://drive.test/" + resource.id; },
    mime: function (file) { return options.invalidMime ? "text/plain" : file.mime; },
    size: function (file) { return file.size; },
    renameFolder: function (folder, name) {
      if (options.failPromotion && name === "Publication courante" &&
          folder.name.indexOf(".preparation-") === 0) throw new Error("promotion failed");
      folder.name = name;
    },
    moveFolder: function (folder, parent) {
      if (folder.parent) {
        folder.parent.folders = folder.parent.folders.filter(function (item) { return item !== folder; });
      }
      parent.folders.push(folder);
      folder.parent = parent;
    },
    trashFolder: function (folder) { folder.trashed = true; }
  };
  return adapter;
}

function AKS_analyticsDrivePublish_(adapter, bundle, logger) {
  return AKS.Analytics.DrivePublisher.publish(bundle || AKS_analyticsDrivePdfBundle_(), {
    root_folder_id: adapter.root.id,
    adapter: adapter,
    clock: function () { return new Date("2026-07-27T21:55:00.000Z"); },
    id_provider: function () { return "test-id"; },
    logger: logger || null
  });
}

function AKS_analyticsDriveSeasonFolder_(adapter) {
  return adapter.root.folders[0].folders[0];
}

function AKS_testAnalyticsDrive_requiresConfiguredRootId_() {
  assertThrows_(function () {
    AKS.Analytics.DrivePublisher.publish(AKS_analyticsDrivePdfBundle_(), {
      root_folder_id: "", adapter: AKS_analyticsDriveFakeAdapter_()
    });
  }, "ANALYTICS_DRIVE_ROOT_ID_REQUIRED");
}

function AKS_testAnalyticsDrive_rejectsInvalidSeasonBeforeWrite_() {
  var adapter = AKS_analyticsDriveFakeAdapter_();
  var bundle = AKS_analyticsDrivePdfBundle_();
  bundle = { season: "2025/2026", documents: bundle.documents };
  assertThrows_(function () { AKS_analyticsDrivePublish_(adapter, bundle); },
    "ANALYTICS_DRIVE_SEASON_INVALID");
  assertEquals_(0, adapter.calls.length);
}

function AKS_testAnalyticsDrive_rejectsIncompleteBatchBeforeWrite_() {
  var adapter = AKS_analyticsDriveFakeAdapter_();
  var bundle = AKS_analyticsDrivePdfBundle_();
  bundle = { season: bundle.season, documents: bundle.documents.slice(0, 4) };
  assertThrows_(function () { AKS_analyticsDrivePublish_(adapter, bundle); },
    "ANALYTICS_DRIVE_BATCH_INCOMPLETE");
  assertEquals_(0, adapter.calls.length);
}

function AKS_testAnalyticsDrive_createsControlledSeasonTree_() {
  var adapter = AKS_analyticsDriveFakeAdapter_();
  var result = AKS_analyticsDrivePublish_(adapter);
  assertEquals_(5, result.document_count);
  assertEquals_("Analytics", adapter.root.folders[0].name);
  var season = AKS_analyticsDriveSeasonFolder_(adapter);
  assertEquals_(result.season, season.name);
  assertEquals_(1, adapter.childFolders(season, "Publication courante").length);
  assertEquals_(1, adapter.childFolders(season, "Archives").length);
}

function AKS_testAnalyticsDrive_exposesIdsUrlsAndSourceTrace_() {
  var adapter = AKS_analyticsDriveFakeAdapter_();
  var bundle = AKS_analyticsDrivePdfBundle_();
  var result = AKS_analyticsDrivePublish_(adapter, bundle);
  assertTrue_(result.publication_folder_id.indexOf("folder-") === 0);
  assertTrue_(result.publication_folder_url.indexOf("https://drive.test/") === 0);
  assertEquals_(bundle.documents[0].source_html_fingerprint,
    result.documents[0].source_html_fingerprint);
  assertTrue_(!!result.documents[0].file_id && !!result.documents[0].file_url);
}

function AKS_testAnalyticsDrive_archivesPreviousPublication_() {
  var adapter = AKS_analyticsDriveFakeAdapter_();
  var first = AKS_analyticsDrivePublish_(adapter);
  var second = AKS_analyticsDrivePublish_(adapter);
  var season = AKS_analyticsDriveSeasonFolder_(adapter);
  var archives = adapter.childFolders(season, "Archives")[0];
  assertEquals_(1, archives.folders.length);
  assertEquals_(first.publication_folder_id, second.archived_publication_folder_id);
  assertEquals_(1, adapter.childFolders(season, "Publication courante").length);
}

function AKS_testAnalyticsDrive_trashesPreparationOnPartialFailure_() {
  var adapter = AKS_analyticsDriveFakeAdapter_({ failCreateAt: 2 });
  assertThrows_(function () { AKS_analyticsDrivePublish_(adapter); },
    "ANALYTICS_DRIVE_PUBLICATION_FAILED");
  var season = AKS_analyticsDriveSeasonFolder_(adapter);
  assertEquals_(0, adapter.childFolders(season, "Publication courante").length);
  assertTrue_(season.folders.some(function (folder) { return folder.trashed; }));
}

function AKS_testAnalyticsDrive_restoresCurrentWhenPromotionFails_() {
  var adapter = AKS_analyticsDriveFakeAdapter_();
  var first = AKS_analyticsDrivePublish_(adapter);
  adapter.failPromotion = true;
  var originalRename = adapter.renameFolder;
  adapter.renameFolder = function (folder, name) {
    if (name === "Publication courante" && folder.id !== first.publication_folder_id) {
      throw new Error("promotion failed");
    }
    originalRename(folder, name);
  };
  assertThrows_(function () { AKS_analyticsDrivePublish_(adapter); },
    "ANALYTICS_DRIVE_PUBLICATION_FAILED");
  var current = adapter.childFolders(AKS_analyticsDriveSeasonFolder_(adapter),
    "Publication courante");
  assertEquals_(1, current.length);
  assertEquals_(first.publication_folder_id, current[0].id);
}

function AKS_testAnalyticsDrive_detectsControlledFolderCollision_() {
  var adapter = AKS_analyticsDriveFakeAdapter_();
  adapter.createFolder(adapter.root, "Analytics");
  adapter.createFolder(adapter.root, "Analytics");
  assertThrows_(function () { AKS_analyticsDrivePublish_(adapter); },
    "ANALYTICS_DRIVE_FOLDER_COLLISION");
}

function AKS_testAnalyticsDrive_logsOnlyPublicationMetadata_() {
  var adapter = AKS_analyticsDriveFakeAdapter_();
  var events = [];
  var logger = {
    info: function (message, context) { events.push({ message: message, context: context }); },
    error: function () {}
  };
  AKS_analyticsDrivePublish_(adapter, null, logger);
  var serialized = JSON.stringify(events);
  assertEquals_(1, events.length);
  assertTrue_(serialized.indexOf("documentCount") > -1);
  assertTrue_(serialized.indexOf("<!doctype") === -1);
  assertTrue_(serialized.indexOf("blob") === -1);
}

function AKS_runAnalyticsDrivePublisherSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — publication Drive", [
    { name: "ANALYTICS / Drive racine par ID", test: AKS_testAnalyticsDrive_requiresConfiguredRootId_ },
    { name: "ANALYTICS / Drive saison valide", test: AKS_testAnalyticsDrive_rejectsInvalidSeasonBeforeWrite_ },
    { name: "ANALYTICS / Drive lot complet", test: AKS_testAnalyticsDrive_rejectsIncompleteBatchBeforeWrite_ },
    { name: "ANALYTICS / Drive arborescence", test: AKS_testAnalyticsDrive_createsControlledSeasonTree_ },
    { name: "ANALYTICS / Drive traçabilité", test: AKS_testAnalyticsDrive_exposesIdsUrlsAndSourceTrace_ },
    { name: "ANALYTICS / Drive archivage", test: AKS_testAnalyticsDrive_archivesPreviousPublication_ },
    { name: "ANALYTICS / Drive échec partiel", test: AKS_testAnalyticsDrive_trashesPreparationOnPartialFailure_ },
    { name: "ANALYTICS / Drive restauration", test: AKS_testAnalyticsDrive_restoresCurrentWhenPromotionFails_ },
    { name: "ANALYTICS / Drive collision", test: AKS_testAnalyticsDrive_detectsControlledFolderCollision_ },
    { name: "ANALYTICS / Drive journalisation", test: AKS_testAnalyticsDrive_logsOnlyPublicationMetadata_ }
  ]);
}

/**
 * Test explicite : crée son propre bac à sable sous la racine de test puis le
 * place à la corbeille. Il refuse la racine Analytics réelle.
 */
function AKS_runAnalyticsDriveIntegrationSuite() {
  return AKS_runNamedTestSuite_("AKS Analytics — intégration Drive", [{
    name: "ANALYTICS / publication Drive isolée et nettoyage",
    test: function () {
      var properties = PropertiesService.getScriptProperties();
      var testRootId = String(properties.getProperty(
        AKS.Analytics.DrivePublisher.TEST_ROOT_PROPERTY) || "").trim();
      var realRootRecord = properties.getProperty(
        "AKS_CONFIG_VALUE." + AKS.Analytics.DrivePublisher.ROOT_PROPERTY);
      var realRootId = "";
      if (realRootRecord) {
        try { realRootId = String(JSON.parse(realRootRecord).value || "").trim(); }
        catch (failure) { throw new Error("La configuration Analytics réelle est illisible."); }
      }
      assertTrue_(!!testRootId, "La propriété ANALYTICS_DRIVE_TEST_ROOT_FOLDER_ID est obligatoire.");
      assertTrue_(testRootId !== realRootId,
        "La racine de test doit être distincte de la racine Analytics réelle.");
      var testRoot = DriveApp.getFolderById(testRootId);
      var sandbox = testRoot.createFolder(
        "AKS-Analytics-Drive-Test-" + Utilities.getUuid());
      try {
        var pdfBundle = AKS.Analytics.PdfReportConverter.convert(
          AKS_analyticsPdfHtmlBundle_());
        var result = AKS.Analytics.DrivePublisher.publish(pdfBundle, {
          root_folder_id: sandbox.getId()
        });
        assertEquals_(5, result.document_count);
        var files = DriveApp.getFolderById(result.publication_folder_id).getFiles();
        var count = 0;
        while (files.hasNext()) { files.next(); count += 1; }
        assertEquals_(5, count);
        assertTrue_(result.root_folder_id === sandbox.getId());
      } finally {
        sandbox.setTrashed(true);
      }
    }
  }]);
}
