# Urldrop

簡單、快速的網址清理工具，用來移除社群分享連結中的追蹤參數（例如 `utm_*`、`fbclid`、`igsh`、`xmt`、`slof`）。

- 主要用途：把貼上的 URL 轉成更乾淨、可分享的版本

## 功能特色

- 移除常見追蹤參數與前綴規則參數（如 `utm_`、`pk_`、`ga_`）
- 支援清理 URL fragment（`#...`）中的追蹤片段
- 自動補齊沒有協定的網址（例如 `example.com` 會補成 `https://example.com`）
- 自動清除 URL 中的帳號密碼資訊（`username:password@host`）

## 專案結構

```text
urldrop/
├─ frontend/
│  ├─ index.html       # UI
│  ├─ app.js           # UI 事件與互動邏輯
│  ├─ cleaner.js       # URL 清理核心邏輯
│  ├─ app.test.js      # UI 邏輯測試
│  └─ cleaner.test.js  # 清理核心測試
├─ .gitignore
├─ LICENSE
└─ README.md
```

## 快速開始

### 直接使用

這個專案是純前端頁面，直接用瀏覽器開啟以下檔案即可：

`frontend/index.html`

## 使用方式

1. 貼上原始連結
2. 點擊「清除追蹤參數」
3. 檢查結果區塊與已移除參數清單
4. 點擊「複製整理後連結」

## 範例

輸入：

```text
https://example.com/path?utm_source=ig&fbclid=abc123&keep=1
```

輸出：

```text
https://example.com/path?keep=1
```

## 功能驗證清單

可用以下案例快速驗證兩個關鍵功能：

1. 自動補齊協定：輸入 `example.com/post?id=42&igshid=abc`，預期輸出 `https://example.com/post?id=42`
2. 自動移除 URL 帳號密碼資訊：輸入 `https://user:secret@example.com/?utm_id=1`，預期輸出 `https://example.com/`

## 測試

本專案使用 Node.js 內建測試框架（`node:test`）。

```bash
# 在 repo 根目錄執行
node --test frontend/cleaner.test.js frontend/app.test.js
```

## 安全設計摘要

- 僅接受 `http` / `https`
- 無法解析的 URL 會直接報錯，不進行猜測性處理
- 會移除 URL 中內嵌的帳密資訊
- 對 FB/IG 跳轉鏈結只抽取白名單參數並限制跳轉層級

## 授權

本專案採用 [MIT License](./LICENSE)。
