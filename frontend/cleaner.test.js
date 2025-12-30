const test = require("node:test");
const assert = require("node:assert/strict");

const { cleanLink } = require("./cleaner.js");

test("空字串輸入直接回傳空結果", () => {
  assert.deepStrictEqual(cleanLink("   "), { url: "", removed: [] });
});

test("移除常見追蹤參數", () => {
  const { url, removed } = cleanLink(
    "https://example.com/path?utm_source=foo&fbclid=bar&keep=yes"
  );
  assert.strictEqual(url, "https://example.com/path?keep=yes");
  assert.deepStrictEqual(removed, ["utm_source", "fbclid"]);
});

test("移除符合前綴規則的參數", () => {
  const { url, removed } = cleanLink(
    "https://example.com/?utm_magic=1&pk_vid=2&ga_event=3&ok=1"
  );
  assert.strictEqual(url, "https://example.com/?ok=1");
  assert.deepStrictEqual(removed, ["utm_magic", "pk_vid", "ga_event"]);
});

test("片段追蹤碼也會移除並避免重複記錄", () => {
  const { url, removed } = cleanLink(
    "https://example.com/?utm_id=1&utm_id=2&ref=foo#utm_source=a&stay=1&ref=bar"
  );
  assert.strictEqual(url, "https://example.com/#stay=1");
  assert.deepStrictEqual(removed, ["utm_id", "ref"]);
});

test("自動補完整網址並保留非追蹤參數", () => {
  const { url, removed } = cleanLink("example.com/post?id=42&igshid=abc");
  assert.strictEqual(url, "https://example.com/post?id=42");
  assert.deepStrictEqual(removed, ["igshid"]);
});

test("Threads slof 參數會被移除", () => {
  const { url, removed } = cleanLink(
    "https://www.threads.com/@foo/post/bar?slof=1&keep=1"
  );
  assert.strictEqual(url, "https://www.threads.com/@foo/post/bar?keep=1");
  assert.deepStrictEqual(removed, ["slof"]);
});

test("遇到無效網址會拋出錯誤", () => {
  assert.throws(() => cleanLink("::::"), /無法辨識的網址/);
});
