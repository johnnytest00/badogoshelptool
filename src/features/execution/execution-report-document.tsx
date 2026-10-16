import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";
import "@/features/quotations/pdf-fonts";
import type { ExecutionPhotoRecord, ExecutionTaskRecord, ExecutionTimelineItem } from "./execution-data";

export type ExecutionReportSection = "overview" | "tasks" | "journal" | "events" | "photos" | "quotation";

export type ExecutionReportData = {
  organizationName: string;
  generatedAt: string;
  project: { name: string; clientName: string | null; location: string | null };
  plan: { title: string; description: string | null; tasks: ExecutionTaskRecord[]; timeline: ExecutionTimelineItem[]; sourceQuotationName: string | null; sourceQuotationStatus: string | null; sourceRevisionId: string | null; sourceRevisionNumber: number | null; sourceSubtotal: string | null; photos: Array<ExecutionPhotoRecord & { dataUri: string }> };
  sections: ExecutionReportSection[];
};

const styles = StyleSheet.create({
  page: { fontFamily: "Noto Sans", fontSize: 8.5, color: "#1b2833", paddingTop: 46, paddingBottom: 45, paddingHorizontal: 44, backgroundColor: "#ffffff" },
  header: { borderBottomWidth: 1, borderBottomColor: "#d9e1e5", paddingBottom: 14, marginBottom: 18, flexDirection: "row", justifyContent: "space-between" },
  eyebrow: { fontSize: 7.5, color: "#60737e", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 },
  org: { fontSize: 13, fontWeight: 700, color: "#173d4a" },
  title: { fontSize: 18, fontWeight: 700, color: "#173d4a", textAlign: "right" },
  reference: { fontSize: 7.5, color: "#60737e", textAlign: "right", marginTop: 3 },
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: "#173d4a", borderBottomWidth: 1, borderBottomColor: "#c5d9dd", paddingBottom: 5, marginBottom: 8 },
  context: { flexDirection: "row", gap: 18 },
  contextBlock: { flex: 1, borderLeftWidth: 2, borderLeftColor: "#c5d9dd", paddingLeft: 8 },
  label: { fontSize: 7, color: "#60737e", textTransform: "uppercase", letterSpacing: .5, marginBottom: 2 },
  value: { fontSize: 8.5, marginBottom: 3 },
  stats: { flexDirection: "row", gap: 6, marginBottom: 8 },
  stat: { flex: 1, backgroundColor: "#edf3f4", padding: 7, borderRadius: 2 },
  statValue: { fontSize: 13, fontWeight: 700, color: "#173d4a" },
  statLabel: { fontSize: 7, color: "#60737e", marginTop: 2 },
  table: { borderWidth: 1, borderColor: "#d9e1e5", borderRadius: 2 },
  tableHeader: { flexDirection: "row", backgroundColor: "#edf3f4", paddingVertical: 5, paddingHorizontal: 6, fontWeight: 700, color: "#173d4a" },
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e8edef", paddingVertical: 5, paddingHorizontal: 6 },
  colTask: { flex: 1 }, colStatus: { width: 70 }, colDate: { width: 78 }, colSmall: { width: 90 },
  eventRow: { flexDirection: "row", alignItems: "flex-start", borderTopWidth: 1, borderTopColor: "#e8edef", paddingVertical: 6, paddingHorizontal: 6, gap: 8 },
  eventTask: { flex: 1, minWidth: 0 }, eventTransition: { width: 112, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 3 }, eventArrow: { width: 0, height: 0, borderTopWidth: 3, borderBottomWidth: 3, borderLeftWidth: 5, borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "#60737e" }, eventMeta: { width: 104, gap: 2 },
  text: { fontSize: 8, lineHeight: 1.35 },
  muted: { color: "#60737e", fontSize: 7.8, lineHeight: 1.35 },
  entry: { borderLeftWidth: 2, borderLeftColor: "#c5d9dd", paddingLeft: 8, marginBottom: 8 },
  entryTitle: { fontWeight: 700, color: "#173d4a", marginBottom: 2 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photo: { width: "31.5%", marginBottom: 10 },
  photoImage: { width: "100%", height: 80, objectFit: "contain", backgroundColor: "#f4f7f8" },
  photoCaption: { fontSize: 7.5, marginTop: 3, lineHeight: 1.3 },
  note: { backgroundColor: "#fff6df", color: "#704e00", padding: 7, borderLeftWidth: 3, borderLeftColor: "#d4a72c", fontSize: 7.5, lineHeight: 1.35 },
  empty: { color: "#60737e" },
  footer: { position: "absolute", bottom: 20, left: 44, right: 44, borderTopWidth: 1, borderTopColor: "#e8edef", paddingTop: 5, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#80909a" },
});

const statusLabels: Record<string, string> = { todo: "Teendő", in_progress: "Folyamatban", done: "Kész" };
const categoryLabels: Record<string, string> = { before: "Munka előtt", during: "Munkavégzés közben", after: "Munka után", uncategorized: "Nincs kategorizálva" };
const journalLabels: Record<string, string> = { general: "Általános", work_done: "Elvégzett munka", problem: "Probléma / akadály", next_step: "Következő lépés" };
const dateTime = (value: string) => new Date(value).toLocaleString("hu-HU");
const dateOnly = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("hu-HU");
const money = (value: string | null) => value == null || !Number.isFinite(Number(value)) ? "Nincs megadva" : `${Number(value).toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ft`;

function Progress({ tasks }: Readonly<{ tasks: ExecutionTaskRecord[] }>) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "done").length;
  return <View style={styles.stats}><View style={styles.stat}><Text style={styles.statValue}>{total}</Text><Text style={styles.statLabel}>Összes feladat</Text></View><View style={styles.stat}><Text style={styles.statValue}>{tasks.filter((task) => task.status === "todo").length}</Text><Text style={styles.statLabel}>Teendő</Text></View><View style={styles.stat}><Text style={styles.statValue}>{tasks.filter((task) => task.status === "in_progress").length}</Text><Text style={styles.statLabel}>Folyamatban</Text></View><View style={styles.stat}><Text style={styles.statValue}>{done}</Text><Text style={styles.statLabel}>Kész</Text></View><View style={styles.stat}><Text style={styles.statValue}>{total ? `${Math.round(done / total * 100)}%` : "—"}</Text><Text style={styles.statLabel}>Feladatok teljesítése</Text></View></View>;
}

export function ExecutionReportDocument({ data }: Readonly<{ data: ExecutionReportData }>) {
  const { plan } = data;
  const has = (section: ExecutionReportSection) => data.sections.includes(section);
  const journals = plan.timeline.filter((item) => item.type === "journal");
  const events = plan.timeline.filter((item) => item.type === "task_event");
  return <Document title={`Belső kivitelezési összefoglaló - ${data.project.name}`} author={data.organizationName}><Page size="A4" style={styles.page} wrap><View style={styles.header} fixed><View><Text style={styles.eyebrow}>Belső kivitelezési összefoglaló</Text><Text style={styles.org}>{data.organizationName}</Text></View><View><Text style={styles.title}>BELSŐ KIVITELEZÉSI ÖSSZEFOGLALÓ</Text><Text style={styles.reference}>{data.project.name}</Text><Text style={styles.reference}>Dokumentum készítve: {dateTime(data.generatedAt)}</Text></View></View>
    {has("overview") && <View style={styles.section}><Text style={styles.sectionTitle}>1. Projektáttekintés</Text><View style={styles.context}><View style={styles.contextBlock}><Text style={styles.label}>Projekt</Text><Text style={styles.value}>{data.project.name}</Text><Text style={styles.label}>Munkanapló</Text><Text style={styles.value}>{plan.title}</Text></View><View style={styles.contextBlock}><Text style={styles.label}>Ügyfél</Text><Text style={styles.value}>{data.project.clientName ?? "Nincs megadva"}</Text><Text style={styles.label}>Munkavégzés helye</Text><Text style={styles.value}>{data.project.location ?? "Nincs megadva"}</Text></View></View>{plan.description ? <Text style={[styles.text, { marginTop: 7 }]}>{plan.description}</Text> : null}</View>}
    {has("tasks") && <View style={styles.section}><Text style={styles.sectionTitle}>2. Feladatok és előrehaladás</Text><Progress tasks={plan.tasks}/>{plan.tasks.length ? <View style={styles.table}><View style={styles.tableHeader}><Text style={styles.colTask}>Feladat</Text><Text style={styles.colStatus}>Státusz</Text><Text style={styles.colDate}>Határidő</Text></View>{plan.tasks.map((task) => <View style={styles.row} key={task.id} wrap={false}><Text style={styles.colTask}>{task.title}</Text><Text style={styles.colStatus}>{statusLabels[task.status] ?? task.status}</Text><Text style={styles.colDate}>{task.dueDate ? dateOnly(task.dueDate) : "Nincs megadva"}</Text></View>)}</View> : <Text style={styles.empty}>Ehhez a munkanaplóhoz nincs rögzített feladat.</Text>}</View>}
    {has("journal") && <View style={styles.section}><Text style={styles.sectionTitle}>3. Napi bejegyzések</Text>{journals.length ? journals.map((item) => <View style={styles.entry} key={item.id} wrap={false}><Text style={styles.entryTitle}>{dateOnly(item.date)} · {journalLabels[item.category ?? "general"] ?? "Napi bejegyzés"}</Text><Text style={styles.text}>{item.content ?? ""}</Text>{item.taskTitle ? <Text style={styles.muted}>Kapcsolódó feladat: {item.taskTitle}</Text> : null}{item.problems ? <Text style={styles.muted}>Problémák / akadályok: {item.problems}</Text> : null}{item.nextSteps ? <Text style={styles.muted}>Következő lépések: {item.nextSteps}</Text> : null}<Text style={styles.muted}>Rögzítve: {dateTime(item.recordedAt)} · {item.authorAvailable ? "Felhasználó" : "Ismeretlen szerző"}</Text></View>) : <Text style={styles.empty}>Ehhez a munkanaplóhoz nincs rögzített napi bejegyzés.</Text>}</View>}
    {has("events") && <View style={styles.section}><Text style={styles.sectionTitle}>4. Kivitelezési események</Text>{events.length ? events.map((item) => <View style={styles.eventRow} key={item.id} wrap={false}><View style={styles.eventTask}><Text style={styles.text}>{item.taskTitle ?? "Feladat"}</Text></View><View style={styles.eventTransition}><Text style={styles.text}>{statusLabels[item.fromStatus ?? ""] ?? "—"}</Text><View style={styles.eventArrow}/><Text style={styles.text}>{statusLabels[item.toStatus ?? ""] ?? "—"}</Text></View><View style={styles.eventMeta}><Text style={styles.muted}>{dateTime(item.recordedAt)}</Text><Text style={styles.muted}>{item.authorAvailable ? "Felhasználó" : "Ismeretlen"}</Text></View></View>) : <Text style={styles.empty}>Ehhez a munkanaplóhoz nincs rögzített feladatesemény.</Text>}</View>}
    {has("photos") && <View style={styles.section}><Text style={styles.sectionTitle}>5. Fényképes dokumentáció</Text>{plan.photos.length ? <View style={styles.photoGrid}>{plan.photos.map((photo) => <View style={styles.photo} key={photo.id} wrap={false}><Image style={styles.photoImage} src={photo.dataUri}/><Text style={styles.photoCaption}>{photo.caption || photo.displayFilename}</Text><Text style={styles.muted}>{categoryLabels[photo.category] ?? photo.category} · {photo.taskTitle ?? "Nincs feladatkapcsolat"}</Text><Text style={styles.muted}>Feltöltve: {dateTime(photo.uploadedAt)}</Text></View>)}</View> : <Text style={styles.empty}>A riporthoz nem lett kiválasztott fénykép.</Text>}</View>}
    {has("quotation") && <View style={styles.section} wrap={false}><Text style={styles.sectionTitle} minPresenceAhead={72}>6. Kapcsolódó ajánlat</Text>{plan.sourceQuotationName ? <View style={styles.context}><View style={styles.contextBlock}><Text style={styles.label}>Ajánlat</Text><Text style={styles.value}>{plan.sourceQuotationName}</Text><Text style={styles.label}>Státusz</Text><Text style={styles.value}>{plan.sourceQuotationStatus === "accepted" ? "Elfogadva" : plan.sourceQuotationStatus ?? "Nincs megadva"}</Text></View><View style={styles.contextBlock}><Text style={styles.label}>Végleges revízió</Text><Text style={styles.value}>{plan.sourceRevisionNumber == null ? "Nincs megadva" : `v${plan.sourceRevisionNumber}`} </Text><Text style={styles.muted}>Belső revízió-azonosító: {plan.sourceRevisionId ?? "Nincs megadva"}</Text><Text style={styles.label}>Mentett pénzügyi összeg</Text><Text style={styles.value}>{money(plan.sourceSubtotal)}</Text></View></View> : <Text style={styles.empty}>Ehhez a munkanaplóhoz nincs kapcsolódó elfogadott ajánlat.</Text>}<Text style={styles.note}>Ez a dokumentum belső kivitelezési összefoglaló. Nem jogilag hiteles elektronikus építési napló, és nem archivált pillanatkép.</Text></View>}
    <View style={styles.footer} fixed><Text>{data.project.name} · Kivitelezési összefoglaló</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages} oldal`} /></View></Page></Document>;
}
