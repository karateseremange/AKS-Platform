var AKS = AKS || {};
AKS.Analytics = AKS.Analytics || {};

/**
 * ANALYTICS-SAISIE-003 mobile attendance page.
 * Authorization data is resolved server-side before the template is rendered.
 */
AKS.Analytics.AttendancePage = Object.freeze({
  render: function () {
    var viewModel = AKS_createAttendanceServerApi_().getAccessContext();
    var template = HtmlService.createTemplateFromFile(
      "ui/analytics/Attendance"
    );
    template.viewModel = viewModel;

    return template
      .evaluate()
      .setTitle("Présences — Association Karaté Serémange")
      .addMetaTag("viewport", "width=device-width, initial-scale=1");
  }
});

function AKS_includeAttendanceFile_(path) {
  return HtmlService.createHtmlOutputFromFile(path).getContent();
}
