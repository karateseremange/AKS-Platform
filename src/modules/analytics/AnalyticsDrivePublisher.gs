var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Publie un lot PDF Analytics complet dans une arborescence Drive contrôlée.
 * Le dossier racine est toujours résolu par ID. Les services externes sont
 * injectables afin que la suite unitaire n'écrive jamais dans Drive.
 */
AKS.Analytics.DrivePublisher = (function () {
  "use strict";

  var RULE_VERSION = "analytics-drive-publication/1.0.0";
  var ROOT_PROPERTY = "analytics.driveRootFolderId";
  var TEST_ROOT_PROPERTY = "ANALYTICS_DRIVE_TEST_ROOT_FOLDER_ID";
  var PDF_MIME = "application/pdf";
  function requiredDocuments_(season) {
    return Number(season.slice(0, 4)) >= 2026 ? 6 : 5;
  }

  function error_(code, message, cause) {
    var error = new Error(message);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

  function freeze_(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) {
      if (key !== "blob") freeze_(value[key]);
    });
    return Object.freeze(value);
  }

  function defaultClock_() { return new Date(); }
  function defaultId_() { return Utilities.getUuid(); }
  function timestamp_(date) {
    return Utilities.formatDate(date, "UTC", "yyyy-MM-dd_HHmmss_SSS'Z'");
  }

  function defaultAdapter_() {
    function array_(iterator) {
      var values = [];
      while (iterator.hasNext()) values.push(iterator.next());
      return values;
    }
    return {
      getFolderById: function (id) { return DriveApp.getFolderById(id); },
      childFolders: function (folder, name) {
        return array_(folder.getFoldersByName(name));
      },
      createFolder: function (folder, name) { return folder.createFolder(name); },
      createFile: function (folder, blob) { return folder.createFile(blob); },
      files: function (folder) { return array_(folder.getFiles()); },
      id: function (resource) { return resource.getId(); },
      name: function (resource) { return resource.getName(); },
      url: function (resource) { return resource.getUrl(); },
      mime: function (file) { return file.getMimeType(); },
      size: function (file) { return file.getSize(); },
      renameFolder: function (folder, name) { folder.setName(name); },
      moveFolder: function (folder, parent) { folder.moveTo(parent); },
      trashFolder: function (folder) { folder.setTrashed(true); }
    };
  }

  function property_(key) {
    var serialized = PropertiesService.getScriptProperties().getProperty(
      "AKS_CONFIG_VALUE." + key);
    if (!serialized) return null;
    try {
      var record = JSON.parse(serialized);
      return record && record.value;
    } catch (failure) {
      throw error_("ANALYTICS_DRIVE_ROOT_CONFIG_INVALID",
        "La configuration du dossier racine Analytics est illisible.", failure);
    }
  }

  function requiredString_(value, code, message) {
    var normalized = String(value || "").trim();
    if (!normalized) throw error_(code, message);
    return normalized;
  }

  function validate_(bundle) {
    if (!bundle || !Array.isArray(bundle.documents)) {
      throw error_("ANALYTICS_DRIVE_INPUT_INVALID", "Un lot PDF valide est obligatoire.");
    }
    var season = requiredString_(bundle.season, "ANALYTICS_DRIVE_SEASON_REQUIRED",
      "La saison du lot PDF est obligatoire.");
    if (!/^\d{4}-\d{4}$/.test(season) ||
        Number(season.slice(5)) !== Number(season.slice(0, 4)) + 1) {
      throw error_("ANALYTICS_DRIVE_SEASON_INVALID",
        "La saison doit respecter le format AAAA-AAAA avec deux années consécutives.");
    }
    if (bundle.documents.length !== requiredDocuments_(season)) {
      throw error_("ANALYTICS_DRIVE_BATCH_INCOMPLETE",
        "Le nombre de rapports PDF ne correspond pas au périmètre de la saison.");
    }
    var names = Object.create(null);
    bundle.documents.forEach(function (document, index) {
      if (!document || document.mime_type !== PDF_MIME || !document.blob ||
          typeof document.size_bytes !== "number" || document.size_bytes <= 4 ||
          !/\.pdf$/i.test(String(document.file_name || ""))) {
        throw error_("ANALYTICS_DRIVE_DOCUMENT_INVALID",
          "Le rapport PDF à la position " + index + " est invalide.");
      }
      if (document.season && document.season !== season) {
        throw error_("ANALYTICS_DRIVE_SEASON_MISMATCH",
          "Le rapport " + document.report_code + " ne correspond pas à la saison du lot.");
      }
      if (names[document.file_name]) {
        throw error_("ANALYTICS_DRIVE_DUPLICATE_FILE",
          "Le nom de fichier PDF est dupliqué : " + document.file_name);
      }
      names[document.file_name] = true;
    });
    return season;
  }

  function oneChild_(adapter, parent, name, create) {
    var matches = adapter.childFolders(parent, name);
    if (matches.length > 1) {
      throw error_("ANALYTICS_DRIVE_FOLDER_COLLISION",
        "Plusieurs dossiers portent le nom contrôlé : " + name);
    }
    return matches[0] || (create ? adapter.createFolder(parent, name) : null);
  }

  function log_(logger, level, eventType, message, context) {
    if (!logger || typeof logger[level] !== "function") return;
    logger[level](message, {
      category: "integration",
      source: "AKS.Analytics.DrivePublisher",
      module: "analytics",
      eventType: eventType,
      outcome: context.outcome,
      reference: context.publicationId || null,
      context: context
    });
  }

  function validateCreatedFiles_(adapter, folder, expectedNames) {
    var files = adapter.files(folder);
    if (files.length !== expectedNames.length) {
      throw error_("ANALYTICS_DRIVE_STAGING_INCOMPLETE",
        "Le dossier de préparation ne contient pas tous les fichiers attendus.");
    }
    var actual = Object.create(null);
    files.forEach(function (file) {
      var name = adapter.name(file);
      if (actual[name] || expectedNames.indexOf(name) === -1 ||
          adapter.mime(file) !== PDF_MIME || adapter.size(file) <= 4) {
        throw error_("ANALYTICS_DRIVE_STAGING_INVALID",
          "Le contrôle du fichier préparé a échoué : " + name);
      }
      actual[name] = true;
    });
    return files;
  }

  function publish(bundle, options) {
    options = options || {};
    var season = validate_(bundle);
    var adapter = options.adapter || defaultAdapter_();
    var clock = options.clock || defaultClock_;
    var idProvider = options.id_provider || defaultId_;
    var logger = options.logger || (AKS && AKS.Logger);
    var rootId = requiredString_(
      options.root_folder_id || property_(ROOT_PROPERTY),
      "ANALYTICS_DRIVE_ROOT_ID_REQUIRED",
      "L'ID du dossier racine Analytics Drive est obligatoire."
    );
    var started = clock();
    var staging = null;
    var archived = null;
    var current = null;
    var seasonFolder = null;
    try {
      var root = adapter.getFolderById(rootId);
      var analytics = oneChild_(adapter, root, "Analytics", true);
      seasonFolder = oneChild_(adapter, analytics, season, true);
      var archives = oneChild_(adapter, seasonFolder, "Archives", true);
      current = oneChild_(adapter, seasonFolder, "Publication courante", false);
      var preparationName = ".preparation-" + timestamp_(started) + "-" + idProvider();
      staging = adapter.createFolder(seasonFolder, preparationName);
      var expectedNames = [];
      bundle.documents.forEach(function (document) {
        if (typeof document.blob.setName === "function") document.blob.setName(document.file_name);
        adapter.createFile(staging, document.blob);
        expectedNames.push(document.file_name);
      });
      var stagedFiles = validateCreatedFiles_(adapter, staging, expectedNames);

      if (current) {
        var archiveName = timestamp_(started);
        if (adapter.childFolders(archives, archiveName).length) {
          archiveName += "-" + idProvider();
        }
        try {
          adapter.renameFolder(current, archiveName);
          adapter.moveFolder(current, archives);
          archived = current;
        } catch (archiveFailure) {
          try {
            adapter.moveFolder(current, seasonFolder);
            adapter.renameFolder(current, "Publication courante");
          } catch (archiveRollbackFailure) {
            archiveFailure.rollbackError = archiveRollbackFailure;
          }
          throw archiveFailure;
        }
      }

      try {
        adapter.renameFolder(staging, "Publication courante");
      } catch (promotionFailure) {
        if (archived) {
          try {
            adapter.moveFolder(archived, seasonFolder);
            adapter.renameFolder(archived, "Publication courante");
          } catch (rollbackFailure) {
            promotionFailure.rollbackError = rollbackFailure;
          }
        }
        throw promotionFailure;
      }

      var publicationId = adapter.id(staging);
      var result = {
        rule_version: RULE_VERSION,
        season: season,
        published_at: started.toISOString(),
        root_folder_id: rootId,
        publication_folder_id: publicationId,
        publication_folder_url: adapter.url(staging),
        archived_publication_folder_id: archived ? adapter.id(archived) : null,
        document_count: stagedFiles.length,
        documents: stagedFiles.map(function (file) {
          var fileName = adapter.name(file);
          var source = bundle.documents.filter(function (document) {
            return document.file_name === fileName;
          })[0];
          return {
            report_code: source.report_code,
            file_name: fileName,
            file_id: adapter.id(file),
            file_url: adapter.url(file),
            mime_type: adapter.mime(file),
            size_bytes: adapter.size(file),
            source_html_fingerprint: source.source_html_fingerprint,
            source_versions: source.source_versions
          };
        })
      };
      log_(logger, "info", "analytics.drive.publication.completed",
        "Publication Analytics Drive terminée.", {
          outcome: "success", season: season, documentCount: result.document_count,
          publicationId: publicationId,
          archivedPublicationId: result.archived_publication_folder_id
        });
      return freeze_(result);
    } catch (failure) {
      if (staging) {
        try { adapter.trashFolder(staging); } catch (cleanupFailure) {
          failure.cleanupError = cleanupFailure;
        }
      }
      log_(logger, "error", "analytics.drive.publication.failed",
        "Publication Analytics Drive interrompue.", {
          outcome: "failure", season: season, documentCount: bundle.documents.length,
          publicationId: staging ? adapter.id(staging) : null,
          errorCode: failure.code || "ANALYTICS_DRIVE_PUBLICATION_FAILED"
        });
      if (failure && /^ANALYTICS_DRIVE_/.test(failure.code || "")) throw failure;
      throw error_("ANALYTICS_DRIVE_PUBLICATION_FAILED",
        "La publication Drive a échoué ; aucun lot incomplet n'a été promu.", failure);
    }
  }

  return Object.freeze({
    RULE_VERSION: RULE_VERSION,
    ROOT_PROPERTY: ROOT_PROPERTY,
    TEST_ROOT_PROPERTY: TEST_ROOT_PROPERTY,
    publish: publish
  });
}());
