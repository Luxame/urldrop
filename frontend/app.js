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

  function renderEmpty(message) {
    resultEl.textContent = message;
    resultEl.classList.add("empty");
    resultEl.classList.remove("has-result");
    statusEl.textContent = "";
  }

  function buildStatus(perLine) {
    // 安全注意：使用 DOM API 建立元素，不可使用 innerHTML
    statusEl.textContent = "";

    const totalRemoved = perLine.reduce((n, r) => n + r.removed.length, 0);
    const errorCount = perLine.filter((r) => r.error).length;
    const lineCount = perLine.length;

    if (totalRemoved === 0 && errorCount === 0) {
      statusEl.textContent = "沒有發現需要移除的追蹤參數";
      return;
    }

    if (totalRemoved > 0) {
      const summary =
        lineCount > 1
          ? "共 " +
            lineCount +
            " 條連結，移除 " +
            totalRemoved +
            " 項追蹤參數："
          : "已移除參數：";
      statusEl.appendChild(document.createTextNode(summary));

      const seen = new Set();
      perLine.forEach(function (r) {
        r.removed.forEach(function (key) {
          if (seen.has(key)) return;
          seen.add(key);
          const tag = document.createElement("span");
          tag.className = "removed-tag";
          tag.textContent = key;
          statusEl.appendChild(tag);
        });
      });
    }

    if (errorCount > 0) {
      const errTag = document.createElement("span");
      errTag.className = "error-tag";
      errTag.textContent =
        (totalRemoved > 0 ? "（" : "") +
        errorCount +
        " 條無法處理" +
        (totalRemoved > 0 ? "）" : "");
      statusEl.appendChild(errTag);
    }
  }

  function handleClean() {
    const lines = inputEl.value
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(function (line) {
        return line.length > 0;
      });

    if (lines.length === 0) {
      renderEmpty("請先貼上要處理的連結");
      return;
    }

    const perLine = lines.map(function (line) {
      try {
        const result = cleanLink(line);
        return {
          original: line,
          cleaned: result.url,
          removed: result.removed,
          error: null,
        };
      } catch (error) {
        return {
          original: line,
          cleaned: "",
          removed: [],
          error: error.message,
        };
      }
    });

    // 安全注意：使用 textContent，不可改為 innerHTML，因為內容含使用者輸入
    resultEl.textContent = perLine
      .map(function (r) {
        return r.error ? "⚠ " + r.error + "：" + r.original : r.cleaned;
      })
      .join("\n");
    resultEl.classList.remove("empty");
    resultEl.classList.add("has-result");

    buildStatus(perLine);
  }

  document.getElementById("cleanBtn").addEventListener("click", function () {
    handleClean();
  });

  document.getElementById("clearBtn").addEventListener("click", function () {
    inputEl.value = "";
    resetUI();
    inputEl.focus();
  });

  document
    .getElementById("copyBtn")
    .addEventListener("click", async function () {
      const text = resultEl.classList.contains("empty")
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
  const pasteBtn = document.getElementById("pasteBtn");
  if (pasteBtn) {
    pasteBtn.addEventListener("click", async function () {
      try {
        const text = await navigator.clipboard.readText();
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
    setTimeout(function () {
      handleClean();
    }, 0);
  });
})();
