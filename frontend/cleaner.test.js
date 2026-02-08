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

test("拒絕非 http/https 協定的網址", () => {
  assert.throws(() => cleanLink("javascript:alert(1)"), /不支援的網址協定/);
});

test("清除嵌入帳號密碼資訊", () => {
  const { url, removed } = cleanLink("https://user:secret@example.com/?utm_id=1");
  assert.strictEqual(url, "https://example.com/");
  assert.deepStrictEqual(removed, ["utm_id"]);
});

test("還原 Facebook 跳轉網址並移除內層追蹤碼", () => {
  const { url, removed } = cleanLink(
    "https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2Farticle%3Futm_source%3Dfb%26fbclid%3Dxxx%26keep%3D1&h=abc123&ref=external"
  );
  assert.strictEqual(url, "https://example.com/article?keep=1");
  assert.deepStrictEqual(removed, ["ref", "utm_source", "fbclid"]);
});

test("還原 Instagram 跳轉網址並保留安全性檢查", () => {
  const { url, removed } = cleanLink(
    "https://l.instagram.com/?u=https%3A%2F%2Fexample.com%2Freel%3Figshid%3Dfoo%26utm_content%3Dbar"
  );
  assert.strictEqual(url, "https://example.com/reel");
  assert.deepStrictEqual(removed, ["igshid", "utm_content"]);
});

test("跳轉目標是非 http/https 協定會被拒絕", () => {
  assert.throws(() =>
    cleanLink("https://l.facebook.com/l.php?u=javascript:alert(1)")
  , /不支援的網址協定/);
});

test("缺少跳轉目標時回報錯誤", () => {
  assert.throws(() => cleanLink("https://l.facebook.com/l.php?h=abc"), /缺少目標參數/);
});
