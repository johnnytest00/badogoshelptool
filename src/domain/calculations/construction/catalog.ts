export type ConstructionCalculatorCategory = "roof" | "stair" | "concrete" | "auxiliary";
export type ConstructionCalculatorStatus = "verified" | "implemented_unverified" | "not_implemented";

export type ConstructionReference = {
  id: string;
  title: string;
  category: ConstructionCalculatorCategory;
  status: ConstructionCalculatorStatus;
  engineId: string | null;
  scope: string;
  limitation: string;
};

/** Coverage registry for the requested reference inventory. Only verified entries are selectable. */
export const constructionCalculatorCatalog: readonly ConstructionReference[] = [
  { id: "roof.rafter", title: "Szarufa-hossz és vágásszögek", category: "roof", status: "verified", engineId: "roof.rafter.geometry", scope: "Szimmetrikus tető félfesztávjának egyszerű háromszög-geometriája, vízszintes ereszkiüléssel.", limitation: "Szarufa-keresztmetszet, gerincülék, madárszáj, felfekvési levonás és statika nincs modellezve." },
  { id: "roof.gable", title: "Nyeregtető", category: "roof", status: "verified", engineId: "roof.geometry", scope: "Meglévő, ellenőrzött TetőPro nyeregtető-geometria.", limitation: "Csak geometriai terület és élek; a fedési darabszámhoz külön gyártói fedési adat kell." },
  { id: "roof.shed", title: "Félnyeregtető", category: "roof", status: "verified", engineId: "roof.geometry", scope: "Meglévő, ellenőrzött TetőPro félnyeregtető-geometria.", limitation: "Csak geometriai terület és élek; anyagkiosztás és statika nincs." },
  { id: "roof.mansard", title: "Manzárdtető", category: "roof", status: "verified", engineId: "roof.mansard.geometry", scope: "Szimmetrikus, két explicit törésponti szakaszból álló keresztmetszet területe és szakaszhosszai.", limitation: "Nem támogat eltérő síkokat, törésponti részleteket, eresz- és gerinccsomópontot vagy anyagkiosztást." },
  { id: "roof.hip", title: "Kontytető", category: "roof", status: "verified", engineId: "roof.geometry", scope: "Meglévő, ellenőrzött TetőPro szimmetrikus kontytető-geometria.", limitation: "A meglévő modell korlátai érvényesek; fedési kiosztás és statika nincs." },
  { id: "roof.truss", title: "Háromszögű faszerkezet geometriai vázlata", category: "roof", status: "verified", engineId: "roof.truss.envelope", scope: "Egyenlő osztású egyszerű háromszög burkológörbe és felsőöv-csomópontok.", limitation: "Rácsozat, kapcsolatok, anyagkihozatal, teherbírás és statikai igazolás nincs." },
  { id: "stair.wood.closed_straight", title: "Egyenes fa lépcső – zárt pofafa", category: "stair", status: "verified", engineId: "stair.straight.geometry", scope: "Egyszerű egyenes lépcső egységes fellépővel, kiosztással és emelkedési szöggel.", limitation: "Pofafa-kivágás, keresztmetszet, anyagmennyiség, fejmagasság és statika nincs." },
  { id: "stair.wood.open_straight", title: "Egyenes fa lépcső – nyitott tartó", category: "stair", status: "verified", engineId: "stair.straight.geometry", scope: "Az egyenes lépcső közös geometriai motorja.", limitation: "A fűrészfog-profil, tartó méretezése és statika nincs." },
  { id: "stair.wood.90_landing", title: "90°-os fa lépcső – pihenővel", category: "stair", status: "not_implemented", engineId: null, scope: "Két forduló ág, pihenő és fordulási irány.", limitation: "A forduló pihenővel még nincs modellezve." },
  { id: "stair.wood.90_winder", title: "90°-os fa lépcső – húzott fokokkal", category: "stair", status: "not_implemented", engineId: null, scope: "Forduló fokok belső és járóvonal-geometriája.", limitation: "A húzott fokok kiosztása és járóvonal-ellenőrzése hiányzik." },
  { id: "stair.wood.180_landing", title: "180°-os fa lépcső – pihenővel", category: "stair", status: "not_implemented", engineId: null, scope: "Két párhuzamos ág, pihenő és fordulási irány.", limitation: "A U-alakú elrendezés és nyílás-ellenőrzés még nincs modellezve." },
  { id: "stair.wood.180_winder", title: "180°-os fa lépcső – húzott fokokkal", category: "stair", status: "not_implemented", engineId: null, scope: "U-alakú forduló húzott fokokkal.", limitation: "A húzott fokok kiosztása, belső szélessége és járóvonal-ellenőrzése hiányzik." },
  { id: "stair.wood.three_landing", title: "Háromkarú fa lépcső – pihenőkkel", category: "stair", status: "not_implemented", engineId: null, scope: "Három kar és két pihenő.", limitation: "A karok összefűzött alaprajzi geometriája még nincs modellezve." },
  { id: "stair.wood.three_winder", title: "Háromkarú fa lépcső – húzott fordulókkal", category: "stair", status: "not_implemented", engineId: null, scope: "Három kar húzott fordulókkal.", limitation: "A fordulók részletes geometriája hiányzik." },
  { id: "stair.wood.spiral", title: "Csigalépcső geometriai becslése", category: "stair", status: "verified", engineId: "stair.spiral.geometry", scope: "Körgyűrű-szektor, kifejezett belső/külső átmérő, fordulási szög, járóvonal-sugár és fellépő.", limitation: "Központi oszlop, kivágás, fejmagasság, gyárthatóság és statika nincs." },
  { id: "stair.metal.straight", title: "Egyenes fémlépcső", category: "stair", status: "verified", engineId: "stair.straight.geometry", scope: "Egyenes lépcső-geometria.", limitation: "Acél tartó, alátámasztás és kapcsolat méretezése nincs." },
  { id: "stair.metal.zigzag", title: "Egyenes fémlépcső – fűrészfogas tartó", category: "stair", status: "verified", engineId: "stair.straight.geometry", scope: "Egyenes lépcső-geometria.", limitation: "A fűrészfogas tartó és kapcsolatok gyártási/statikai részlete nincs." },
  { id: "stair.metal.90_landing", title: "90°-os fémlépcső", category: "stair", status: "not_implemented", engineId: null, scope: "Forduló geometriája és pihenője.", limitation: "A forduló alaprajzi elrendezése nincs modellezve." },
  { id: "stair.metal.90_zigzag", title: "90°-os fémlépcső – fűrészfogas tartó", category: "stair", status: "not_implemented", engineId: null, scope: "Forduló és fűrészfogas tartó.", limitation: "A forduló és tartó geometriája nincs modellezve." },
  { id: "stair.metal.180_landing", title: "180°-os fémlépcső", category: "stair", status: "not_implemented", engineId: null, scope: "Két párhuzamos lépcsőkar és pihenő.", limitation: "A forduló alaprajzi elrendezése nincs modellezve." },
  { id: "stair.metal.180_zigzag", title: "180°-os fémlépcső – fűrészfogas tartó", category: "stair", status: "not_implemented", engineId: null, scope: "U-alakú forduló és fűrészfogas tartó.", limitation: "A forduló és tartó geometriája nincs modellezve." },
  { id: "stair.beveled_riser", title: "Ferde lépcsőelem vágási geometriája", category: "stair", status: "verified", engineId: "stair.beveled-riser.geometry", scope: "Explicit fellépő, belépő, túlnyúlás és vágási szögek.", limitation: "Kötés, rögzítés, megmunkálási ráhagyás és szerkezeti méretezés nincs." },
  { id: "stair.concrete_straight", title: "Egyenes betonlépcső", category: "stair", status: "not_implemented", engineId: null, scope: "Lépcsőkar, pihenő és betonmennyiség.", limitation: "A beton keresztmetszeti felbontás pontos konvenciója és vasalási részlet még nincs lezárva." },
  { id: "concrete.strip", title: "Sávalap – beton és kétoldali zsaluzat", category: "concrete", status: "verified", engineId: "concrete.strip.volume", scope: "Kézzel összesített tengelyhossz × explicit szélesség × mélység.", limitation: "Tengelyhosszt, keresztmetszeti változásokat, lépcsőzést és vasalást nem állapít meg." },
  { id: "concrete.pile", title: "Hengeres cölöpök – betonmennyiség", category: "concrete", status: "verified", engineId: "concrete.cylindrical-piles.volume", scope: "Darabszám × hengeres keresztmetszet × hossz.", limitation: "Csak egyenes, hengeres szár; talp, bővítés, vasalás, talaj és teherbírás nincs." },
  { id: "concrete.slab", title: "Alaplemez – beton és élzsaluzat", category: "concrete", status: "verified", engineId: "concrete.slab.volume", scope: "Téglalap alaprajzú, egyenletes vastagságú lemez.", limitation: "Vasalást, alapozási alkalmasságot és talajviszonyt nem számol." },
  { id: "concrete.ring", title: "Betongyűrű", category: "concrete", status: "verified", engineId: "concrete.ring.volume", scope: "Üreges körhenger beton- és belső térfogata.", limitation: "Gyártástechnológia, armatúra és emelési alkalmasság nincs." },
  { id: "concrete.paving", title: "Térburkolat – területalapú darabszám", category: "concrete", status: "verified", engineId: "concrete.paving.area", scope: "Téglalap terület osztva a megadott lap felületével, felfelé kerekítve.", limitation: "Vágás, kötésminta, hézag, szegély, aljzat és veszteség nincs." },
  { id: "concrete.blind_area", title: "Járdaszegély / épület körüli beton sáv", category: "concrete", status: "verified", engineId: "concrete.rectangular-apron.area", scope: "Téglalap alaprajz körüli, egyenletes szélességű sáv.", limitation: "Nem tetszőleges épületalaprajz; lejtés, dilatáció és vízelvezetés nincs." },
  { id: "concrete.mix", title: "Betonkeverék – megadott összetétel", category: "concrete", status: "verified", engineId: "concrete.mix.mass", scope: "Kézzel megadott cement kg/m³ és tömeg szerinti arányok.", limitation: "Nem tartalmaz receptjavaslatot, hozamot, nedvességet vagy betonminőséget." },
  { id: "concrete.rebar", title: "Betonacél – hossz és tömeg becslése", category: "concrete", status: "verified", engineId: "concrete.rebar.mass", scope: "Kör keresztmetszet × megadott hossz × megadott acélsűrűség.", limitation: "Nem tervez vasalást, átlapolást, hajlítást, lehorgonyzást vagy vágási tervet." },
  { id: "concrete.mesh", title: "Betonacél háló – rudak és tömeg becslése", category: "concrete", status: "verified", engineId: "concrete.mesh.mass", scope: "Téglalap háló; a megadott maximális osztáshoz illesztett egyenletes kiosztás.", limitation: "Nem tervez szerkezeti vasalást, átlapolást, toldást, távtartót vagy rögzítést." },
  { id: "aux.diagonal", title: "Derékszögű átló", category: "auxiliary", status: "verified", engineId: "geometry.right-angle-diagonal", scope: "Pitagorasz-tétel alapján átlóhossz és alapirányú szög.", limitation: "Kizárólag geometriai segédprogram; nem alapozási vagy szerkezeti méretezés." },
];

export const verifiedConstructionReferences = constructionCalculatorCatalog.filter((item) => item.status === "verified");

if (constructionCalculatorCatalog.length !== 33) {
  throw new Error(`Expected 33 construction calculator references, got ${constructionCalculatorCatalog.length}.`);
}
