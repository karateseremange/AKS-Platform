function validateRequired_(value, code, message) {
  if (value === null || typeof value === "undefined") {
    throw new AKS.Core.Exception(code, message);
  }
}

function requireText_(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AKS.Core.Exception(
      "HEALTH_FIELD_REQUIRED",
      fieldName + " is required."
    );
  }

  return value.trim();
}

function normalizeDate_(value) {
  if (value === null || typeof value === "undefined" || value === "") {
    return null;
  }

  var date = value instanceof Date ? value : new Date(value);

  if (isNaN(date.getTime())) {
    throw new AKS.Core.Exception(
      "HEALTH_DATE_INVALID",
      "Invalid date value."
    );
  }

  return date;
}
