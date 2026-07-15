const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../aks-platform-connector");
const php = fs.readFileSync(path.join(root, "aks-platform-connector.php"), "utf8");
const js = fs.readFileSync(path.join(root, "assets/questionnaire.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets/questionnaire.css"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(php.includes("Version: 0.11.0"), "Plugin version is incorrect.");
assert(php.includes("aks_health_questionnaire"), "Shortcode is missing.");
assert(php.includes("aks_health_questionnaire_page"), "Professional page shortcode is missing.");
assert(php.includes('href="#aks-questionnaire"'), "Questionnaire anchor is missing.");
assert(php.includes("Vos réponses restent confidentielles"), "Privacy notice is missing.");
assert(php.includes("contact@karate-seremange.fr"), "Support address is missing.");
assert(php.includes("wp_create_nonce('wp_rest')"), "REST nonce is missing.");
assert(php.includes("aks_rate_"), "Rate limiting is missing.");
assert(!php.includes("update_option("), "Business data must not use options.");
assert(!php.includes("$wpdb"), "Plugin must not write to the database directly.");
assert(js.includes('api("context"'), "Context request is missing.");
assert(js.includes('api("prepare"'), "Prepare request is missing.");
assert(js.includes('api("submit"'), "Submit request is missing.");
assert(js.includes("input.checked = false"), "Transient answers are not cleared.");
assert(js.includes("exactDate"), "Exact birth date validation is missing.");
assert(js.includes("data-next disabled"), "Identity button must start disabled.");
assert(js.includes("Veuillez saisir une date de naissance valide."), "Birth date error is missing.");
assert(css.includes(".aks-hq"), "Scoped stylesheet is missing.");
assert(css.includes(".aks-entry"), "Professional page stylesheet is missing.");
assert(css.includes("@media (max-width: 620px)"), "Mobile layout is missing.");

console.log(JSON.stringify({ ok: true, feature: "HQ-010", passed: 20, total: 20 }));
