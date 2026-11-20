import json, base64, os, sys
B = sys.argv[1]
j = lambda p: json.load(open(os.path.join(B, p)))
insp = j("notes/inspiration.json"); biz = j("notes/business.json")
data = {"directions": insp["directions"], "czech": j("notes/group-a.json") + j("notes/group-b.json"),
        "foreign": insp["sites"], "patterns": insp["patterns"], "ideas": biz["ideas"], "roadmap": biz["roadmap"]}
missing = []
def chk(f):
    f = f if f.startswith("shots/") else "shots/" + f
    if not os.path.exists(os.path.join(B, f)): missing.append(f)
for s in data["czech"] + data["foreign"]:
    for x in s.get("shots", []): chk(x["file"])
for p in data["patterns"]:
    if p.get("shot"): chk(p["shot"])
print("missing:", missing)
b64 = lambda p: base64.b64encode(open(os.path.join(B, p), "rb").read()).decode()
t = open(os.path.join(B, "template.html")).read()
t = t.replace("__DATA__", json.dumps(data, ensure_ascii=False).replace("</", "<\\/")).replace("__CLASH__", b64("assets/clash600.woff2")).replace("__SWITZER__", b64("assets/switzer400.woff2"))
open(os.path.join(B, "moodboard.html"), "w").write(t)
print("bytes", len(t.encode()))
