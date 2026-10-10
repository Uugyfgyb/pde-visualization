const DW = require(require("path").join(__dirname, "..", "..", "engine.js"));
const l = 1, a = 1;
const F = DW.makeSource({ type: "modes", amps: [0, 0, 1], omega: 1.7, amp: 0.05 }, l, 250);
const g = { type: "modes", amps: [0, 0, 1] };
const sh = DW.spatialShape(g, l, 250);
console.log("engine shape.norm2 =", sh.norm2, " expect (l/2)*1 =", l / 2);
console.log("engine source.norm2 =", F.norm2, " expect amp^2*(l/2) =", 0.05 * 0.05 * l / 2);
console.log("||F(.,0)||^2 =", F.norm2, " analytic =", 0.05 * 0.05 * l / 2);
