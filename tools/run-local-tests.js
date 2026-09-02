#!/usr/bin/env node
/* Offline Apps Script simulation. No credentials, Google calls or network APIs. */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const cp = require("node:child_process");
const args = process.argv.slice(2);
const urlModes = ["valid", "empty", "null"];
const allowedArgs = ["--d4", "--recipe", "--url-matrix"].concat(urlModes.map(mode => "--web-app-url=" + mode));
if (args.some(arg => !allowedArgs.includes(arg)) || new Set(args).size !== args.length ||
    args.filter(arg => arg.startsWith("--web-app-url=")).length > 1) {
  throw new Error("Invalid offline test arguments");
}
if (args.includes("--url-matrix")) {
  if (args.includes("--recipe") || args.some(arg => arg.startsWith("--web-app-url="))) {
    throw new Error("The URL matrix already includes both project identities and every URL mode");
  }
  const runs = [];
  for (const recipe of [false, true]) for (const mode of urlModes) {
    const childArgs = [__filename, "--web-app-url=" + mode]
      .concat(recipe ? ["--recipe"] : [], args.includes("--d4") ? ["--d4"] : []);
    const child = cp.spawnSync(process.execPath, childArgs, {
      encoding: "utf8", shell: false, timeout: 120000, maxBuffer: 4 * 1024 * 1024
    });
    if (child.error || ![0, 1].includes(child.status)) throw new Error("Offline matrix child failed");
    const report = JSON.parse(child.stdout);
    if ((report.failed === 0) !== (child.status === 0)) throw new Error("Inconsistent offline child result");
    runs.push(report);
  }
  console.log(JSON.stringify({ environment: "offline Node URL/project matrix", node: process.version,
    generatedAt: new Date().toISOString(), scenarios: runs.length,
    failedScenarios: runs.filter(run => run.failed > 0).length, runs }, null, 2));
  process.exit(runs.some(run => run.failed > 0) ? 1 : 0);
}
const urlMode = (args.find(arg => arg.startsWith("--web-app-url=")) || "--web-app-url=valid").split("=")[1];
const projectMode = args.includes("--recipe") ? "RECETTE" : "UNRELATED";
const root = path.resolve(process.env.AKS_TEST_SOURCE || path.join(__dirname, "../src"));
const logs = [];
const blocked = name => () => { throw new Error("Offline service unavailable: " + name); };
const stores = {};
function propertyStore(name) {
  const values = stores[name] || (stores[name] = {});
  return {
    getProperty: key => Object.hasOwn(values, key) ? values[key] : null,
    getProperties: () => ({ ...values }),
    setProperty: (key, value) => { values[key] = String(value); },
    setProperties: entries => { Object.assign(values, entries); },
    deleteProperty: key => { delete values[key]; },
    deleteAllProperties: () => { Object.keys(values).forEach(key => delete values[key]); }
  };
}
function list(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? list(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
function output(content) {
  return { getContent: () => content, setTitle() { return this; },
    addMetaTag() { return this; }, setXFrameOptionsMode() { return this; },
    getBlob: blocked("HTML PDF conversion"), getAs: blocked("HTML PDF conversion") };
}
function escape(value) {
  return String(value ?? "").replace(/[&<>"']/g, char =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
let context;
function template(file) {
  const source = fs.readFileSync(path.join(root, file + ".html"), "utf8");
  return {
    getRawContent: () => source,
    evaluate() {
      let code = 'var __out = "";\n';
      let offset = 0;
      for (const match of source.matchAll(/<\?([!=]*)([\s\S]*?)\?>/g)) {
        code += "__out += " + JSON.stringify(source.slice(offset, match.index)) + ";\n";
        const expression = match[2].trim().replace(/;$/, "");
        code += match[1] === "=" ? "__out += __escape(" + expression + ");\n" :
          match[1] === "!=" ? "__out += (" + expression + ");\n" : match[2] + "\n";
        offset = match.index + match[0].length;
      }
      code += "__out += " + JSON.stringify(source.slice(offset)) + "; return __out;";
      const keys = Object.keys(this).filter(key => typeof this[key] !== "function");
      const fn = vm.runInContext("(function(" + keys.concat("__escape").join(",") + "){" + code + "})", context);
      return output(fn(...keys.map(key => this[key]), escape));
    }
  };
}
function formatDate(date, zone, pattern) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(date).map(part => [part.type, part.value]));
  const values = { yyyy: parts.year, MM: parts.month, dd: parts.day,
    HH: parts.hour, mm: parts.minute, ss: parts.second };
  return pattern.replace(/yyyy|MM|dd|HH|mm|ss/g, key => values[key]).replace(/'/g, "");
}
const signedBytes = buffer => Array.from(buffer, n => n > 127 ? n - 256 : n);
context = vm.createContext({
  console: { log: text => logs.push(String(text)), error: text => logs.push(String(text)),
    warn: text => logs.push(String(text)) }, Logger: { log: text => logs.push(String(text)) },
  Utilities: {
    getUuid: () => crypto.randomUUID(), formatDate,
    Charset: { UTF_8: "utf-8" }, DigestAlgorithm: { SHA_256: "sha256" },
    computeDigest: (algorithm, text) => signedBytes(crypto.createHash(algorithm).update(String(text)).digest()),
    computeHmacSha256Signature: (text, secret) => signedBytes(crypto.createHmac("sha256", secret).update(text).digest()),
    base64Encode: bytes => Buffer.from(bytes).toString("base64"),
    base64EncodeWebSafe: bytes => Buffer.from(bytes).toString("base64url"),
    newBlob: blocked("blob")
  },
  Session: { getActiveUser: () => ({ getEmail: () => "karate.seremange@gmail.com" }),
    getScriptTimeZone: () => "Europe/Paris" },
  ScriptApp: {
    getScriptId: () => projectMode === "RECETTE"
      ? "1quyIoxSMlxe6xpADPlxRxGikRF3OCTEid0-xhOHeSRZH0sU0AOeIRxs4" : "OFFLINE_UNRELATED_PROJECT",
    getService: () => ({ getUrl: () => {
      return urlMode === "null" ? null : urlMode === "empty" ? "" : "https://example.test/exec";
    } })
  },
  PropertiesService: { getScriptProperties: () => propertyStore("script"),
    getUserProperties: () => propertyStore("user"), getDocumentProperties: () => propertyStore("document") },
  HtmlService: { createTemplateFromFile: template,
    createHtmlOutputFromFile: file => output(fs.readFileSync(path.join(root, file + ".html"), "utf8")),
    createHtmlOutput: output, XFrameOptionsMode: { ALLOWALL: "ALLOWALL" } },
  UrlFetchApp: { fetch: blocked("UrlFetchApp"), fetchAll: blocked("UrlFetchApp") },
  SpreadsheetApp: { getActiveSpreadsheet: blocked("SpreadsheetApp"), openById: blocked("SpreadsheetApp") },
  DriveApp: { getFileById: blocked("DriveApp"), getFolderById: blocked("DriveApp") },
  LockService: { getScriptLock: () => {
    let held = false;
    return { tryLock: () => { if (held) return false; held = true; return true; },
      waitLock: () => { if (held) throw new Error("Offline lock held"); held = true; },
      hasLock: () => held, releaseLock: () => { held = false; } };
  } },
  MailApp: { sendEmail: blocked("MailApp") },
  MimeType: { PDF: "application/pdf", HTML: "text/html" }
});
const files = list(root).filter(file => /\.(gs|js)$/.test(file)).sort();
const source = files.map(file => fs.readFileSync(file, "utf8")).join("\n;\n");
vm.runInContext(source, context, { filename: "offline-apps-script.gs", timeout: 10000 });
const originalRunner = context.AKS_runNamedTestSuite_;
context.AKS_runNamedTestSuite_ = (name, tests) => ({ name, tests });
const inventory = context.AKS_runValidationSuiteV11();
context.AKS_runNamedTestSuite_ = originalRunner;
const unique = new Set(inventory.tests.map(test => test.test));
if (unique.size !== inventory.tests.length) throw new Error("Duplicate cumulative tests");
const mode = process.argv.includes("--d4") ? "D4-A" : "cumulative";
const tests = mode === "D4-A" ? inventory.tests.filter(test => test.test.name.startsWith("AKS_testAdmin006D4_")) : inventory.tests;
if (!tests.length) throw new Error("No tests selected");
const failures = [];
for (const test of tests) {
  try { test.test(); } catch (error) { failures.push({ name: test.name, error: error.message }); }
}
const digest = crypto.createHash("sha256");
const packageFiles = list(root).filter(file => /\.(gs|js|html)$/.test(file) || file === path.join(root, "appsscript.json"))
  .sort((a, b) => {
    const left = path.relative(root, a).split(path.sep).join("/");
    const right = path.relative(root, b).split(path.sep).join("/");
    return left < right ? -1 : left > right ? 1 : 0;
  });
for (const file of packageFiles) {
  digest.update(path.relative(root, file).split(path.sep).join("/") + "\0");
  digest.update(fs.readFileSync(file)); digest.update("\0");
}
const report = { mode, environment: "offline Node simulation", node: process.version,
  projectMode, webAppUrlMode: urlMode,
  generatedAt: new Date().toISOString(), sourceSha256: digest.digest("hex"), sourceFiles: files.length,
  packageFiles: packageFiles.length, digestScope: "src: gs, js, html and root appsscript.json; sorted POSIX paths and bytes separated by NUL",
  cumulativeInventory: inventory.tests.length, uniqueTests: unique.size,
  total: tests.length, passed: tests.length - failures.length, failed: failures.length, failures };
console.log(JSON.stringify(report, null, 2));
process.exitCode = failures.length ? 1 : 0;
