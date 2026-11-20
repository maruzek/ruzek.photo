# Generates board/notes/inspiration.json + inspiration.md (Czech)
import json, os
BASE = "/tmp/claude-1000/-home-martin-dev-ruzek-photo/33f0927f-29de-40ea-9c7d-39bc192aaab0/scratchpad/board"
S = lambda f: "shots/" + f

sites = [
 dict(name="Aaron Brimhall – Action & Automotive Photographer", url="https://www.aaronbrimhall.com/", category="fotograf (akce / auto / sport)",
  why="Nejbližší analogie Martinovi: akční fotograf s webem jako hledáček – REC, timecode, ořezové značky, magenta akcent, svislé pásy galerie a pixelový ‚image generator‘ z dlaždic. Awwwards HM (29. 10. 2026).",
  shots=[(S("insp-brimhall-d-hero.jpg"),"Hero: logo jako maska fotky + HUD hledáčku (REC, timecode), CTA v rohu"),
         (S("insp-brimhall-d-scroll2.jpg"),"Full-bleed foto s UI hledáčku a pásem náhledů"),
         (S("insp-brimhall-d-scroll3.jpg"),"Svislé pásy (accordion) galerie + kurzíva THOSE WHO GET IT"),
         (S("insp-brimhall-d-scroll5.jpg"),"Pixelová mřížka dlaždic (image generator) – přímá inspirace pro rozpad loga")],
  tech=["Webflow","GSAP","ScrollTrigger","Lenis","Barba.js","IBM Plex Mono + Inter"]),
 dict(name="Justin Jefferson (JJettas)", url="https://jjettas.com/", category="sportovec / sportovní brand",
  why="Awwwards SOTD + Developer Award (7. 11. 2026). Sportovní storytelling: kartičky ‚Signature moments‘ na yardových číslech, dot‑matrix typografie, diagonální přechody sekcí, galerie komunity.",
  shots=[(S("insp-jjettas-d-hero.jpg"),"Hero: portrét + podpis + mini kartička, textura míče v pozadí"),
         (S("insp-jjettas-d-scroll1.jpg"),"Sběratelské kartičky momentů nad obří typografií a yardovými čísly"),
         (S("insp-jjettas-d-scroll2.jpg"),"Dot‑matrix/halftone písmo – typografie z ‚pixelů‘, blízké rozpadu dlaždic"),
         (S("insp-jjettas-d-scroll6.jpg"),"Diagonální stěrač přechodu + mozaika fotek z komunity")],
  tech=["Next.js (Vercel)","Lenis","vlastní display font (beachwood)"]),
 dict(name="Lando Norris", url="https://landonorris.com/", category="sportovec (F1) / editorial motion",
  why="Awwwards SOTD (17. 11. 2025) a Site of the Year 2025, studio OFF+BRAND. Mix serifu a sansu, jeden neonový akcent (lime), rozházené fotky, ručně psaný ‚Collabs‘ – vzor pro podpis ruzek.jpg.",
  shots=[(S("insp-landonorris-d-scroll1.jpg"),"Manifest: verzálky sans + serif v akcentní lime"),
         (S("insp-landonorris-d-scroll2.jpg"),"Rozházená koláž fotek s parallaxou na topografických liniích"),
         (S("insp-landonorris-d-scroll5.jpg"),"Mřížka ‚Hall of fame‘ – objekty v buňkách s popisky"),
         (S("insp-landonorris-d-scroll6.jpg"),"Ručně kreslený nápis přes logo‑marquee partnerů")],
  tech=["Webflow","Lenis","3D/WebGL","Mona Sans + Brier"]),
 dict(name="Nick Ho – Dutch Racing Driver", url="https://nickho-motorsports.nl/", category="sportovec (motorsport)",
  why="Awwwards SOTD + Developer Award (11. 10. 2026). Scoreboard estetika: obří startovní číslo, statistiky, kapitoly 4/5, šachovnicový (dlaždicový) přechod a galerie z otáčených karet.",
  shots=[(S("insp-nickho-d-hero.jpg"),"Hero: ČB foto + obří číslo 98 + statistiky (scoreboard)"),
         (S("insp-nickho-d-scroll3.jpg"),"Sticky kapitoly s počítadlem 4/5 a tlačítkem SKIP"),
         (S("insp-nickho-d-scroll5.jpg"),"Šachovnicový dlaždicový přechod mezi sekcemi"),
         (S("insp-nickho-m-hero.jpg"),"Mobil: číslo + jméno v Anton, foto přes celou výšku")],
  tech=["Webflow","GSAP","ScrollTrigger","SplitText","CustomEase","Lenis","Three.js","Swiper","Anton"]),
 dict(name="GARUDA 2026: The Locker Room (OFFWG)", url="https://garuda2026.offwg.com/", category="fotbal / kampaň",
  why="Fotbalová (ASEAN Cup) kampaň z kategorie Sports na Awwwards: plakáty hráčů v kruhovém karuselu s číselníkem dresů a 3D šatna – ukázka, jak udělat z turnaje zážitek.",
  shots=[(S("insp-garuda-d-scroll1.jpg"),"Intro: vějíř plakátů kolem trofeje"),
         (S("insp-garuda-d-scroll3.jpg"),"Kruhový karusel + číselník dresů a seznam jmen po oblouku"),
         (S("insp-garuda-d-scroll6.jpg"),"3D šatna se skříňkami – vstup do detailu")],
  tech=["Lenis","Geist + Boldonse","WebGL/3D"]),
 dict(name="WaveRun Media", url="https://waverunmedia.com/", category="sportovní / kulturní média, video",
  why="Awwwards HM (27. 9. 2026). Mediální produkce (NBA ad.) – mřížka video příběhů, žaluziový reveal, svislé pásy s fotkami; přímá reference pro sekci reels/vertikální video.",
  shots=[(S("insp-waverun-d-hero.jpg"),"Hero video + jednoduché claimy"),
         (S("insp-waverun-d-scroll1.jpg"),"‚Stories in Motion‘ – mřížka video karet"),
         (S("insp-waverun-d-scroll2.jpg"),"Žaluziový (blinds) reveal přes foto běžce"),
         (S("insp-waverun-d-scroll4.jpg"),"Svislé pásy obrázků – formát vhodný pro reels")],
  tech=["WordPress","Lenis","Satoshi"]),
 dict(name="PSP – Production Portugal", url="https://productionportugal.com/", category="produkční studio (film/foto)",
  why="Awwwards SOTD + Developer Award (18. 11. 2026). Kinetická typografie: manifest uprostřed, po stranách stěny názvů projektů – vzor pro ‚zeď klientů/akcí‘ s náhledem při hoveru.",
  shots=[(S("insp-psp-d-hero.jpg"),"Manifest + sloupce seznamu projektů, magenta/mint"),
         (S("insp-psp-d-scroll1.jpg"),"Text se rozpadá/mizí při scrollu (SplitText)")],
  tech=["Webflow","GSAP","ScrollTrigger","SplitText","Lenis","Neue Haas Grotesk + PP Eiko"]),
 dict(name="Jon McCormack Photography", url="https://jonmccormack.com/", category="fotograf (dobrodružství / krajina)",
  why="Awwwards HM (29. 10. 2026). Ukázka klidu: vstupní brána ‚Enter‘ a nekonečný horizontální karusel čtvercových sérií. Poučení i varování (gate zdržuje obsah).",
  shots=[(S("insp-mccormack-d-hero.jpg"),"Vstupní brána WONDER… + Enter přes celoplošnou fotku"),
         (S("insp-mccormack-d-entered.jpg"),"Nekonečný horizontální pás sérií s kurzívními názvy")],
  tech=["WordPress","GSAP","ScrollTrigger","SplitText","Aeonik Pro + Cormorant"]),
 dict(name="Lusion", url="https://lusion.co/", category="kreativní studio (WebGL)",
  why="Špička real‑time 3D na webu; načítané skripty `hoisted.*.js` naznačují Astro – důkaz, že Astro unese i těžký WebGL. Reference pro ‚vrstvu efektu‘ nad statickým obsahem.",
  shots=[(S("insp-lusion-d-hero.jpg"),"Hero: 3D objekty v zaobleném rámu, minimální UI")],
  tech=["pravděpodobně Astro","vlastní WebGL","Aeonik"]),
 dict(name="Codrops demo: Atelier North (Astro + GSAP)", url="https://atelier-north.crnacura.workers.dev/", category="Codrops demo / implementace dlaždic",
  why="Demo k tutoriálu Kaisei Sadatoki (Codrops, 9. 10. 2026): Astro + GSAP + Lenis, scroll pixelový přechod mezi sekcemi a canvas pixel reveal fotek. Běží na Cloudflare Workers – přesně Martinův stack.",
  shots=[(S("insp-codrops-atelier-d-hero.jpg"),"Hero: Anton + Kode Mono, rámečková mřížka"),
         (S("insp-codrops-atelier-d-scroll2.jpg"),"Canvas pixel reveal fotky (rozpixelovaný stav dole)"),
         (S("insp-codrops-atelier-d-scroll3.jpg"),"Pixelový přechod sekce – dlaždice s náhodným staggerem"),
         (S("insp-codrops-atelier-d-scroll5.jpg"),"Karty členů vyskakují nad obří typografií")],
  tech=["Astro","GSAP","ScrollTrigger","Lenis","Cloudflare Workers","Kode Mono + Anton"]),
 dict(name="Codrops demo: WebGL Pixel Effect on Scroll", url="https://pixelimageeffect.pages.dev/", category="Codrops demo / galerie",
  why="Demo k tutoriálu Chakib Mazouni (Codrops, 2. 2. 2026): vícestránková galerie v Astro, shader reveal fotek při scrollu, Barba přechod do detailu. Hostováno na Cloudflare Pages.",
  shots=[(S("insp-codrops-webglgallery-d-hero.jpg"),"Editoriální rozvržení ČB fotek s nadpisem"),
         (S("insp-codrops-webglgallery-d-scroll1.jpg"),"Volná asymetrická galerie – fotky se odhalují shaderem")],
  tech=["Astro","GSAP","Three.js","Barba.js","Cloudflare Pages"]),
 dict(name="Igloo Inc.", url="https://www.igloo.inc/", category="WebGL / kostky a bloky",
  why="Awwwards Site of the Year i Developer SOTY 2024 (studio abeto). Ledové bloky a krystalické struktury – reference pro 3D verzi izometrické kostky. (Headless prohlížeč WebGL nevykreslil, proto bez screenshotu.)",
  shots=[], tech=["Three.js/WebGL","fluid simulace"]),
 dict(name="Codrops: SVG Mask Transitions on Scroll", url="https://tympanus.net/codrops/2026/03/11/svg-mask-transitions-on-scroll-with-gsap-and-scrolltrigger/", category="Codrops tutoriál",
  why="Čtyři scroll přechody fotek přes SVG masku (žaluzie, mřížka…) – bílé obdélníky generované JS v <mask>, scrub ScrollTrigger. Snadno přepsatelné na kosočtvercové dlaždice. Demo: tympanus.net/Tutorials/SVGMaskScrollTransition/ (headless blokuje Cloudflare).",
  shots=[], tech=["GSAP","ScrollTrigger","SVG mask"]),
 dict(name="Codrops: Responsive Grid Layout Transitions with GSAP Flip", url="https://tympanus.net/codrops/2026/01/20/animating-responsive-grid-layout-transitions-with-gsap-flip/", category="Codrops tutoriál",
  why="Přepínání hustoty mřížky galerie přes Flip.getState → změna data atributu → Flip.from. Základ pro filtr Akce / Sport / Portréty. Demo: tympanus.net/Tutorials/GridLayoutTransitions/.",
  shots=[], tech=["GSAP","Flip","CSS Grid"]),
 dict(name="Case study: portfolio fotografa Mathijse Hanenkampa (hontran.dev)", url="https://www.hontran.dev/blog/mathijs-hanenkamp-photography-portfolio-case-study", category="case study / fotograf",
  why="Popis Awwwards HM portfolia portrétního a dokumentárního fotografa: jeden GSAP timeline pro loader → první foto, Three.js shader prolínání, WebGL až u galerie, DPR max 2, gsap.matchMedia() pro reduced motion. (Samotný web se mi v headless nenačetl – neuvádím ho jako ověřený.)",
  shots=[], tech=["WordPress","GSAP","ScrollTrigger","Three.js"]),
]

patterns = [
 dict(name="Preloader: skládání loga z dlaždic", description="Kosočtvercové dlaždice přiletí z okrajů a složí roh kostky; poté se logo zmenší do hlavičky (Flip) a stránka se odkryje.",
  source="https://atelier-north.crnacura.workers.dev/", shot=S("insp-codrops-atelier-d-scroll3.jpg"),
  fit="Logo už je ‚rozpad do dlaždic‘ – loader jen přehraje rozpad pozpátku. Okamžitě vlastní, nezaměnitelné.",
  impl="Inline SVG s <polygon> pro každou dlaždici; gsap.from(tiles,{x,y,opacity,stagger:{each:0.008,from:'edges'}}), pak Flip do loga v headeru. Délka ≤1,2 s; při opakované návštěvě (sessionStorage) přeskočit.",
  caveat="Nikdy neblokovat LCP – hero foto se načítá souběžně, loader je overlay max ~1 s. prefers-reduced-motion: statické logo + fade 150 ms."),
 dict(name="Dlaždicový přechod mezi sekcemi (scrub)", description="Hrana sekce se ‚rozsype‘ na mřížku dlaždic, které se náhodně přebarví na barvu další sekce podle scrollu.",
  source="https://tympanus.net/codrops/2026/10/09/architecture-studio-astro-gsap/", shot=S("insp-codrops-atelier-d-scroll3.jpg"),
  fit="Přímá aplikace logo systému (šedý gradient tmavý střed → světlé okraje) jako předělu mezi Akce / Sport / Portréty.",
  impl="Dle tutoriálu: JS vygeneruje 25×6 buněk, gsap.to(cells,{backgroundColor, stagger:{each:0.003, from:'random'}, scrollTrigger:{start:'top bottom', end:'top 20%', scrub:true}}). Pro kosočtverce: SVG polygony nebo CSS clip-path na rotovaných čtvercích.",
  caveat="Stovky DOM uzlů – použít 1 SVG nebo <canvas>; animovat jen opacity/fill. Reduced motion: tvrdý střih barvy."),
 dict(name="Pixel / dlaždicový reveal fotky", description="Fotka se objeví nejdřív jako hrubá mozaika a ostří se po krocích (8→16→32→plné rozlišení).",
  source="https://atelier-north.crnacura.workers.dev/", shot=S("insp-codrops-atelier-d-scroll2.jpg"),
  fit="Mozaika = dlaždice loga; zároveň evokuje ‚vyvolávání‘ fotky. Hodí se na featured snímky, ne na každou fotku.",
  impl="<canvas> nad <img>: drawImage do malého offscreen canvasu a zpět s imageSmoothingEnabled=false, kroky časované GSAP/IntersectionObserver. Varianta WebGL: shader s uniform uPixels.",
  caveat="Ne pro LCP obrázek. Originální <img> s alt a srcset zůstává v DOM (SEO, čtečky). Reduced motion: rovnou ostrý obrázek."),
 dict(name="Pixelová mřížka jako interaktivní prvek", description="Pole čtverečků, které reaguje na vstup (hover/typing) a skládá obraz; akcentní buňky v brand barvě.",
  source="https://www.aaronbrimhall.com/", shot=S("insp-brimhall-d-scroll5.jpg"),
  fit="Fotograf‑kolega používá dlaždice jako hravý prvek; u Martina by šlo o ‚rozpadlé logo‘ reagující na kurzor (tiles odletí od kurzoru).",
  impl="Canvas 2D, mřížka buněk, vzdálenost od kurzoru → offset/opacity, gsap.ticker pro render; quickTo pro hladký pohyb.",
  caveat="Na touch zařízeních bez hoveru – zobrazit statický stav nebo reagovat na scroll. Zastavit ticker mimo viewport."),
 dict(name="HUD hledáčku (REC, timecode, ořezové značky)", description="Tenké UI fotoaparátu kolem hero: REC tečka, běžící čas, ořezové rohy, ISO/čas závěrky jako metadata.",
  source="https://www.aaronbrimhall.com/", shot=S("insp-brimhall-d-hero.jpg"),
  fit="Komunikuje ‚fotím právě teď‘ = USP výběru ještě týž den. Rohy hledáčku = rohy kostky z loga.",
  impl="Čisté CSS + jeden setInterval pro pražský čas (Intl.DateTimeFormat, Europe/Prague). EXIF z build‑time (Astro + exifr) do data atributů.",
  caveat="Dekorace s aria-hidden; čas neoznamovat čtečkám. Mono písmo nesmí být pod 12 px."),
 dict(name="Scoreboard hero: obří číslo + statistiky", description="Jedno obří číslo (startovní číslo / skóre) přes fotku, kolem drobné statistiky a ‚Next race‘.",
  source="https://nickho-motorsports.nl/", shot=S("insp-nickho-d-hero.jpg"),
  fit="Pro sport i akce: ‚24 h – výběr na sítě týž den‘, ‚120+ zápasů‘, ‚Další akce: …‘ (čísla zástupná – doplnit reálná). Silná vizuální kotva i na mobilu.",
  impl="Counter: gsap.to(obj,{val:target, snap:{val:1}, onUpdate}) s font-variant-numeric: tabular-nums; ScrollTrigger once:true.",
  caveat="Konečná hodnota musí být v HTML (bez JS a pro SEO); počítadlo jen vizuální vrstva. Reduced motion: žádné počítání."),
 dict(name="Sticky kapitoly s počítadlem (timeline)", description="Pinovaná sekce, kde se střídají kapitoly s fotkou a textem, vpravo dole 4/5 a tlačítko Skip.",
  source="https://nickho-motorsports.nl/", shot=S("insp-nickho-d-scroll3.jpg"),
  fit="‚Jak probíhá den akce‘: příjezd → focení → výběr do 3 h → reels → finální galerie. Vysvětluje USP krok za krokem.",
  impl="ScrollTrigger pin + timeline s labely, snap:'labelsDirectional'; Skip = lenis.scrollTo(konec sekce).",
  caveat="Na mobilu raději nepinovat – obyčejný stack. Pin + Lenis: ScrollTrigger.scrollerProxy není potřeba, ale volat lenis.on('scroll', ScrollTrigger.update)."),
 dict(name="Šachovnicový / dlaždicový stěrač", description="Přechod sekce sestavený z velkých čtverců jako cílová vlajka; dlaždice mizí po vlnách.",
  source="https://nickho-motorsports.nl/", shot=S("insp-nickho-d-scroll5.jpg"),
  fit="Sportovní kód (cíl, rozhodčí, šachovnice) a zároveň dlaždicový systém loga – v kosočtvercích vznikne izometrická vlajka.",
  impl="CSS grid dlaždic + gsap stagger:{grid:[r,c], from:'center'|'edges', amount:0.6}; nebo SVG maska.",
  caveat="Krátké (≤600 ms), žádné blikání >3×/s (WCAG 2.3.1). Reduced motion: crossfade."),
 dict(name="Galerie ze sběratelských karet", description="Fotky jako kartičky s rámečkem, popiskem a statistikou, volně rozmístěné a mírně natočené; při scrollu se přeskupují.",
  source="https://jjettas.com/", shot=S("insp-jjettas-d-scroll1.jpg"),
  fit="Turnaje a florbal: ‚karta hráče‘ s jménem týmu, datem, výsledkem. Fanoušci a kluby to sdílí.",
  impl="CSS 3D transform + GSAP ScrollTrigger (rotate/y parallax); detail přes Flip. Volitelně Draggable.",
  caveat="Kartičky musí být fokusovatelné (<a>/<button>) s viditelným focusem; drag má klávesovou alternativu."),
 dict(name="Dot‑matrix / halftone typografie", description="Obří nápis složený z teček, které se při scrollu zahušťují nebo rozpadají.",
  source="https://jjettas.com/", shot=S("insp-jjettas-d-scroll2.jpg"),
  fit="Evokuje LED tabuli na stadionu; zároveň stejný princip jako logo (tvar z jednotlivých dílů).",
  impl="Canvas: text vykreslit do offscreen canvasu, navzorkovat pixely do bodů, animovat poloměr; nebo SVG pattern + mask na textu.",
  caveat="Skutečný text duplikovat v HTML (visually-hidden nebo jako nadpis); canvas aria-hidden."),
 dict(name="Kruhový karusel s číselníkem", description="Karty na oblouku kolem středového objektu, vpravo číselník (číslo dresu) a seznam jmen po oblouku.",
  source="https://garuda2026.offwg.com/", shot=S("insp-garuda-d-scroll3.jpg"),
  fit="Pro sportovní reportáž z turnaje: týmy/zápasy na oblouku, číselník = skóre nebo číslo zápasu.",
  impl="CSS transform rotate(n·deg) translateY(-R) kolem středu; GSAP Observer (wheel/touch/drag) s snap na položky.",
  caveat="Wheel‑jacking frustruje – nechat normální scroll stránky, karusel ovládat šipkami/tlačítky a drag."),
 dict(name="Svislé pásy / accordion galerie", description="Úzké svislé pásy fotek, které se při hoveru/fokusu rozšíří a ukážou popisek.",
  source="https://www.aaronbrimhall.com/", shot=S("insp-brimhall-d-scroll3.jpg"),
  fit="Svislý formát = reels a stories. Ideální pro sekci ‚Výběr do 24 h‘ – ukázat 9:16 výstupy.",
  impl="Flexbox + flex-grow transition (nebo CSS grid-template-columns animace), :hover i :focus-within; na mobilu horizontální scroll-snap.",
  caveat="Animace layoutu – používat jen pro ≤10 položek; preferovat transform: scaleX s inverzí obsahu, nebo View Transitions."),
 dict(name="Reels v rámu telefonu / mřížka video příběhů", description="Krátká svislá videa v kartách nebo v rámečku telefonu, hrají jen ve viewportu.",
  source="https://waverunmedia.com/", shot=S("insp-waverun-d-scroll1.jpg"),
  fit="Přímá prezentace USP – vertikální reels. Rám telefonu ukazuje, jak to vypadá na Instagramu @ruzek.jpg.",
  impl="<video muted playsinline loop preload='none' poster> + IntersectionObserver play/pause; H.264 + AV1, 720p, <2 MB/klip; hosting Cloudflare Stream nebo R2.",
  caveat="Autoplay jen bez zvuku; reduced motion → zobrazit poster s tlačítkem Přehrát. Titulky pro mluvené slovo. Nepřehrávat víc než 2–3 videa naráz."),
 dict(name="Žaluziový / SVG mask reveal", description="Fotka se odkryje přes vodorovné pásy nebo mřížku obdélníků řízenou scrollem.",
  source="https://tympanus.net/codrops/2026/03/11/svg-mask-transitions-on-scroll-with-gsap-and-scrolltrigger/", shot=S("insp-waverun-d-scroll2.jpg"),
  fit="Fotografický ‚závěrka‘ efekt; s kosočtverci místo pásů vznikne vlastní dlaždicový reveal.",
  impl="Dle Codrops: <svg viewBox='0 0 100 100'> s <mask> (černý rect + <g> s bílými recty generovanými JS), <image preserveAspectRatio='xMidYMid slice'>, scaleY/scaleX rectů scrubem; +0,1 přesah proti 1px mezerám.",
  caveat="SVG <image> nemá srcset – pro velké fotky raději CSS mask-image/clip-path nad <img>. Reduced motion: bez masky."),
 dict(name="Kinetická ‚zeď‘ klientů / akcí + náhled u kurzoru", description="Dlouhé seznamy názvů projektů po stranách manifestu; při hoveru se u kurzoru objeví náhled fotky.",
  source="https://productionportugal.com/", shot=S("insp-psp-d-hero.jpg"),
  fit="Eventy jsou o referencích: konference, univerzity, firmy, kluby. Seznam = důkaz, náhled = kvalita.",
  impl="Seznam jako <ul>; náhled: gsap.quickTo(el,'x'/'y',{duration:0.4}) + clip-path inset reveal; obrázky přednačíst na hover (fetchpriority low).",
  caveat="Na touch zařízeních náhled nahradit inline miniaturou nebo tap‑to‑preview. Seznam musí dávat smysl i bez hoveru."),
 dict(name="Mix serif + sans s akcentními slovy, ručně psaný podpis", description="Manifest ve verzálkách, klíčová slova v jiném řezu/barvě; ručně psaný nápis přes sekci.",
  source="https://landonorris.com/", shot=S("insp-landonorris-d-scroll1.jpg"),
  fit="Hlas Martina: ‚FOTÍM AKCE, SPORT A LIDI – VÝBĚR MÁTE JEŠTĚ TÝŽ DEN.‘ Ručně psané ‚ruzek.jpg‘ jako hravý podpis (DrawSVG).",
  impl="SplitText (words/lines) + ScrollTrigger; podpis jako SVG path + DrawSVGPlugin (od GSAP 3.13 jsou všechny pluginy zdarma).",
  caveat="SplitText rozbíjí text pro čtečky – použít aria-label na rodiči / nové SplitText s aria: 'auto'. Ověřit zalamování dlouhých českých slov (hyphens: auto, lang='cs')."),
 dict(name="Rozházená koláž s parallaxou", description="Fotky různých velikostí volně rozmístěné, každá s jinou rychlostí scrollu.",
  source="https://landonorris.com/", shot=S("insp-landonorris-d-scroll2.jpg"),
  fit="Backstage z akcí, atmosféra turnaje – méně formální než mřížka.",
  impl="data-speed + ScrollTrigger (nebo ScrollSmoother effects), jen transform: translate3d.",
  caveat="Rozdílné rychlosti mohou vadit lidem s vestibulárními potížemi – v reduced motion vypnout parallax."),
 dict(name="Nekonečný horizontální pás sérií", description="Smyčka čtvercových náhledů sérií, kterou lze táhnout/scrollovat, kurzívní názvy přes fotky.",
  source="https://jonmccormack.com/", shot=S("insp-mccormack-d-entered.jpg"),
  fit="Přehled kategorií (Konference, Univerzity, Fotbal, Florbal, Portréty) bez dlouhého scrollu.",
  impl="GSAP helper horizontalLoop() + Draggable/Observer, nebo CSS scroll-snap s duplikovanými položkami.",
  caveat="Vstupní ‚Enter‘ gate z McCormacka nepřebírat – zdržuje obsah a LCP. Smyčka musí jít zastavit (WCAG 2.2.2)."),
 dict(name="Přepínání hustoty / filtrování mřížky (Flip)", description="Galerie přepíná 2/3/4 sloupce nebo filtr kategorií a položky plynule přejedou na nové místo.",
  source="https://tympanus.net/codrops/2026/01/20/animating-responsive-grid-layout-transitions-with-gsap-flip/", shot="",
  fit="Portfolio s mnoha fotkami: filtr Akce / Sport / Portrét a hustota mřížky (kontaktní arch vs. velké fotky).",
  impl="const state = Flip.getState(items); grid.dataset.size = '4'; Flip.from(state,{duration:0.6, ease:'power3.inOut', absolute:true}).",
  caveat="Filtr jako <fieldset> s radio/tlačítky, aria-pressed; oznámit počet výsledků (aria-live='polite')."),
 dict(name="WebGL shader reveal + přechod do detailu", description="Fotky se při vstupu do viewportu odhalí shaderem; klik roztáhne fotku do detailu a stránka se přepne bez bílého bliknutí.",
  source="https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/", shot=S("insp-codrops-webglgallery-d-scroll1.jpg"),
  fit="Wow efekt pro case studies (konkrétní konference/turnaj) – a hotový Astro základ.",
  impl="Jeden sdílený Three.js canvas, Media třída = PlaneGeometry s texturou z <img>, uniform uProgress řízený ScrollTrigger; přechody Barba nebo Astro View Transitions.",
  caveat="WebGL inicializovat lazy až u galerie, DPR ≤2, pauza mimo viewport (viz case study Hanenkamp). Bez WebGL / reduced motion: CSS clip-path reveal."),
 dict(name="Karty vyskakující nad obří typografií", description="Obří slovo přes celou šířku; při hoveru/scrollu nad ním vyskakují barevné karty s detaily.",
  source="https://atelier-north.crnacura.workers.dev/", shot=S("insp-codrops-atelier-d-scroll5.jpg"),
  fit="Služby: AKCE / SPORT / PORTRÉTY jako obří slova, karty = typ zakázky, cena od, doba dodání.",
  impl="Pozicované karty + gsap.fromTo scale/rotation s ScrollTrigger nebo pointer událostmi.",
  caveat="Informace v kartách musí být dostupné i bez hoveru (např. pod slovem na mobilu)."),
 dict(name="Stránkové přechody (dlaždicová maska)", description="Při navigaci se obrazovka zakryje dlaždicemi loga a odkryje novou stránku.",
  source="https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/", shot="",
  fit="Konzistentní ‚podpis‘ webu, logo systém v pohybu na každém kliknutí.",
  impl="Astro <ClientRouter /> (View Transitions) nebo cross‑document @view-transition { navigation: auto } + ::view-transition-old/new s mask-image dlaždic; alternativně Barba + GSAP.",
  caveat="Cross‑document View Transitions nejsou ve všech prohlížečích – graceful fallback na běžnou navigaci. Reduced motion: okamžitý přechod."),
]

directions = [
 dict(name="A · KONTAKTNÍ ARCH (monochrom brutalist grid)",
  concept="Web jako fotografický kontaktní arch a technický list. Světlé ‚papírové‘ pozadí, černé linky mřížky, čísla políček, EXIF a timecode v mono písmu. Výběr pro sociální sítě se vyznačuje červeným ‚mastným tužkovým‘ kroužkem – vizuální metafora USP (vybráno ještě týž den). Bez dekorací, síla je v rytmu mřížky a v ostrých přechodech; pohyb je rychlý, krokovaný, jako posun filmu.",
  keywords=["kontaktní arch","mřížka","technické","syrové","rychlé","švýcarské","čísla políček"],
  palette=[dict(hex="#F2F1EE",role="bg – papír"),dict(hex="#FFFFFF",role="surface – karty/lightbox"),dict(hex="#0B0B0B",role="text + linky mřížky (17,4:1)"),dict(hex="#5F5F5B",role="muted – meta, EXIF (5,7:1)"),dict(hex="#E3E2DE",role="line/hover buňky"),dict(hex="#FF3B1F",role="accent – výběrový kroužek, REC (jen grafika/velký text, 3,2:1)"),dict(hex="#C2260E",role="accent‑text – odkazy v textu")],
  fonts=dict(display="Archivo (variabilní – úzké/široké řezy přes osu wdth)",body="Archivo",mono="JetBrains Mono",urls=["https://fonts.google.com/specimen/Archivo","https://fonts.google.com/specimen/JetBrains+Mono"]),
  hero="Celá obrazovka = arch 6×4 políček z jedné akce; políčka se rozsvěcují v rychlém sledu (jako sekvenční snímání), tři se zakroužkují červeně a ‚vyjedou‘ do svislého formátu 9:16 s popiskem ‚Na síti za 2 h 40 min‘. Jméno MARTIN RŮŽEK obří, úzký řez Archivo, přes horní hranu.",
  gallery="Hustá mřížka s přepínačem hustoty (2/4/8 sloupců – Flip) a filtrem Akce / Sport / Portrét; každé políčko má číslo, datum a EXIF. Lightbox = zvětšení políčka přes Flip, šipky ←→, popisek v mono.",
  logoUse="Černá varianta loga jako razítko v rohu archu; dlaždice loga = modul mřížky (rhombus jen v loaderu a jako kurzor ‚ořez‘). Rozpad loga = rozpad archu při přechodu stránky do jednotlivých políček.",
  motion="Krokované easingy (steps / CustomEase s ‚cvaknutím‘), Flip pro mřížku, žádný smooth scroll nebo jen jemný Lenis; tvrdé střihy místo fade. Rychlost = značka (‚dodám rychle‘).",
  refs=["https://www.aaronbrimhall.com/","https://atelier-north.crnacura.workers.dev/","https://productionportugal.com/","https://tympanus.net/codrops/2026/01/20/animating-responsive-grid-layout-transitions-with-gsap-flip/"],
  risks="Může působit chladně pro portréty a firemní klientelu; hustá mřížka na mobilu → nutný 2sloupcový režim. Červený akcent nesmí nést informaci sám (barvoslepost) – doplnit ikonou/textem."),
 dict(name="B · NOČNÍ ZÁPAS (stadion, reflektory, neon)",
  concept="Tma stadionu pod reflektory. Fotky vystupují ze tmy jako hráči v kuželu světla, jediný neonový akcent (lime jako LED tabule a reflektor). Prvky televizního přenosu – skóre, lower thirds, časomíra, číslo dresu – nesou informace (počet akcí, čas dodání). Pro firemní eventy funguje stejně: konference je také ‚show pod světly‘.",
  keywords=["noc","reflektory","LED tabule","energie","broadcast","zrno","kontrast"],
  palette=[dict(hex="#07090B",role="bg – noční obloha"),dict(hex="#12161A",role="surface – karty, panely"),dict(hex="#F3F5F2",role="text (18,2:1)"),dict(hex="#8A939A",role="muted (6,4:1)"),dict(hex="#C6FF00",role="accent – LED/reflektor, CTA (16,8:1)"),dict(hex="#FF4D2E",role="sekundární – LIVE / REC štítek (6,0:1)")],
  fonts=dict(display="Big Shoulders Display (stadionové kondenzované verzálky)",body="Geist",mono="Geist Mono",urls=["https://fonts.google.com/specimen/Big+Shoulders+Display","https://fonts.google.com/specimen/Geist","https://fonts.google.com/specimen/Geist+Mono"]),
  hero="Černá obrazovka, rozsvítí se reflektor (radiální maska sledující kurzor/scroll) a odkryje fotku gólové radosti; vpravo telefon s běžícím reelem ‚LIVE‘ a scoreboard: VÝBĚR 24 H · N ZÁPASŮ · N AKCÍ (počítadla, reálná čísla doplnit). Spodní lišta jako lower third: ‚Martin Růžek — fotograf akcí a sportu, Praha‘.",
  gallery="Horizontální ‚zápasový den‘ (pinovaný scroll): příjezd → rozcvička → zápas → oslava → výběr na sítě; skew podle rychlosti scrollu. Kategorie jako karty hráčů (jjettas). Detail události = case study se sticky časovou osou (Nick Ho).",
  logoUse="Dlaždice loga jako LED pixely tabule: loader = logo poskládané z rozsvěcujících se dlaždic; čísla v počítadlech mohou mít dlaždicovou texturu. Šedá gradientová varianta svítí od středu (reflektor) k okrajům.",
  motion="Světlo jako pohyb: maskované reveal přes radiální gradient, LED počítadla, velocity skew, rychlé stagger dlaždic. Signaturní moment = ‚rozsvícení stadionu‘ při vstupu sekce.",
  refs=["https://nickho-motorsports.nl/","https://landonorris.com/","https://jjettas.com/","https://garuda2026.offwg.com/","https://waverunmedia.com/"],
  risks="Tmavý web snižuje čitelnost delších textů a může být ‚moc sport‘ pro univerzity a korporát – mít světlé case‑study stránky nebo střídmější tón u Akcí. Neon nesmí přebít fotky; zrno/šum jen lehké CSS (ne velké PNG)."),
 dict(name="C · ZPRAVODAJ (editoriální magazín, světlý)",
  concept="Web jako fotožurnalistický magazín / sobotní příloha. Krémový papír, velký serif v kurzívě, úzké sloupce textu, popisky jako v novinách (kdo, kde, kdy). Každá zakázka je ‚reportáž‘ s titulkem, perexem a sérií fotek. Nejlépe prodává důvěru firmám a univerzitám, sport se ukazuje jako dokument, ne jako reklama.",
  keywords=["magazín","reportáž","důvěra","papír","serif","klid","dokument"],
  palette=[dict(hex="#F4EFE6",role="bg – novinový papír"),dict(hex="#FFFFFF",role="surface – lightbox, formuláře"),dict(hex="#171513",role="text – tiskařská čerň (15,9:1)"),dict(hex="#6A655D",role="muted – popisky (5,1:1)"),dict(hex="#B8361F",role="accent – červená tiskařská barva, rubriky (5,1:1)"),dict(hex="#1E3A5C",role="sekundární – odkazy, sport rubrika (10,1:1)")],
  fonts=dict(display="Instrument Serif (vč. kurzívy)",body="Instrument Sans",mono="IBM Plex Mono (popisky, EXIF, čísla vydání)",urls=["https://fonts.google.com/specimen/Instrument+Serif","https://fonts.google.com/specimen/Instrument+Sans","https://fonts.google.com/specimen/IBM+Plex+Mono"]),
  hero="Titulní strana: hlavička ‚MARTIN RŮŽEK · fotograf‘ jako masthead novin, číslo vydání = dnešní datum, hlavní fotka z poslední akce s titulkem v kurzívě (např. ‚Finále turnaje, Praha‘) a rubrikami Akce / Sport / Portréty. Nadpis se skládá po řádcích (SplitText lines).",
  gallery="Reportáže: střídání celostránkové fotky, dvojic a citátů; fotky se odhalují žaluziovou SVG maskou nebo shaderem (Codrops). Archiv = obsah čísla (seznam reportáží s náhledem u kurzoru).",
  logoUse="Šedá gradientová varianta jako ‚vinětka‘ v mastheadu a koncová značka článku (■ v novinách); rozpad dlaždic pouze v přechodech stránek a jako iniciála. Logo systém je tu tichý – kontrapunkt k fotkám.",
  motion="Pomalé, sebevědomé: line‑by‑line odhalování textu, mask reveal fotek, jemný Lenis, sticky popisky u fotek. Signaturní moment = ‚otočení stránky‘ (View Transition s dlaždicovou maskou).",
  refs=["https://landonorris.com/","https://jonmccormack.com/","https://pixelimageeffect.pages.dev/","https://tympanus.net/codrops/2026/03/11/svg-mask-transitions-on-scroll-with-gsap-and-scrolltrigger/","https://www.hontran.dev/blog/mathijs-hanenkamp-photography-portfolio-case-study"],
  risks="Nejmenší ‚wow‘ a nejblíž běžným portfoliím – vyžaduje špičkovou typografii a výběr fotek. Serif v kurzívě s háčky (ř, ů) ověřit ve velkých velikostech; dlouhé české titulky lámat ručně."),
 dict(name="D · KOSTKA (izometrický dlaždicový systém)",
  concept="Celá identita vychází z loga: izometrická mřížka kosočtverců je osnova webu. Dlaždice se skládají do kostky (loader), rozpadají do mřížky (scroll), slouží jako masky fotek a jako stránkové přechody. Šedý gradient loga (tmavý střed → světlé okraje) určuje hloubku: obsah ve středu je ‚hotový‘, na okrajích se rozpadá. Výsledek je technicky nejvýraznější – ukazuje Martina jako fotografa i vývojáře.",
  keywords=["izometrie","dlaždice","rozpad","systém","hloubka","precizní","hravé"],
  palette=[dict(hex="#F4F4F2",role="bg – světlý okraj gradientu"),dict(hex="#D2D2D6",role="surface/tile‑light – mřížka, prázdné dlaždice"),dict(hex="#9A9AA2",role="tile‑mid – dekorace (jen grafika, 2,5:1)"),dict(hex="#62626A",role="muted text (5,5:1)"),dict(hex="#0E0E10",role="text + tile‑dark – střed kostky (17,5:1)"),dict(hex="#2F4BFF",role="accent – fokus, CTA, vybraná dlaždice (5,3:1)")],
  fonts=dict(display="Clash Display (Fontshare)",body="Switzer (Fontshare)",mono="Martian Mono (Google)",urls=["https://www.fontshare.com/fonts/clash-display","https://www.fontshare.com/fonts/switzer","https://fonts.google.com/specimen/Martian+Mono"]),
  hero="Uprostřed se z okrajů slétnou dlaždice do rohu kostky (logo); při prvním scrollu se kostka ‚rozloží‘ – tři plochy kostky se stanou třemi okny s fotkami Akce / Sport / Portréty (kosočtvercové masky), zbylé dlaždice odplavou do izometrické mřížky pozadí. Jméno MARTIN RŮŽEK v Clash Display, ruzek.jpg drobně v mono pod ním.",
  gallery="Galerie na izometrické mřížce: náhledy v kosočtvercových maskách, hover dlaždici ‚vysune‘ (translateY + stín jako 3. rozměr), klik ji roztáhne na celou obrazovku (Flip, maska se rozvine z kosočtverce na obdélník). Filtr kategorií přeskládá dlaždice (Flip + stagger from:'center').",
  logoUse="Maximální: loader (skládání), favicon/animovaná ikonka, kurzor (malá dlaždice), dlaždicový přechod sekcí i stránek, pixel/tile reveal fotek, prázdné stavy a 404 (rozsypaná kostka), OG obrázky generované z mřížky. Černá varianta pro světlé sekce, gradientová pro hero a tmavé sekce.",
  motion="Stagger po izometrických osách (grid stagger s from:'edges'/'center'), Flip, SVG/canvas dlaždice, volitelně WebGL instanced kosočtverce v hero. Signaturní moment = skládání/rozkládání kostky navázané na scroll.",
  refs=["https://atelier-north.crnacura.workers.dev/","https://www.aaronbrimhall.com/","https://nickho-motorsports.nl/","https://www.igloo.inc/","https://jjettas.com/","https://tympanus.net/codrops/2026/03/11/svg-mask-transitions-on-scroll-with-gsap-and-scrolltrigger/"],
  risks="Nebezpečí, že systém přebije fotky – kosočtvercové masky ořezávají snímky, proto v detailu vždy celý obdélník. Nejvyšší náročnost (výkon stovek dlaždic → canvas/WebGL, ne DOM) a nutná pečlivá reduced‑motion verze. Izometrie je ‚tech/krypto‘ klišé, pokud se nedrží fotografie v centru."),
]

out = dict(sites=[dict(name=s["name"],url=s["url"],category=s["category"],why=s["why"],shots=[dict(file=f,caption=c) for f,c in s["shots"]],tech=s["tech"]) for s in sites], patterns=patterns, directions=directions)
os.makedirs(BASE+"/notes", exist_ok=True)
json.dump(out, open(BASE+"/notes/inspiration.json","w"), ensure_ascii=False, indent=2)

# ---------- Markdown ----------
L = []
L.append("# Inspirace – Martin Růžek (moodboard podklady)\n")
L.append("Rešerše k 20. 11. 2026. Všechny URL byly během rešerše načteny (HTTP 200 / headless prohlížeč). Screenshoty jsou v `board/shots/` (prefix `insp-`). Technologie u webů = detekce v prohlížeči (globální objekty, skripty, písma), ne tvrzení autorů.\n")
L.append("## 1. Weby\n")
for i,s in enumerate(sites,1):
    L.append(f"**{i}. {s['name']}** — <{s['url']}>  \n_{s['category']}_ · {', '.join(s['tech'])}  \n{s['why']}")
    if s["shots"]:
        L.append("  \nScreenshoty: " + "; ".join(f"`{f.split('/')[-1]}` ({c})" for f,c in s["shots"]))
    L.append("\n")
L.append("## 2. Katalog motion / komponent vzorů\n")
for i,p in enumerate(patterns,1):
    L.append(f"### 2.{i} {p['name']}\n")
    L.append(f"- **Co:** {p['description']}")
    L.append(f"- **Zdroj:** <{p['source']}>" + (f" · screenshot `{p['shot'].split('/')[-1]}`" if p['shot'] else ""))
    L.append(f"- **Proč pro Martina:** {p['fit']}")
    L.append(f"- **Implementace:** {p['impl']}")
    L.append(f"- **Výkon / přístupnost:** {p['caveat']}\n")
L.append("### Společná pravidla (platí pro všechny směry)\n")
L.append("- Jeden `gsap.matchMedia()` s podmínkami `(prefers-reduced-motion: no-preference)` a breakpointy – reduced‑motion verze je plnohodnotná, ne rozbitá.\n- LCP = skutečný `<img>` (AVIF/WebP, `srcset`, `fetchpriority=high`) v HTML, nikdy ne canvas/WebGL; loader jen overlay.\n- Fotky přes Astro `<Image>`/`<Picture>` nebo Cloudflare Images; lazy pod ohybem; rozměry vždy nastavené (CLS).\n- GSAP + pluginy jsou od verze 3.13 zdarma (SplitText, DrawSVG, MorphSVG, Flip…); Lenis volitelně, s `lenis.on('scroll', ScrollTrigger.update)`.\n- WebGL jen jako progresivní vrstva: lazy init, DPR ≤ 2, pauza mimo viewport, fallback na CSS.\n- Animovat jen `transform`/`opacity`/`clip-path`; dlaždice ve stovkách → canvas nebo jedno SVG.\n- Písma self‑hostovat (woff2, subset latin + latin‑ext), `font-display: swap`, preload jen display řezu.\n")
L.append("## 3. Čtyři směry\n")
L.append("Všechna písma jsou zdarma (Google Fonts / Fontshare) a programově ověřeno (fontTools, cmap), že obsahují ěščřžýáíéůúťďňó i velká písmena.\n")
for d in directions:
    L.append(f"### {d['name']}\n")
    L.append(d["concept"] + "\n")
    L.append("**Klíčová slova:** " + ", ".join(d["keywords"]) + "\n")
    L.append("**Paleta:**\n")
    L.append("| HEX | role |\n|---|---|")
    for c in d["palette"]: L.append(f"| `{c['hex']}` | {c['role']} |")
    f = d["fonts"]
    L.append(f"\n**Písma:** display **{f['display']}**, text **{f['body']}**" + (f", mono **{f['mono']}**" if f.get('mono') else "") + "  \n" + " · ".join(f"<{u}>" for u in f["urls"]) + "\n")
    L.append(f"**Hero:** {d['hero']}\n")
    L.append(f"**Galerie:** {d['gallery']}\n")
    L.append(f"**Logo / dlaždice:** {d['logoUse']}\n")
    L.append(f"**Motion podpis:** {d['motion']}\n")
    L.append("**Reference:** " + ", ".join(f"<{r}>" for r in d["refs"]) + "\n")
    L.append(f"**Rizika:** {d['risks']}\n")
L.append("## Poznámky k ověření\n- Tympanus demo stránky (`/Tutorials/...`, `/Development/...`) blokuje Cloudflare challenge v headless prohlížeči – články byly načteny, demo screenshoty nejsou.\n- Igloo Inc a obys.agency se načetly, ale headless WebGL/loader nevykreslil použitelný obraz – bez screenshotů (obys proto v seznamu není).\n- mathijshanenkamp.com se nenačetl (timeout) – uvádím jen case study na hontran.dev.\n")
open(BASE+"/notes/inspiration.md","w").write("\n".join(L))
print("ok", len(sites), len(patterns), len(directions))
