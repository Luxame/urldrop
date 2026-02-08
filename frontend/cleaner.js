(function (global) {
  const trackingParameters = new Set(
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "utm_id",
      "fbclid",
      "gclid",
      "dclid",
      "msclkid",
      "mc_eid",
      "mc_cid",
      "igsh",
      "igshid",
      "si",
      "s",
      "spm",
      "spm_id_from",
      "ref",
      "ref_url",
      "ref_src",
      "referrer",
      "referral_code",
      "share_id",
      "share_from",
      "share_link_id",
      "ch",
      "ch_id",
      "mibextid",
      "hss_channel",
      "hss",
      "xmt",
      "yclid",
      "slof",
    ].map((key) => key.toLowerCase())
  );

  const prefixRules = ["utm_", "pk_", "mc_", "ga_", "oly_", "vero_"];
  const allowedProtocols = new Set(["http:", "https:"]);
  const maxRedirectDepth = 3;

  const redirectRules = [
    {
      hosts: new Set(["l.facebook.com", "lm.facebook.com"]),
      pathMatches: (pathname) => pathname === "/l.php",
      params: ["u"],
    },
    {
      hosts: new Set(["l.instagram.com"]),
      pathMatches: () => true,
      params: ["u"],
    },
    {
      hosts: new Set([
        "www.facebook.com",
        "web.facebook.com",
        "m.facebook.com",
        "facebook.com",
      ]),
      pathMatches: (pathname) =>
        pathname === "/sharer.php" || pathname === "/share.php",
      params: ["u", "href", "url", "link"],
    },
  ];

  function shouldRemoveParam(name) {
    if (!name) return false;
    const key = name.toLowerCase();
    if (trackingParameters.has(key)) {
      return true;
    }
    return prefixRules.some((prefix) => key.startsWith(prefix));
  }

  function parseUrl(raw) {
    if (!raw) return null;
    try {
      return new URL(raw);
    } catch {
      try {
        return new URL(`https://${raw}`);
      } catch {
        return null;
      }
    }
  }

  function removeTrackingFragment(hash) {
    if (!hash || hash.length <= 1) return hash;
    const fragment = hash.substring(1);
    const parts = fragment.split("&").filter((item) => item);
    const cleaned = parts.filter((item) => {
      const [key] = item.split("=");
      return !shouldRemoveParam(key);
    });
    return cleaned.length ? `#${cleaned.join("&")}` : "";
  }

  function decodeRedirectValue(value) {
    if (!value) return "";
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function extractRedirectTarget(parsed) {
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    for (const rule of redirectRules) {
      if (!rule.hosts.has(host)) {
        continue;
      }

      if (rule.pathMatches && !rule.pathMatches(pathname)) {
        continue;
      }

      for (const param of rule.params) {
        const value = parsed.searchParams.get(param);
        if (value) {
          return decodeRedirectValue(value).trim();
        }
      }

      throw new Error("偵測到 FB/IG 跳轉網址但缺少目標參數");
    }

    return null;
  }

  function cleanLink(raw) {
    const trimmed = raw ? raw.trim() : "";
    if (!trimmed) {
      return { url: "", removed: [] };
    }

    let currentInput = trimmed;
    const removedParams = [];

    for (let depth = 0; depth <= maxRedirectDepth; depth += 1) {
      const parsed = parseUrl(currentInput);
      if (!parsed) {
        throw new Error("無法辨識的網址");
      }

      if (!allowedProtocols.has(parsed.protocol)) {
        throw new Error("不支援的網址協定");
      }

      parsed.username = "";
      parsed.password = "";

      const params = parsed.searchParams;
      const deletedThisRound = [];

      for (const [key] of params) {
        if (shouldRemoveParam(key)) {
          deletedThisRound.push(key);
          removedParams.push(key);
        }
      }

      [...new Set(deletedThisRound)].forEach((key) => params.delete(key));

      parsed.hash = removeTrackingFragment(parsed.hash);

      const redirectTarget = extractRedirectTarget(parsed);
      if (redirectTarget === null) {
        return {
          url: parsed.toString(),
          removed: [...new Set(removedParams)],
        };
      }

      if (!redirectTarget) {
        throw new Error("偵測到 FB/IG 跳轉網址但未提供有效的目標連結");
      }

      currentInput = redirectTarget;
    }

    throw new Error("跳轉層級過深，無法完成清理");
  }

  const api = {
    cleanLink,
    parseUrl,
    shouldRemoveParam,
    removeTrackingFragment,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.urlCleaner = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
