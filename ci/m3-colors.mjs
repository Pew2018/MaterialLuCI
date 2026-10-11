import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import {Hct,SchemeTonalSpot,argbFromHex,hexFromArgb} from "@material/material-color-utilities";
const context={};context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync("build/stage/www/luci-static/materialluci/palette.js","utf8"),context);
vm.runInContext(fs.readFileSync("build/stage/www/luci-static/materialluci/palette-m3.js","utf8"),context);
for(const seed of ["#42A5F5","#FF0000","#00FF00","#0000FF","#000000","#FFFFFF","#808080","#E6A545","#9575CD"])
 for(const dark of [false,true]){
  const result=context.MaterialM3Palette.generate(seed,dark),scheme=new SchemeTonalSpot(Hct.fromInt(argbFromHex(seed)),dark,0);
  for(const [role,hex] of Object.entries(result.system))assert.equal(hex,hexFromArgb(scheme[role]),role);
  for(const [a,b] of [["primary","onPrimary"],["primaryContainer","onPrimaryContainer"],["surface","onSurface"],["secondaryContainer","onSecondaryContainer"],["error","onError"]])
   assert(context.MaterialPalette.contrast(result.system[a],result.system[b])>=4.5,seed+" "+a+" "+b);
 }
console.log("M3 packaged palette: 18 schemes, official roles and text contrast passed");
