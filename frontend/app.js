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

  function resetUI() {
    resultEl.textContent = "等待輸入連結...";
    resultEl.classList.add("empty");
    statusEl.textContent = "";
  }

  function renderResult(cleaned, removed) {
    if (!cleaned) {
      resultEl.textContent = "請先貼上要處理的連結";
      resultEl.classList.add("empty");
      statusEl.textContent = "";
      return;
    }
    resultEl.textContent = cleaned;
    resultEl.classList.remove("empty");
    statusEl.textContent = removed.length
      ? `已移除參數：${removed.join(", ")}`
      : "沒有發現需要移除的追蹤參數";
  }

  document
    .getElementById("cleanBtn")
    .addEventListener("click", () => handleClean());

  document
    .getElementById("clearBtn")
    .addEventListener("click", () => {
      inputEl.value = "";
      resetUI();
      inputEl.focus();
    });

  document
    .getElementById("copyBtn")
    .addEventListener("click", async () => {
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

  function handleClean() {
    try {
      const { url, removed } = cleanLink(inputEl.value);
      renderResult(url, removed);
    } catch (error) {
      resultEl.textContent = error.message;
      resultEl.classList.remove("empty");
      statusEl.textContent = "";
    }
  }
})();
