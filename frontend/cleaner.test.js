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

test("移除 Instagram igsh 參數", () => {
  const { url, removed } = cleanLink(
    "https://www.instagram.com/p/DUa73Vljxdc/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==&keep=1"
  );
  assert.strictEqual(url, "https://www.instagram.com/p/DUa73Vljxdc/?keep=1");
  assert.deepStrictEqual(removed, ["utm_source", "igsh"]);
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
  , /不支援的協定/);
});

test("缺少跳轉目標時回報錯誤", () => {
  assert.throws(() => cleanLink("https://l.facebook.com/l.php?h=abc"), /缺少目標參數/);
});

test("超過長度上限的網址會被拒絕", () => {
  const longUrl = "https://example.com/?" + "a".repeat(8200);
  assert.throws(() => cleanLink(longUrl), /網址長度超過上限/);
});

test("雙重編碼的 Facebook 跳轉仍能正確移除追蹤參數", () => {
  const { url, removed } = cleanLink(
    "https://l.facebook.com/l.php?u=https%253A%252F%252Fexample.com%252Fpage%253Ffbclid%253Dabc%2526keep%253D1"
  );
  assert.strictEqual(url, "https://example.com/page?keep=1");
  assert.ok(removed.includes("fbclid"));
});

test("跳轉深度超過上限會被拒絕", () => {
  const nested =
    "https://l.facebook.com/l.php?u=" +
    encodeURIComponent(
      "https://l.facebook.com/l.php?u=" +
        encodeURIComponent(
          "https://l.facebook.com/l.php?u=" +
            encodeURIComponent(
              "https://l.facebook.com/l.php?u=" +
                encodeURIComponent("https://example.com/")
            )
        )
    );
  assert.throws(() => cleanLink(nested), /跳轉層級過深/);
});

test("拒絕 data: 協議的網址", () => {
  assert.throws(() => cleanLink("data:text/html,<h1>hi</h1>"), /不支援的網址協定/);
});

test("拒絕 ftp: 協議的網址", () => {
  assert.throws(() => cleanLink("ftp://files.example.com/secret.txt"), /不支援的網址協定/);
});

test("接近長度上限的 URL 能正常處理", () => {
  const longParam = "a".repeat(8000);
  const { url } = cleanLink(`https://example.com/?keep=${longParam}&utm_source=x`);
  assert.strictEqual(url, `https://example.com/?keep=${longParam}`);
});

test("Unicode / IDN 網域名稱能正常清理", () => {
  const { url, removed } = cleanLink("https://例え.jp/path?utm_source=tw&keep=1");
  assert.ok(url.includes("keep=1"));
  assert.ok(!url.includes("utm_source"));
  assert.deepStrictEqual(removed, ["utm_source"]);
});

test("參數值包含特殊字元不影響清理", () => {
  const { url, removed } = cleanLink(
    "https://example.com/?q=hello%20world%26foo%3Dbar&utm_medium=social&tag=a%23b"
  );
  assert.ok(url.includes("q=hello"));
  assert.ok(url.includes("tag=a"));
  assert.ok(!url.includes("utm_medium"));
  assert.deepStrictEqual(removed, ["utm_medium"]);
});

test("參數值包含中文能正常保留", () => {
  const { url, removed } = cleanLink(
    "https://example.com/search?q=台北美食&fbclid=abc123"
  );
  assert.ok(url.includes(encodeURIComponent("台北美食")) || url.includes("台北美食"));
  assert.ok(!url.includes("fbclid"));
  assert.deepStrictEqual(removed, ["fbclid"]);
});

test("只有追蹤參數的 URL 清理後不留問號", () => {
  const { url, removed } = cleanLink("https://example.com/?utm_source=ig&fbclid=abc");
  assert.strictEqual(url, "https://example.com/");
  assert.deepStrictEqual(removed, ["utm_source", "fbclid"]);
});
