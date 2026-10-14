import fs from "node:fs";import vm from "node:vm";import assert from "node:assert/strict";
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync("theme/root/www/luci-static/materialluci/palette.js","utf8"),ctx);
const seeds=["#42A5F5","#CC6F4E","#E6A545","#7DC22F","#9575CD","#26C6DA","#F06292","#BA68C8","#2196F3","#009688","#4CAF50","#F44336","#FF9800","#9C27B0","#00BCD4","#3F51B5","#E91E63","#607D8B","#FF5722","#8BC34A","#000000","#FFFFFF","#777777","#808080","#123456"];
for(const seed of seeds){const foreground=ctx.MaterialPalette.swatchForeground(seed);for(const dark of [false,true])assert.equal(foreground,ctx.MaterialPalette.generate(seed,dark).swatchForeground,seed);assert.ok(ctx.MaterialPalette.contrast(seed,foreground)>=4.5,seed);}
console.log("Exact picker foreground parity and contrast verified for all shipped swatches and edge colors.");
