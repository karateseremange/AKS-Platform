/**
 * Public Google Apps Script entry point.
 *
 * @returns {Object}
 */
function AKS_start() {
  return AKS.Core.Application.start();
}

/**
 * Public Google Apps Script installation entry point.
 *
 * @returns {Object}
 */
function AKS_install() {
  return AKS.Core.Application.install();
}

/**
 * Google Sheets trigger entry point.
 */
function onOpen() {
  AKS.Core.Application.open();
}
