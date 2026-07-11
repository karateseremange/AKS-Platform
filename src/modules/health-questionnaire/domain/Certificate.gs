var AKS = AKS || {};
AKS.Modules = AKS.Modules || {};
AKS.Modules.HealthQuestionnaire =
  AKS.Modules.HealthQuestionnaire || {};

/**
 * Creates an immutable medical certificate reference.
 *
 * @param {Object} data
 * @returns {Object}
 */
AKS.Modules.HealthQuestionnaire.Certificate = function (data) {
  validateRequired_(
    data,
    "HEALTH_CERTIFICATE_REQUIRED",
    "Certificate data is required."
  );

  var id = requireText_(data.id, "Certificate id");
  var participantId = requireText_(
    data.participantId,
    "Participant id"
  );

  return Object.freeze({
    id: id,
    participantId: participantId,
    issuedAt: normalizeDate_(data.issuedAt),
    expiresAt: normalizeDate_(data.expiresAt),
    documentId: data.documentId || null,
    status: data.status || "PENDING"
  });
};
