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
    ].map((key) => key.toLowerCase())
  );

  const prefixRules = ["utm_", "pk_", "mc_", "ga_", "oly_", "vero_"];

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

  function cleanLink(raw) {
    const trimmed = raw ? raw.trim() : "";
    if (!trimmed) {
      return { url: "", removed: [] };
    }

    const parsed = parseUrl(trimmed);
    if (!parsed) {
      throw new Error("無法辨識的網址");
    }

    const removedParams = [];
    const params = parsed.searchParams;

    for (const [key] of params) {
      if (shouldRemoveParam(key)) {
        removedParams.push(key);
      }
    }

    [...new Set(removedParams)].forEach((key) => params.delete(key));

    parsed.hash = removeTrackingFragment(parsed.hash);

    return {
      url: parsed.toString(),
      removed: [...new Set(removedParams)],
    };
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
