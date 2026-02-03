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

function setupDom() {
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
  };

  const documentStub = {
    getElementById(id) {
      return elements[id] || null;
    },
  };

  const clipboard = {
    writes: [],
    async writeText(text) {
      this.writes.push(text);
    },
  };

  global.document = documentStub;
  global.navigator = { clipboard };
  global.window = { urlCleaner: { cleanLink } };

  delete require.cache[require.resolve("./app.js")];
  require("./app.js");

  const cleanup = () => {
    delete global.document;
    delete global.navigator;
    delete global.window;
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
