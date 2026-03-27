const https = require("https");

function newerThan(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

function checkForUpdates(pkg, current) {
  const url = `https://registry.npmjs.org/${pkg.replace("/", "%2F")}/latest`;
  https.get(url, { headers: { "User-Agent": "torque-antinuke" } }, res => {
    let raw = "";
    res.on("data", d => (raw += d));
    res.on("end", () => {
      try {
        const latest = JSON.parse(raw).version;
        if (latest && newerThan(latest, current))
          console.warn(`\n[TorqueAntiNuke] update available ${current} → ${latest}\n  npm install ${pkg}@latest\n`);
      } catch {}
    });
  }).on("error", () => {});
}

module.exports = checkForUpdates;
