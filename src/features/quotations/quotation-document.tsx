import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

Font.register({
  family: "Noto Sans",
  fonts: [
    { src: path.join(process.cwd(), "node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff") },
    { src: path.join(process.cwd(), "node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff"), fontWeight: 700 },
  ],
});

export type QuotationDocumentData = {
  organizationName: string;
  quotation: { id: string; name: string; currency: string };
  revision: { id: string; number: number; createdAt: string; lines: Array<Record<string, unknown>>; subtotal: string | null; priceClass: "net" | "gross" | null; currency: string; totals: Record<string, unknown> };
  project: { name: string; location: string | null; description: string | null };
  client: { name: string; email: string | null; phone: string | null; billingAddress: string | null } | null;
  documentSnapshot: { project?: { name?: string; location?: string | null; description?: string | null }; client?: { name?: string; email?: string | null; phone?: string | null; billingAddress?: string | null } | null } | null;
};

const styles = StyleSheet.create({
  page: { fontFamily: "Noto Sans", fontSize: 9, color: "#1b2833", paddingTop: 42, paddingBottom: 44, paddingHorizontal: 46, backgroundColor: "#ffffff" },
  header: { borderBottomWidth: 1, borderBottomColor: "#d9e1e5", paddingBottom: 16, marginBottom: 22, flexDirection: "row", justifyContent: "space-between" },
  eyebrow: { fontSize: 8, color: "#60737e", letterSpacing: 1.3, textTransform: "uppercase", marginBottom: 5 },
  org: { fontSize: 15, fontWeight: 700, color: "#173d4a" },
  title: { fontSize: 22, fontWeight: 700, color: "#173d4a", textAlign: "right" },
  reference: { fontSize: 8, color: "#60737e", textAlign: "right", marginTop: 5 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: "#173d4a", marginBottom: 8 },
  infoGrid: { flexDirection: "row", gap: 24 },
  infoBlock: { flex: 1, borderLeftWidth: 2, borderLeftColor: "#c5d9dd", paddingLeft: 9 },
  label: { fontSize: 7.5, color: "#60737e", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  value: { fontSize: 9, marginBottom: 3 },
  missing: { color: "#8a5a00" },
  table: { borderWidth: 1, borderColor: "#d9e1e5", borderRadius: 2 },
  tableHeader: { flexDirection: "row", backgroundColor: "#edf3f4", paddingVertical: 7, paddingHorizontal: 7, fontWeight: 700, color: "#173d4a" },
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e8edef", paddingVertical: 7, paddingHorizontal: 7, minHeight: 27 },
  category: { backgroundColor: "#f8fafb", borderTopWidth: 1, borderTopColor: "#d9e1e5", paddingVertical: 4, paddingHorizontal: 7, fontSize: 7.5, fontWeight: 700, color: "#60737e" },
  colNo: { width: 26 }, colDescription: { flex: 1 }, colQty: { width: 55, textAlign: "right" }, colUnit: { width: 48, textAlign: "right" }, colPrice: { width: 76, textAlign: "right" }, colTotal: { width: 82, textAlign: "right" },
  note: { fontSize: 7.5, color: "#60737e", marginTop: 3 },
  summaryWrap: { marginTop: 20, flexDirection: "row", justifyContent: "flex-end" },
  summary: { width: 255, borderTopWidth: 2, borderTopColor: "#173d4a", paddingTop: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  summaryLabel: { color: "#60737e" },
  total: { fontSize: 14, fontWeight: 700, color: "#173d4a", borderTopWidth: 1, borderTopColor: "#d9e1e5", paddingTop: 8, marginTop: 4 },
  warning: { backgroundColor: "#fff6df", color: "#704e00", padding: 8, marginTop: 14, borderLeftWidth: 3, borderLeftColor: "#d4a72c", fontSize: 8 },
  footer: { position: "absolute", bottom: 20, left: 46, right: 46, borderTopWidth: 1, borderTopColor: "#e8edef", paddingTop: 6, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#80909a" },
});

const asText = (value: unknown) => typeof value === "string" ? value : value == null ? "" : String(value);
const categoryName = (type: unknown) => type === "MATERIAL" ? "Anyag" : type === "LABOR" ? "Munkadíj" : "Egyéb";
const money = (value: unknown, currency = "HUF") => {
  if (value == null || value === "") return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${number.toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};
const date = (value: string) => new Date(value).toLocaleDateString("hu-HU");

function snapshotOrCurrent(data: QuotationDocumentData) {
  const snapshot = data.documentSnapshot;
  if (!snapshot) return { project: { name: "", location: null, description: null }, client: null };
  return {
    project: snapshot.project ?? { name: "", location: null, description: null },
    client: "client" in snapshot ? snapshot.client ?? null : null,
  };
}

export function QuotationPdfDocument({ data }: Readonly<{ data: QuotationDocumentData }>) {
  const revisionLabel = String(data.revision.number);
  const historic = snapshotOrCurrent(data);
  const lines = data.revision.lines;
  const grouped = ["MATERIAL", "LABOR", "OTHER"].flatMap((type) => {
    const matching = lines.filter((line) => asText(line.type) === type);
    return matching.length ? [{ type, lines: matching }] : [];
  });
  const totals = data.revision.totals;
  const complete = totals.complete === true;
  const categoryTotals = [
    ["Anyag", totals.materialSubtotal],
    ["Munkadíj", totals.laborSubtotal],
    ["Egyéb", totals.otherSubtotal],
  ] as const;
  return <Document title={`Árajánlat - ${data.quotation.name}`} author={data.organizationName}>
    <Page size="A4" style={styles.page} wrap>
      <View style={styles.header} fixed>
        <View><Text style={styles.eyebrow}>Ajánlati dokumentum</Text><Text style={styles.org}>{data.organizationName}</Text></View>
        <View><Text style={styles.title}>ÁRAJÁNLAT</Text><Text style={styles.reference}>{data.quotation.name} · v{revisionLabel}</Text><Text style={styles.reference}>Kiállítva: {date(data.revision.createdAt)}</Text></View>
      </View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Ajánlat részletei</Text><View style={styles.infoGrid}>
        <View style={styles.infoBlock}><Text style={styles.label}>Ügyfél</Text><Text style={styles.value}>{historic.client?.name || "Nincs megadva"}</Text>{historic.client?.email ? <Text style={styles.value}>{historic.client.email}</Text> : null}{historic.client?.phone ? <Text style={styles.value}>{historic.client.phone}</Text> : null}{historic.client?.billingAddress ? <Text style={styles.value}>{historic.client.billingAddress}</Text> : null}</View>
        <View style={styles.infoBlock}><Text style={styles.label}>Projekt</Text><Text style={styles.value}>{historic.project.name || "Nincs megadva"}</Text>{historic.project.location ? <Text style={styles.value}>{historic.project.location}</Text> : null}{historic.project.description ? <Text style={styles.value}>{historic.project.description}</Text> : null}</View>
        <View style={styles.infoBlock}><Text style={styles.label}>Revízió</Text><Text style={styles.value}>v{revisionLabel}</Text><Text style={styles.value}>{data.revision.priceClass === "net" ? "Nettó" : data.revision.priceClass === "gross" ? "Bruttó" : "Árbesorolás nincs megadva"}</Text><Text style={styles.value}>{data.revision.currency}</Text></View>
      </View></View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Tételek</Text><View style={styles.table}>
        <View style={styles.tableHeader}><Text style={styles.colNo}>#</Text><Text style={styles.colDescription}>Megnevezés</Text><Text style={styles.colQty}>Menny.</Text><Text style={styles.colUnit}>Egység</Text><Text style={styles.colPrice}>Egységár</Text><Text style={styles.colTotal}>Összeg</Text></View>
        {grouped.map((group) => <View key={group.type} wrap={false}><Text style={styles.category}>{categoryName(group.type)}</Text>{group.lines.map((line, index) => <View style={styles.row} key={`${group.type}-${index}`} wrap={false}><Text style={styles.colNo}>{index + 1}</Text><View style={styles.colDescription}><Text>{asText(line.description) || "Nincs megadva"}</Text>{line.notes ? <Text style={styles.note}>{asText(line.notes)}</Text> : null}</View><Text style={styles.colQty}>{asText(line.quantity)}</Text><Text style={styles.colUnit}>{asText(line.unit)}</Text><Text style={styles.colPrice}>{money(line.unitPrice, data.quotation.currency)}</Text><Text style={styles.colTotal}>{money(line.lineTotal, data.quotation.currency)}</Text></View>)}</View>)}
      </View></View>
      <View style={styles.summaryWrap}><View style={styles.summary}><Text style={styles.label}>Pénzügyi összesítés</Text>{categoryTotals.map(([label, value]) => value != null ? <View style={styles.summaryRow} key={label}><Text style={styles.summaryLabel}>{label}</Text><Text>{money(value, data.quotation.currency)}</Text></View> : null)}<View style={[styles.summaryRow, styles.total]}><Text>Ajánlati összeg</Text><Text>{money(data.revision.subtotal, data.quotation.currency)}</Text></View><Text style={styles.note}>{data.revision.priceClass === "net" ? "Nettó összeg" : data.revision.priceClass === "gross" ? "Bruttó összeg" : "Az árbesorolás nincs megadva"}</Text></View></View>
      {!complete || data.revision.priceClass == null ? <Text style={styles.warning}>FIGYELMEZTETÉS: Ez a dokumentum hiányos ajánlati piszkozat. Az itt nem szereplő ár- vagy adóinformációt a rendszer nem pótolja, és a dokumentum nem minősül számlának.</Text> : null}
      <View style={styles.footer} fixed><Text>{data.organizationName} · {data.quotation.name} · v{revisionLabel}</Text><Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages} oldal`} /></View>
    </Page>
  </Document>;
}

