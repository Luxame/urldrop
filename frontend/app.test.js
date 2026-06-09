const test = require("node:test");
const assert = require("node:assert/strict");

const { cleanLink } = require("./cleaner.js");

function createClassList(initial = []) {
  const store = new Set(initial);
  return {
    add: (...classes) => classes.forEach((name) => store.add(name)),
    remove: (...classes) => classes.forEach((name) => store.delete(name)),
    contains: (name) => store.has(name),
  };
}

function createElement({ id, value = "", textContent = "", classNames = [] }) {
  return {
    id,
    value,
    textContent,
    classList: createClassList(classNames),
    listeners: {},
    focused: false,
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    focus() {
      this.focused = true;
    },
  };
}

function setupDom({ clipboardReadText } = {}) {
  const elements = {
    inputUrl: createElement({ id: "inputUrl", value: "" }),
    result: createElement({
      id: "result",
      textContent: "等待輸入連結...",
      classNames: ["result", "empty"],
    }),
    status: createElement({ id: "status", textContent: "" }),
    cleanBtn: createElement({ id: "cleanBtn" }),
    copyBtn: createElement({ id: "copyBtn" }),
    clearBtn: createElement({ id: "clearBtn" }),
    pasteBtn: createElement({ id: "pasteBtn" }),
    footerYear: createElement({ id: "footerYear", textContent: "2026" }),
  };

  const documentStub = {
    getElementById(id) {
      return elements[id] || null;
    },
    createTextNode(text) {
      return { nodeType: 3, textContent: text };
    },
    createElement(tag) {
      return {
        tagName: tag.toUpperCase(),
        className: "",
        textContent: "",
        children: [],
      };
    },
  };

  // 模擬 appendChild 讓 statusEl 能追加子元素
  elements.status.childNodes = [];
  elements.status.appendChild = function (child) {
    this.childNodes.push(child);
  };

  const clipboard = {
    writes: [],
    async writeText(text) {
      this.writes.push(text);
    },
    async readText() {
      if (clipboardReadText instanceof Error) throw clipboardReadText;
      return clipboardReadText || "";
    },
  };

  global.document = documentStub;
  global.navigator = { clipboard };
  global.window = { urlCleaner: { cleanLink } };
  global.setTimeout = (fn) => fn();

  delete require.cache[require.resolve("./app.js")];
  require("./app.js");

  const cleanup = () => {
    delete global.document;
    delete global.navigator;
    delete global.window;
    delete global.setTimeout;
  };

  return { elements, clipboard, cleanup };
}

test("清空按鈕會清除輸入與狀態", () => {
  const { elements, cleanup } = setupDom();

  elements.inputUrl.value = "https://example.com/?utm_source=1";
  elements.result.textContent = "https://example.com/";
  elements.result.classList.remove("empty");
  elements.status.textContent = "已移除參數：utm_source";

  elements.clearBtn.listeners.click();

  assert.strictEqual(elements.inputUrl.value, "");
  assert.strictEqual(elements.result.textContent, "等待輸入連結...");
  assert.ok(elements.result.classList.contains("empty"));
  assert.strictEqual(elements.status.textContent, "");
  assert.strictEqual(elements.inputUrl.focused, true);

  cleanup();
});

test("複製按鈕在沒有結果時顯示提示", async () => {
  const { elements, clipboard, cleanup } = setupDom();

  elements.result.textContent = "等待輸入連結...";
  elements.result.classList.add("empty");

  await elements.copyBtn.listeners.click();

  assert.strictEqual(elements.status.textContent, "沒有可複製的內容");
  assert.strictEqual(clipboard.writes.length, 0);

  cleanup();
});

test("複製按鈕會複製整理後連結", async () => {
  const { elements, clipboard, cleanup } = setupDom();

  elements.result.textContent = "https://example.com/clean";
  elements.result.classList.remove("empty");

  await elements.copyBtn.listeners.click();

  assert.deepStrictEqual(clipboard.writes, ["https://example.com/clean"]);
  assert.strictEqual(elements.status.textContent, "已複製到剪貼簿");

  cleanup();
});

test("貼上按鈕成功讀取剪貼簿並自動清理", async () => {
  const { elements, cleanup } = setupDom({
    clipboardReadText: "https://example.com/?utm_source=fb&keep=1",
  });

  await elements.pasteBtn.listeners.click();

  assert.strictEqual(
    elements.inputUrl.value,
    "https://example.com/?utm_source=fb&keep=1"
  );
  assert.strictEqual(
    elements.result.textContent,
    "https://example.com/?keep=1"
  );
  assert.ok(!elements.result.classList.contains("empty"));

  cleanup();
});

test("貼上按鈕被瀏覽器拒絕時顯示提示", async () => {
  const { elements, cleanup } = setupDom({
    clipboardReadText: new Error("NotAllowedError"),
  });

  await elements.pasteBtn.listeners.click();

  assert.strictEqual(elements.status.textContent, "瀏覽器阻擋了讀取剪貼簿");

  cleanup();
});

test("textarea paste 事件觸發自動清理", () => {
  const { elements, cleanup } = setupDom();

  elements.inputUrl.value = "https://example.com/?fbclid=abc123";
  elements.inputUrl.listeners.paste();

  assert.strictEqual(elements.result.textContent, "https://example.com/");
  assert.ok(!elements.result.classList.contains("empty"));

  cleanup();
});

test("批次清理：多行 URL 逐行輸出清理結果", () => {
  const { elements, cleanup } = setupDom();

  elements.inputUrl.value =
    "https://example.com/?utm_source=a&keep=1\nhttps://example.com/p?fbclid=b";
  elements.cleanBtn.listeners.click();

  assert.strictEqual(
    elements.result.textContent,
    "https://example.com/?keep=1\nhttps://example.com/p"
  );
  assert.ok(!elements.result.classList.contains("empty"));

  cleanup();
});

test("批次清理：狀態列彙總連結數與移除參數", () => {
  const { elements, cleanup } = setupDom();

  elements.inputUrl.value =
    "https://example.com/?utm_source=a\nhttps://example.com/p?fbclid=b";
  elements.cleanBtn.listeners.click();

  const statusText = elements.status.childNodes
    .map((n) => n.textContent)
    .join("");
  assert.ok(statusText.includes("共 2 條連結"));
  assert.ok(statusText.includes("utm_source"));
  assert.ok(statusText.includes("fbclid"));

  cleanup();
});

test("批次清理：無效連結以警告標示且不影響其他行", () => {
  const { elements, cleanup } = setupDom();

  elements.inputUrl.value = "::::\nhttps://example.com/?utm_source=a&keep=1";
  elements.cleanBtn.listeners.click();

  const lines = elements.result.textContent.split("\n");
  assert.ok(lines[0].startsWith("⚠"));
  assert.strictEqual(lines[1], "https://example.com/?keep=1");

  const statusText = elements.status.childNodes
    .map((n) => n.textContent)
    .join("");
  assert.ok(statusText.includes("1 條無法處理"));

  cleanup();
});

test("單行清理：狀態列以標籤顯示已移除參數", () => {
  const { elements, cleanup } = setupDom();

  elements.inputUrl.value = "https://example.com/?utm_source=a&keep=1";
  elements.cleanBtn.listeners.click();

  const tags = elements.status.childNodes.filter(
    (n) => n.className === "removed-tag"
  );
  assert.ok(tags.some((t) => t.textContent === "utm_source"));

  cleanup();
});

test("無追蹤參數時狀態列顯示提示", () => {
  const { elements, cleanup } = setupDom();

  elements.inputUrl.value = "https://example.com/?keep=1";
  elements.cleanBtn.listeners.click();

  assert.strictEqual(elements.status.textContent, "沒有發現需要移除的追蹤參數");

  cleanup();
});
