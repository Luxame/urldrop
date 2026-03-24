(function (global) {
  const config = {
    parameters: [
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
    ],
    prefixRules: ["utm_", "pk_", "mc_", "ga_", "oly_", "vero_"],
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = config;
  } else {
    global.trackingConfig = config;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
