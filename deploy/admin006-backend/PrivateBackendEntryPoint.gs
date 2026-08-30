/**
 * Dedicated ADMIN-006 backend Web App entry point.
 * This file is excluded from the portal package.
 */
function doPost(event) {
  return ContentService
    .createTextOutput(AKS_handlePrivateBackendPost_(event))
    .setMimeType(ContentService.MimeType.JSON);
}
