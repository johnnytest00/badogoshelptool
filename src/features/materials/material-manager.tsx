"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Archive, Check, Pencil, Plus, Search } from "lucide-react";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { GlassSectionHeader } from "@/components/ui/glass-section-header";
import { materialPriceKindLabels, materialPurchasingUnitLabels } from "@/domain/materials/contracts";
import type { MaterialActionResult } from "./material-actions";
import { createMaterialCategoryAction, renameMaterialCategoryAction, setMaterialCategoryActiveAction } from "./material-actions";
import type { MaterialCategoryRecord, MaterialManufacturerRecord, MaterialProductRecord } from "./material-data";
import { ManufacturerForm, MaterialManagerProductForm, ProductStatusForm } from "./material-forms";

type CategoryDialog = { mode: "create" } | { mode: "rename"; category: MaterialCategoryRecord } | null;

function priceText(product: MaterialProductRecord, variantIndex: number) {
  const variant = product.variants[variantIndex];
  const price = variant?.latestPrice;
  if (!variant) return "Egység nincs megadva";
  if (!price) return `Ár nincs megadva · ${materialPurchasingUnitLabels[variant.purchasingUnit]}`;
  return `${price.amount.toLocaleString("hu-HU")} Ft/${materialPurchasingUnitLabels[price.purchasingUnit]} · ${materialPriceKindLabels[price.priceKind].toLowerCase()}`;
}

export function MaterialManager({
  organizationId,
  categories,
  products,
  manufacturers,
}: Readonly<{
  organizationId: string;
  categories: readonly MaterialCategoryRecord[];
  products: readonly MaterialProductRecord[];
  manufacturers: readonly MaterialManufacturerRecord[];
}>) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const productDialogRef = useRef<HTMLDialogElement>(null);
  const [dialog, setDialog] = useState<CategoryDialog>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;
    if (dialog && !dialogElement.open) dialogElement.showModal();
    if (!dialog && dialogElement.open) dialogElement.close();
  }, [dialog]);

  useEffect(() => {
    const dialogElement = productDialogRef.current;
    if (!dialogElement) return;
    if (productDialogOpen && !dialogElement.open) dialogElement.showModal();
    if (!productDialogOpen && dialogElement.open) dialogElement.close();
  }, [productDialogOpen]);

  const activeCategories = useMemo(() => categories.filter((category) => category.isActive), [categories]);
  const visibleCategories = useMemo(() => categories.filter((category) => category.name.toLocaleLowerCase("hu-HU").includes(categorySearch.trim().toLocaleLowerCase("hu-HU"))), [categories, categorySearch]);
  const visibleProducts = useMemo(() => products.filter((product) => {
    if (!showArchived && product.status !== "active") return false;
    if (selectedCategoryId && product.categoryId !== selectedCategoryId) return false;
    const query = productSearch.trim().toLocaleLowerCase("hu-HU");
    return !query || product.name.toLocaleLowerCase("hu-HU").includes(query) || (product.productCode ?? "").toLocaleLowerCase("hu-HU").includes(query);
  }), [products, productSearch, selectedCategoryId, showArchived]);

  function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = dialog.mode === "create"
        ? await createMaterialCategoryAction(form)
        : await renameMaterialCategoryAction(form);
      handleCategoryResult(result);
    });
  }

  function handleCategoryResult(result: MaterialActionResult) {
    if (!result.ok) {
      setFeedback(result.error ?? "A kategória mentése nem sikerült.");
      return;
    }
    setFeedback("Kategória mentve.");
    setDialog(null);
    router.refresh();
  }

  function toggleCategory(category: MaterialCategoryRecord) {
    const form = new FormData();
    form.set("organizationId", organizationId);
    form.set("categoryId", category.id);
    form.set("isActive", String(!category.isActive));
    startTransition(async () => {
      const result = await setMaterialCategoryActiveAction(form);
      if (!result.ok) {
        setFeedback(result.error ?? "A kategória állapotát nem sikerült módosítani.");
        return;
      }
      setFeedback(category.isActive ? "Kategória inaktiválva. A kapcsolódó termékek és előzmények megmaradtak." : "Kategória újra aktiválva.");
      router.refresh();
    });
  }

  const editCategory = dialog?.mode === "rename" ? dialog.category : null;

  return <div className="dashboard-shell"><div className="dashboard-container materials-workspace material-manager-workspace">
    <Link className="back-link" href={`/?organization=${organizationId}`}><ArrowLeft className="size-4" /> Műhely áttekintése</Link>
    <GlassPageHeader title="Anyagkezelő" context="Kategóriák, termékek, egységek és árak" actions={<>
      <button className="secondary-button" type="button" onClick={() => { setFeedback(""); setDialog({ mode: "create" }); }}><Plus className="size-4" /> Új kategória</button>
      <button className="primary-button" type="button" onClick={() => setProductDialogOpen(true)}><Plus className="size-4" /> Új termék</button>
    </>} />

    <nav className="material-manager-categories" aria-label="Termékkategóriák">
      <button className={selectedCategoryId === null ? "is-selected" : ""} type="button" aria-pressed={selectedCategoryId === null} onClick={() => setSelectedCategoryId(null)}>Minden kategória <span>{products.filter((product) => showArchived || product.status === "active").length}</span></button>
      {activeCategories.map((category) => <button className={selectedCategoryId === category.id ? "is-selected" : ""} key={category.id} type="button" aria-pressed={selectedCategoryId === category.id} onClick={() => setSelectedCategoryId(category.id)}>{category.name} <span>{products.filter((product) => product.categoryId === category.id && (showArchived || product.status === "active")).length}</span></button>)}
    </nav>

    <section className="material-manager-catalog" aria-labelledby="material-manager-products-title">
      <GlassSectionHeader id="material-manager-products-title" title="Termékek" actions={<span>{visibleProducts.length} találat</span>} />
      <div className="material-manager-toolbar">
        <label className="material-manager-search"><Search aria-hidden="true" /><span className="sr-only">Keresés terméknév vagy termékkód szerint</span><input type="search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Termék keresése név vagy kód alapján" /></label>
        <label className="material-manager-archived"><input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} /> Archivált termékek</label>
      </div>

      {visibleProducts.length ? <>
        <div className="material-manager-table-wrap">
          <table className="material-manager-table">
            <caption className="sr-only">Anyagtermékek egységgel, egységárral és szerkesztési művelettel</caption>
            <thead><tr><th scope="col">Termék</th><th scope="col">Kategória</th><th scope="col">Egység</th><th scope="col">Egységár</th><th scope="col">Művelet</th></tr></thead>
            <tbody>{visibleProducts.map((product) => <tr key={product.id}>
              <th scope="row"><Link className="material-manager-product-link" href={`/anyagok/${product.id}?organization=${organizationId}`}><span>{product.name}</span>{product.variants.length > 1 && <small>{product.variants.length} egységváltozat</small>}{product.productCode && <small>{product.productCode}</small>}</Link></th>
              <td><span className="material-category-pill">{product.categoryName}</span>{!product.categoryActive && <small className="material-manager-inactive-note">inaktív kategória</small>}</td>
              <td>{product.variants.length ? product.variants.map((variant) => materialPurchasingUnitLabels[variant.purchasingUnit]).join(", ") : "Nincs megadva"}</td>
              <td>{product.variants.length ? product.variants.map((variant) => <span className="material-manager-table-price" key={variant.id}>{variant.name !== "Alap egység" && <small>{variant.name}: </small>}{variant.latestPrice ? priceText({ ...product, variants: [variant] }, 0) : `Ár nincs megadva · ${materialPurchasingUnitLabels[variant.purchasingUnit]}`}</span>) : "Egység nincs megadva"}</td>
              <td className="material-manager-row-actions"><Link className="material-manager-edit" href={`/anyagok/${product.id}?organization=${organizationId}`} aria-label={`${product.name} szerkesztése`} title="Szerkesztés"><Pencil aria-hidden="true" /></Link><ProductStatusForm organizationId={organizationId} product={product} /></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="material-manager-mobile-list">{visibleProducts.map((product) => <article className="material-manager-mobile-product" key={product.id}>
          <div className="material-manager-mobile-product-heading"><div><span className="material-category-pill">{product.categoryName}</span><h3>{product.name}</h3></div><Link className="material-manager-edit" href={`/anyagok/${product.id}?organization=${organizationId}`} aria-label={`${product.name} szerkesztése`} title="Szerkesztés"><Pencil aria-hidden="true" /></Link></div>
          {product.productCode && <p className="material-manager-product-code">{product.productCode}</p>}
          {product.variants.length ? <ul>{product.variants.map((variant, index) => <li key={variant.id}><span>{product.variants.length > 1 ? variant.name : materialPurchasingUnitLabels[variant.purchasingUnit]}</span><strong>{priceText(product, index)}</strong></li>)}</ul> : <p className="missing-data">Egység nincs megadva</p>}
          {!product.categoryActive && <p className="material-manager-inactive-note">A kategória inaktív; a termék és előzmények megmaradtak.</p>}
          <ProductStatusForm organizationId={organizationId} product={product} />
        </article>)}</div>
      </> : <div className="empty-state"><span className="empty-state-icon"><Search className="size-5" /></span><div><h3>{products.length === 0 ? "Még nincs termék a katalógusban" : "Nincs találat"}</h3><p>{products.length === 0 ? "Hozd létre az első terméket, és add meg az egységét." : "Módosítsd a keresést vagy válassz másik kategóriát."}</p></div>{products.length === 0 && <button className="primary-button" type="button" onClick={() => setProductDialogOpen(true)}><Plus className="size-4" /> Új termék</button>}</div>}
    </section>

    <details className="material-manager-category-settings">
      <summary>Kategóriák kezelése <span>{categories.length}</span></summary>
      <div className="material-manager-category-toolbar"><label className="material-manager-search"><Search aria-hidden="true" /><span className="sr-only">Keresés kategóriák között</span><input type="search" value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Kategória keresése" /></label><button className="secondary-button" type="button" onClick={() => { setFeedback(""); setDialog({ mode: "create" }); }}><Plus className="size-4" /> Új kategória</button></div>
      <ul className="material-manager-category-list">{visibleCategories.map((category) => <li key={category.id}>
        <span className="material-manager-category-name">{category.name}{category.isDefault && <small>alap kategória</small>}{!category.isActive && <small>inaktív</small>}</span>
        <div className="material-manager-row-actions"><button className="material-manager-edit" type="button" onClick={() => { setFeedback(""); setDialog({ mode: "rename", category }); }} aria-label={`${category.name} átnevezése`} title="Átnevezés"><Pencil aria-hidden="true" /></button><button className="secondary-button material-category-status" type="button" disabled={pending} onClick={() => toggleCategory(category)}>{category.isActive ? <><Archive aria-hidden="true" /> Inaktiválás</> : <><Check aria-hidden="true" /> Aktiválás</>}</button></div>
      </li>)}</ul>
      {visibleCategories.length === 0 && <p className="missing-data">Nincs ilyen kategória.</p>}
      <p className="missing-data">A kategória inaktiválása nem törli a termékeket vagy a korábbi listák és ajánlatok adatait.</p>
    </details>
    {feedback && <p className="form-message" role="status">{feedback}</p>}

    <details className="material-manager-category-settings material-manager-manufacturers">
      <summary>Gyártói adatok <span>haladó</span></summary>
      <section className="material-manufacturers" aria-label="Gyártók kezelése"><h2>Gyártó hozzáadása</h2><ManufacturerForm organizationId={organizationId} />{manufacturers.length > 0 && <div className="material-manufacturer-list">{manufacturers.map((manufacturer) => <details key={manufacturer.id}><summary>{manufacturer.name}</summary><ManufacturerForm organizationId={organizationId} manufacturer={manufacturer} /></details>)}</div>}</section>
    </details>

    <dialog ref={dialogRef} className="material-manager-dialog" aria-labelledby="material-manager-dialog-title" onCancel={(event) => { event.preventDefault(); setDialog(null); }} onClose={() => setDialog(null)}>
      <form className="material-manager-dialog-form" onSubmit={saveCategory}>
        <div className="material-manager-dialog-heading"><div><p className="section-eyebrow">Kategóriák</p><h2 id="material-manager-dialog-title">{editCategory ? "Kategória átnevezése" : "Új kategória"}</h2></div><button className="material-manager-dialog-close" type="button" onClick={() => setDialog(null)} aria-label="Bezárás">×</button></div>
        <input type="hidden" name="organizationId" value={organizationId} />
        {editCategory && <input type="hidden" name="categoryId" value={editCategory.id} />}
        <label className="material-field"><span>Kategória neve <strong>Kötelező</strong></span><input name="name" defaultValue={editCategory?.name ?? ""} autoFocus required maxLength={100} /></label>
        {feedback && <p className="form-message is-error" role="alert">{feedback}</p>}
        <div className="material-manager-dialog-actions"><button className="secondary-button" type="button" onClick={() => setDialog(null)}>Mégse</button><button className="primary-button" type="submit" disabled={pending}>{pending ? "Mentés…" : "Mentés"}</button></div>
      </form>
    </dialog>
    <dialog ref={productDialogRef} className="material-manager-dialog material-manager-product-dialog" aria-labelledby="material-manager-product-dialog-title" onCancel={(event) => { event.preventDefault(); setProductDialogOpen(false); }} onClose={() => setProductDialogOpen(false)}>
      <div className="material-manager-dialog-form"><div className="material-manager-dialog-heading"><div><p className="section-eyebrow">Anyagkezelő</p><h2 id="material-manager-product-dialog-title">Új termék</h2></div><button className="material-manager-dialog-close" type="button" onClick={() => setProductDialogOpen(false)} aria-label="Bezárás">×</button></div>
        <MaterialManagerProductForm organizationId={organizationId} categories={activeCategories} onCreated={() => { setProductDialogOpen(false); router.refresh(); }} />
      </div>
    </dialog>
  </div></div>;
}
