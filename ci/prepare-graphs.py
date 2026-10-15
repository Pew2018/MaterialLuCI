from pathlib import Path
source=Path("luci-fixture/modules/luci-mod-status/htdocs/luci-static/resources/view/status/load.js").read_text()
assert "'require view';" in source and "this.pollData();" in source
source=source.replace("'require view';","'require baseclass as view';",1).replace("this.pollData();","/* Poll registration is controlled by the CI harness. */")
Path("build/preview/luci-static/resources/view/materialluci-diagnostic-load.js").write_text(source)
