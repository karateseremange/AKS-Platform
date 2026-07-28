var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * Convertit à la demande un lot complet de rapports HTML Analytics en blobs PDF.
 * Aucun fichier Drive n'est créé. Les valeurs métier et le HTML source ne sont
 * jamais modifiés.
 */
AKS.Analytics.PdfReportConverter = (function () {
  "use strict";

  var RULE_VERSION = "analytics-pdf-report/1.0.0";
  var MIME_TYPE = "application/pdf";
  var DEFAULT_MAX_DOCUMENTS = 5;

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

  function assertBundle_(bundle) {
    if (!bundle || !Array.isArray(bundle.documents)) {
      throw error_("ANALYTICS_PDF_INPUT_INVALID", "Un lot de rapports HTML valide est obligatoire.");
    }
  }

  function assertQuota_(documentCount, maxDocuments) {
    if (typeof maxDocuments !== "number" || maxDocuments < 1 ||
        Math.floor(maxDocuments) !== maxDocuments) {
      throw error_("ANALYTICS_PDF_QUOTA_POLICY_INVALID",
        "La limite de conversions PDF doit être un entier strictement positif.");
    }
    if (documentCount > maxDocuments) {
      throw error_("ANALYTICS_PDF_BATCH_LIMIT_EXCEEDED",
        "Le lot contient " + documentCount + " rapports ; la limite autorisée est " +
        maxDocuments + ". Aucune conversion n'a été lancée.");
    }
  }

  function pdfName_(htmlName) {
    var name = String(htmlName || "aks-analytics-rapport.html");
    return (/\.html?$/i.test(name) ? name.replace(/\.html?$/i, "") : name) + ".pdf";
  }

  function defaultConvert_(document) {
    return HtmlService.createHtmlOutput(document.html)
      .getBlob()
      .getAs(MimeType.PDF)
      .setName(pdfName_(document.file_name));
  }

  function bytes_(blob) {
    if (!blob || typeof blob.getBytes !== "function") return [];
    return blob.getBytes();
  }

  function hasPdfSignature_(bytes) {
    return bytes.length >= 4 &&
      (bytes[0] & 255) === 37 && (bytes[1] & 255) === 80 &&
      (bytes[2] & 255) === 68 && (bytes[3] & 255) === 70;
  }

  function validateBlob_(blob, document) {
    var bytes = bytes_(blob);
    var mimeType = blob && typeof blob.getContentType === "function" ?
      blob.getContentType() : "";
    if (mimeType !== MIME_TYPE) {
      throw error_("ANALYTICS_PDF_INVALID_MIME",
        "Le rapport " + document.report_code + " n'est pas un blob PDF.");
    }
    if (!hasPdfSignature_(bytes)) {
      throw error_("ANALYTICS_PDF_INVALID_CONTENT",
        "Le rapport " + document.report_code + " ne possède pas une signature PDF valide.");
    }
    return bytes.length;
  }

  function isQuotaError_(failure) {
    var message = failure && failure.message ? failure.message : String(failure);
    return /quota|too many times|limit exceeded|service invoked/i.test(message);
  }

  function convert(bundle, options) {
    assertBundle_(bundle);
    options = options || {};
    var maxDocuments = options.max_documents === undefined ?
      DEFAULT_MAX_DOCUMENTS : options.max_documents;
    var converter = options.converter || defaultConvert_;
    assertQuota_(bundle.documents.length, maxDocuments);
    if (typeof converter !== "function") {
      throw error_("ANALYTICS_PDF_CONVERTER_INVALID", "Le convertisseur PDF doit être une fonction.");
    }

    var converted = [];
    bundle.documents.forEach(function (document, index) {
      if (!document || document.mime_type !== "text/html" || typeof document.html !== "string") {
        throw error_("ANALYTICS_PDF_DOCUMENT_INVALID",
          "Le rapport HTML à la position " + index + " est invalide.");
      }
      try {
        var blob = converter(document);
        var size = validateBlob_(blob, document);
        if (typeof blob.setName === "function") blob.setName(pdfName_(document.file_name));
        converted.push({
          report_code: document.report_code,
          report_type: document.report_type,
          state: document.state,
          season: document.season,
          course: document.course,
          file_name: pdfName_(document.file_name),
          mime_type: MIME_TYPE,
          source_versions: document.source_versions,
          source_html_fingerprint: document.fingerprint,
          size_bytes: size,
          blob: blob
        });
      } catch (failure) {
        if (failure && /^ANALYTICS_PDF_/.test(failure.code || "")) throw failure;
        var code = isQuotaError_(failure) ?
          "ANALYTICS_PDF_QUOTA_EXCEEDED" : "ANALYTICS_PDF_CONVERSION_FAILED";
        throw error_(code,
          "Conversion PDF impossible pour le rapport " + document.report_code +
          " (position " + index + "). Aucun lot complet n'est disponible.", failure);
      }
    });

    return freeze_({
      rule_version: RULE_VERSION,
      season: bundle.season || "",
      mime_type: MIME_TYPE,
      source_html_rule_version: bundle.rule_version || null,
      document_count: converted.length,
      documents: converted
    });
  }

  return Object.freeze({
    RULE_VERSION: RULE_VERSION,
    MIME_TYPE: MIME_TYPE,
    DEFAULT_MAX_DOCUMENTS: DEFAULT_MAX_DOCUMENTS,
    convert: convert
  });
}());
