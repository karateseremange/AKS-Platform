"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../src/ui/admin/PrivateLogsClient.html"), "utf8")
  .replace(/^<script>\s*/, "").replace(/<\/script>\s*$/, "");
class Element {
  constructor(tag = "div") { this.tag = tag; this.children = []; this.attributes = {}; this.listeners = {}; this.value = ""; }
  set textContent(value) { this.valueText = String(value); this.children = []; }
  get textContent() { return (this.valueText || "") + this.children.map(child => child.textContent).join(""); }
  set innerHTML(value) { throw new Error("Unsafe HTML sink: " + value); }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key]; }
  addEventListener(event, callback) { this.listeners[event] = callback; }
}
function fixture(view = "page", authorized = true, sendOverride) {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  const root = new Element();
  root.setAttribute("data-view", view);
  root.setAttribute("data-authorized", String(authorized));
  root.ownerDocument = { createElement: tag => new Element(tag) };
  const names = ["status", "events", "retry"].concat(view === "page" ? ["filter", "severity", "filter-button"] : []);
  const nodes = Object.fromEntries(names.map(name => [name, new Element()]));
  root.querySelector = selector => nodes[selector.slice(14, -1)] || null;
  const calls = [];
  const timers = new Map();
  let timerId = 0;
  const controller = context.AKS_mountPrivateLogs(root, {
    send: sendOverride || ((input, success, failure) => calls.push({ input, success, failure })),
    setTimeout: (fn, delay) => { assert.equal(delay, 10000); timers.set(++timerId, fn); return timerId; },
    clearTimeout: id => timers.delete(id)
  });
  return { root, nodes, calls, controller, expire: () => [...timers.values()].forEach(fn => fn()) };
}
function available(message = "synthetic") {
  return { status: "AVAILABLE", available: true, events: [{ occurredAt: "2026-09-01T12:00:00Z",
    severity: "WARN", code: "TEST", message, correlationId: "event-1" }] };
}
test("no request for a denied shell", () => {
  const f = fixture("page", false);
  assert.equal(f.controller, null); assert.equal(f.calls.length, 0);
});
test("one RPC and double-click guard; fresh manual retry", () => {
  const f = fixture();
  f.controller.load(); f.nodes.retry.listeners.click();
  assert.equal(f.calls.length, 1); assert.equal(f.nodes.retry.disabled, true);
  f.calls[0].success(available());
  assert.equal(f.nodes.retry.disabled, false); assert.equal(f.nodes.events.children.length, 1);
  f.nodes.retry.listeners.click();
  assert.equal(f.calls.length, 2); assert.equal(f.nodes.events.children.length, 0);
});
test("timeout drops late data and keeps retry blocked until server settles", () => {
  const f = fixture();
  f.expire(); f.controller.load();
  assert.equal(f.calls.length, 1); assert.equal(f.nodes.retry.disabled, true);
  assert.match(f.nodes.status.textContent, /indisponibles/);
  f.calls[0].success(available("late secret"));
  assert.equal(f.nodes.events.children.length, 0); assert.equal(f.nodes.retry.disabled, false);
  f.controller.load(); f.calls[0].success(available("obsolete"));
  assert.equal(f.nodes.events.children.length, 0);
  f.calls[1].success(available("fresh"));
  assert.match(f.nodes.events.textContent, /fresh/); assert.doesNotMatch(f.nodes.events.textContent, /late|obsolete/);
});
test("transport failure and disabled state remain generic without automatic retries", () => {
  const f = fixture();
  f.calls[0].failure(new Error("endpoint or secret"));
  assert.equal(f.calls.length, 1); assert.equal(f.nodes.retry.disabled, false);
  assert.match(f.nodes.status.textContent, /indisponibles/);
  assert.doesNotMatch(f.nodes.status.textContent, /endpoint|secret/);
  f.controller.load(); f.calls[1].success({ status: "DISABLED", available: false, events: [] });
  assert.equal(f.calls.length, 2); assert.match(f.nodes.status.textContent, /indisponibles/);
});
test("empty state describes the search window, never whole history", () => {
  const f = fixture();
  f.calls[0].success({ status: "EMPTY", available: true, events: [] });
  assert.match(f.nodes.status.textContent, /fenêtre consultée.*500 dernières lignes/);
});
test("HTML-looking events render only text, including code and correlation", () => {
  const f = fixture();
  const result = available('<img src=x onerror="alert(1)">');
  result.events[0].code = "<script>evil()</script>";
  f.calls[0].success(result);
  assert.match(f.nodes.events.textContent, /<img/);
  assert.equal(f.nodes.events.children[0].children.some(node => ["img", "script"].includes(node.tag)), false);
  assert.match(f.nodes.events.textContent, /Corrélation : event-1/);
});
test("page sends only severity; widget requests no filter or client limit", () => {
  const page = fixture(); page.calls[0].success(available());
  page.nodes.severity.value = "ERROR";
  let prevented = false;
  page.nodes.filter.listeners.submit({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(JSON.stringify(page.calls[1].input), '{"view":"page","severity":"ERROR"}');
  const widget = fixture("widget");
  assert.equal(JSON.stringify(widget.calls[0].input), '{"view":"widget"}');
  widget.calls[0].success({ available: true, events: Array(6).fill(available().events[0]) });
  assert.equal(widget.nodes.events.children.length, 0);
  assert.match(widget.nodes.status.textContent, /indisponibles/);
});
test("a synchronous RPC error releases controls and leaks no exception", () => {
  const f = fixture("page", true, () => { throw new Error("secret"); });
  assert.equal(f.nodes.retry.disabled, false);
  assert.match(f.nodes.status.textContent, /indisponibles/);
  assert.doesNotMatch(f.nodes.status.textContent, /secret/);
});
