const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync("theme/root/www/luci-static/materialluci/palette.js","utf8"),ctx);
const P=ctx.MaterialPalette;
const seeds=["#42A5F5","#2196F3","#CC6F4E","#E6A545","#7DC22F","#9575CD","#26C6DA","#F06292","#BA68C8","#009688","#4CAF50","#F44336","#FF9800","#9C27B0","#00BCD4","#3F51B5","#E91E63","#607D8B","#FF5722","#8BC34A","#FFFFFF","#000000","#FFFF00","#808080"];
for(let i=0;i<512;i++)seeds.push("#"+((i*2654435761)>>>0).toString(16).padStart(8,"0").slice(-6).toUpperCase());
for(const seed of seeds)for(const dark of [false,true]){
 const p=P.generate(seed,dark);assert.equal(p.seed,seed);
 assert(P.contrast(p.onToolbar,p.toolbarSurface)>=7,seed+" toolbar");
 for(const state of [p.toolbarHover,p.toolbarPressed])assert(P.contrast(p.onToolbar,state)>=4.5,seed+" toolbar state");
 for(const [fg,bg] of [[p.onPrimary,p.primarySurface],[p.onPrimary,p.primaryPressed],[p.onActionSecondary,p.actionSecondary],[p.onActionSecondary,p.actionSecondaryPressed]])assert(P.contrast(fg,bg)>=4.5,seed+" "+dark+" "+fg+"/"+bg);
 for(const bg of dark?["#121212","#202020","#212121"]:["#FFFFFF","#FAFAFA","#EEEEEE"]){assert(P.contrast(p.accentInk,bg)>=4.5);assert(P.contrast(p.controlAccent,bg)>=3);}
}
assert.equal(P.generate("#2196F3",false).primarySurface,"#1976D2");
assert.equal(P.generate("#2196F3",true).primarySurface,"#0066AD");
console.log("Color checks: "+seeds.length+" seeds × light/dark, normal/pressed foregrounds and control contrast.");
