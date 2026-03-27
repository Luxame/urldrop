(function () {
  "use strict";

  const inputEl = document.getElementById("inputUrl");
  const resultEl = document.getElementById("result");
  const statusEl = document.getElementById("status");

  if (!inputEl || !resultEl || !statusEl) {
    throw new Error("UI 初始化失敗");
  }

  const cleaner = window.urlCleaner;
  if (!cleaner || typeof cleaner.cleanLink !== "function") {
    throw new Error("URL 清理模組載入失敗");
  }
  const { cleanLink } = cleaner;

  // Dynamic footer year
  const yearEl = document.getElementById("footerYear");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  function resetUI() {
    resultEl.textContent = "等待輸入連結...";
    resultEl.classList.add("empty");
    resultEl.classList.remove("has-result");
    statusEl.textContent = "";
  }

  function renderResult(cleaned, removed) {
    if (!cleaned) {
      resultEl.textContent = "請先貼上要處理的連結";
      resultEl.classList.add("empty");
      resultEl.classList.remove("has-result");
      statusEl.textContent = "";
      return;
    }

    // 安全注意：使用 textContent，不可改為 innerHTML，因為 cleaned 含使用者輸入
    resultEl.textContent = cleaned;
    resultEl.classList.remove("empty");
    resultEl.classList.add("has-result");

    if (removed.length) {
      // 安全注意：使用 DOM API 建立元素，不可使用 innerHTML
      statusEl.textContent = "";
      var prefix = document.createTextNode("已移除參數：");
      statusEl.appendChild(prefix);
      removed.forEach(function (param, i) {
        var tag = document.createElement("span");
        tag.className = "removed-tag";
        tag.textContent = param;
        statusEl.appendChild(tag);
      });
    } else {
      statusEl.textContent = "沒有發現需要移除的追蹤參數";
    }
  }

  function handleClean() {
    try {
      var value = inputEl.value;
      var result = cleanLink(value);
      renderResult(result.url, result.removed);
    } catch (error) {
      // 安全注意：必須使用 textContent，不可改為 innerHTML，因為 error.message 可能含使用者輸入
      resultEl.textContent = error.message;
      resultEl.classList.remove("empty");
      resultEl.classList.remove("has-result");
      statusEl.textContent = "";
    }
  }

  document
    .getElementById("cleanBtn")
    .addEventListener("click", function () { handleClean(); });

  document
    .getElementById("clearBtn")
    .addEventListener("click", function () {
      inputEl.value = "";
      resetUI();
      inputEl.focus();
    });

  document
    .getElementById("copyBtn")
    .addEventListener("click", async function () {
      var text = resultEl.classList.contains("empty")
        ? ""
        : resultEl.textContent;
      if (!text) {
        statusEl.textContent = "沒有可複製的內容";
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        statusEl.textContent = "已複製到剪貼簿";
      } catch (error) {
        console.error(error);
        statusEl.textContent = "瀏覽器阻擋了複製動作";
      }
    });

  // Paste button — read from clipboard
  var pasteBtn = document.getElementById("pasteBtn");
  if (pasteBtn) {
    pasteBtn.addEventListener("click", async function () {
      try {
        var text = await navigator.clipboard.readText();
        inputEl.value = text;
        handleClean();
      } catch (error) {
        console.error(error);
        statusEl.textContent = "瀏覽器阻擋了讀取剪貼簿";
      }
    });
  }

  // Auto-clean on paste into textarea
  inputEl.addEventListener("paste", function () {
    setTimeout(function () { handleClean(); }, 0);
  });
})();
