import sys, re, io, urllib.request, urllib.parse, json
sys.path.insert(0, sys.argv[1])
from fontTools.ttLib import TTFont
NEED = "ěščřžýáíéůúťďňóĚŠČŘŽÝÁÍÉŮÚŤĎŇÓ"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=30).read()
def check(css_url):
    css = get(css_url).decode()
    urls = sorted(set([("https:"+x if x.startswith("//") else x) for x in re.findall(r"url\(['\"]?((?:https?:)?//[^)'\"]+)", css)]))
    cmap = set()
    for u in urls:
        try:
            f = TTFont(io.BytesIO(get(u)))
            cmap |= set(f.getBestCmap().keys())
        except Exception as e:
            pass
    missing = [c for c in NEED if ord(c) not in cmap]
    return len(urls), missing
res = {}
g = ["Anton","Archivo","Archivo Black","Big Shoulders Display","Bricolage Grotesque","Instrument Serif","Fraunces","Newsreader","JetBrains Mono","IBM Plex Mono","Space Grotesk","Inter Tight","Bebas Neue","Barlow Condensed","Unbounded","Syne","Kode Mono","Geist","Geist Mono","Familjen Grotesk","Oswald","Space Mono","Mona Sans","Hanken Grotesk","Chakra Petch","Teko","Saira Condensed","DM Serif Display","Playfair Display","Instrument Sans","Martian Mono","Darker Grotesque","Antonio","Big Shoulders Stencil"]
for fam in []:
    u = "https://fonts.googleapis.com/css2?family=" + urllib.parse.quote(fam) + "&display=swap"
    try: res["G:"+fam] = check(u)
    except Exception as e: res["G:"+fam] = ("ERR", str(e)[:60])
fs = ["satoshi","clash-display","general-sans","cabinet-grotesk","switzer","zodiak","tanker","boska","erode","supreme","chillax","panchang","clash-grotesk","sentient","gambetta","array","stardom","bespoke-stencil","author"]
for s in fs:
    u = f"https://api.fontshare.com/v2/css?f[]={s}@400&display=swap"
    try: res["F:"+s] = check(u)
    except Exception as e: res["F:"+s] = ("ERR", str(e)[:60])
for k,v in res.items():
    print(k, "->", "OK" if v[0] not in ("ERR",0) and not v[1] else v)
