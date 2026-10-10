const fs = require("fs");
const h = fs.readFileSync("index.html", "utf8");
const m = [...h.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)];
fs.writeFileSync("tests/_chk.js", m[m.length - 1][1]);
console.log("app script: " + m[m.length - 1][1].length + " chars");
