#!/usr/bin/env python3
"""Compile shipped Lua templates without browser engines or upstream fixtures."""
import pathlib, re, json, subprocess
root=pathlib.Path(__file__).resolve().parents[1]
def compile_template(text):
    result=[];pos=0
    for m in re.finditer(r"<%(.*?)%>",text,re.S):
        result.append("write("+json.dumps(text[pos:m.start()],ensure_ascii=False)+")")
        block=m.group(1)
        if not block.startswith("#"):
            block=block.strip().strip("-").strip()
            if block.startswith("="):result.append("write("+block[1:]+")")
            elif block.startswith(("_",":")):result.append("write(translate("+json.dumps(block[1:],ensure_ascii=False)+"))")
            elif block.startswith("+"):result.append("include("+json.dumps(block[1:])+")")
            else:result.append(block)
        pos=m.end()
    result.append("write("+json.dumps(text[pos:],ensure_ascii=False)+")")
    return "\n".join(result)
out=root/"build/template-syntax";out.mkdir(parents=True,exist_ok=True)
for source in (root/"theme/root/usr/lib/lua/luci/view/themes/materialluci").glob("*.htm"):
    target=out/(source.stem+".lua");target.write_text(compile_template(source.read_text()))
    subprocess.run(["luac5.1","-p",str(target)],check=True)
print("Shipped Lua templates compile.")
