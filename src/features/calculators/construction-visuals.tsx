"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Maximize2, Minus, Move, Plus, RotateCcw } from "lucide-react";
import { GlassToolbar } from "@/components/ui/glass-toolbar";
import { calculateBeveledRiserGeometry, calculateConcreteStairGeometry, calculateLandingStairGeometry, calculateSpiralStairGeometry, calculateStraightStairGeometry } from "@/domain/calculations/construction/stairs";
import { calculateWinderStairGeometry } from "@/domain/calculations/construction/winder-stairs";
import { constructionCalculatorCatalog } from "@/domain/calculations/construction/catalog";
import { calculateReinforcementMesh } from "@/domain/calculations/construction/concrete";
import { createStraightStairDrawingGeometry, type BeveledRiserDrawingGeometry, type SpiralStairDrawingGeometry, type StraightStairDrawingGeometry } from "@/domain/drawings/construction-stairs";
import { clampDrawingZoom, clientPointToViewBox, drawingInitialViewport, fitDrawingViewport, panViewport, pinchViewport, rebasePanGesture, type ViewportPoint } from "@/features/roof-models/drawing-viewport";

const VIEWBOX = { width: 1000, height: 560 } as const;
const STAIR_IDS = new Set([
  "stair.wood.closed_straight", "stair.wood.open_straight", "stair.wood.90_landing", "stair.wood.90_winder",
  "stair.wood.180_landing", "stair.wood.180_winder", "stair.wood.three_landing", "stair.wood.three_winder",
  "stair.wood.spiral", "stair.metal.straight", "stair.metal.zigzag", "stair.metal.90_landing",
  "stair.metal.90_zigzag", "stair.metal.180_landing", "stair.metal.180_zigzag", "stair.beveled_riser",
  "stair.concrete_straight",
]);

function n(values: Readonly<Record<string, string>>, key: string) {
  const value = Number((values[key] ?? "").replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

function nullablePositive(values: Readonly<Record<string, string>>, key: string) {
  const raw = (values[key] ?? "").trim();
  if (!raw) return undefined;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

type StraightDrawingModel = Readonly<{ kind: "straight"; id: string; geometry: StraightStairDrawingGeometry }>;
type SpiralDrawingModel = Readonly<{ kind: "spiral"; geometry: SpiralStairDrawingGeometry }>;
type BevelDrawingModel = Readonly<{ kind: "bevel"; geometry: BeveledRiserDrawingGeometry }>;
type LandingDrawingModel = Readonly<{ kind: "landing"; id: string; geometry: ReturnType<typeof calculateLandingStairGeometry> }>;
type ConcreteDrawingModel = Readonly<{ kind: "concrete"; geometry: ReturnType<typeof calculateConcreteStairGeometry> }>;
type WinderDrawingModel = Readonly<{ kind: "winder"; geometry: ReturnType<typeof calculateWinderStairGeometry> }>;
type StairDrawingModel = StraightDrawingModel | SpiralDrawingModel | BevelDrawingModel | LandingDrawingModel | ConcreteDrawingModel | WinderDrawingModel;

function buildDrawingModel(id: string, values: Readonly<Record<string, string>>): StairDrawingModel | null {
  const winderLayout = id === "stair.wood.90_winder" ? "quarter_turn" : id === "stair.wood.180_winder" ? "half_turn" : id === "stair.wood.three_winder" ? "three_flight" : null;
  if (winderLayout) {
    const openingLengthMm = nullablePositive(values, "openingLengthMm");
    const openingWidthMm = nullablePositive(values, "openingWidthMm");
    const geometry = calculateWinderStairGeometry({
      layout: winderLayout,
      totalRiseMm: n(values, "totalRiseMm"), stairWidthMm: n(values, "stairWidthMm"), innerRadiusMm: n(values, "innerRadiusMm"),
      lowerTreadCount: n(values, "lowerTreadCount"), upperTreadCount: n(values, "upperTreadCount"), windersPerTurn: n(values, "windersPerTurn"),
      turnDirection: values.turnDirection === "left" ? "left" : "right",
      ...(winderLayout === "three_flight" ? { middleTreadCount: n(values, "middleTreadCount") } : {}),
      ...(openingLengthMm === undefined ? {} : { openingLengthMm }), ...(openingWidthMm === undefined ? {} : { openingWidthMm }),
    });
    return { kind: "winder", geometry };
  }
  const landingLayout = id.includes("three_landing") ? "three_flight" : id.includes("180_landing") || id.includes("180_zigzag") ? "half_turn" : id.includes("90_landing") || id.includes("90_zigzag") ? "quarter_turn" : null;
  if (landingLayout) {
    const riserKeys = landingLayout === "three_flight" ? ["firstFlightRiserCount", "secondFlightRiserCount", "thirdFlightRiserCount"] : ["firstFlightRiserCount", "secondFlightRiserCount"];
    const openingLengthMm = nullablePositive(values, "openingLengthMm");
    const openingWidthMm = nullablePositive(values, "openingWidthMm");
    const landingGapMm = Math.max(0, n(values, "landingGapMm"));
    const geometry = calculateLandingStairGeometry({
      layout: landingLayout,
      totalRiseMm: n(values, "totalRiseMm"),
      stairWidthMm: n(values, "stairWidthMm"),
      goingMm: n(values, "goingMm"),
      landingDepthMm: n(values, "landingDepthMm"),
      flightRiserCounts: riserKeys.map((key) => n(values, key)),
      landingGapMm,
      turnDirection: values.turnDirection === "left" ? "left" : "right",
      ...(openingLengthMm === undefined ? {} : { openingLengthMm }),
      ...(openingWidthMm === undefined ? {} : { openingWidthMm }),
    });
    return { kind: "landing", id, geometry };
  }
  if (id === "stair.concrete_straight") {
    return { kind: "concrete", geometry: calculateConcreteStairGeometry({ totalRiseMm: n(values, "totalRiseMm"), availableRunMm: n(values, "availableRunMm"), stairWidthMm: n(values, "stairWidthMm"), riserCount: n(values, "riserCount") }) };
  }
  if (["stair.wood.closed_straight", "stair.wood.open_straight", "stair.metal.straight", "stair.metal.zigzag"].includes(id)) {
    const stairWidthMm = nullablePositive(values, "stairWidthMm");
    const result = calculateStraightStairGeometry({
      totalRiseMm: n(values, "totalRiseMm"),
      availableRunMm: n(values, "availableRunMm"),
      riserCount: n(values, "riserCount"),
      stairWidthMm,
    });
    return { kind: "straight", id, geometry: createStraightStairDrawingGeometry(result, stairWidthMm ?? null) };
  }
  if (id === "stair.wood.spiral") {
    const totalRiseMm = n(values, "totalRiseMm");
    const turnDegrees = n(values, "turnDegrees");
    const result = calculateSpiralStairGeometry({ totalRiseMm, outerDiameterMm: n(values, "outerDiameterMm"), innerDiameterMm: n(values, "innerDiameterMm"), turnDegrees, riserCount: n(values, "riserCount") });
    return { kind: "spiral", geometry: { totalRiseMm, outerDiameterMm: n(values, "outerDiameterMm"), innerDiameterMm: n(values, "innerDiameterMm"), turnDegrees, ...result } };
  }
  if (id === "stair.beveled_riser") {
    const input = { goingMm: n(values, "goingMm"), riserHeightMm: n(values, "riserHeightMm"), nosingProjectionMm: n(values, "nosingProjectionMm"), treadThicknessMm: n(values, "treadThicknessMm"), riserBlankThicknessMm: n(values, "riserBlankThicknessMm") };
    const result = calculateBeveledRiserGeometry(input);
    return { kind: "bevel", geometry: { goingMm: input.goingMm, nosingProjectionMm: input.nosingProjectionMm, riserHeightMm: input.riserHeightMm, ...result } };
  }
  return null;
}

function StairStepPath({ geometry, activeDimension, onDimensionSelect }: Readonly<{ geometry: StraightStairDrawingGeometry; activeDimension?: string | null; onDimensionSelect?: (key: string) => void }>) {
  const scale = Math.min(680 / geometry.totalRunMm, 300 / geometry.totalRiseMm);
  const x0 = 140;
  const baseY = 430;
  const rise = geometry.riserHeightMm * scale;
  const going = geometry.goingMm * scale;
  const endX = x0 + geometry.totalRunMm * scale;
  const topY = baseY - geometry.totalRiseMm * scale;
  const commands = [`M ${x0} ${baseY}`];
  geometry.treads.forEach((tread, index) => {
    const xStart = x0 + tread.xStartMm * scale;
    const xEnd = x0 + tread.xEndMm * scale;
    const y = baseY - tread.levelMm * scale;
    commands.push(`L ${xStart} ${y}`, `L ${xEnd} ${y}`);
    if (index < geometry.treads.length - 1) commands.push(`L ${xEnd} ${y - rise}`);
  });
  commands.push(`L ${endX} ${topY}`);
  return <>
    <line className="stair-floor-line" x1={x0 - 36} y1={baseY} x2={endX + 38} y2={baseY} />
    <line className="stair-floor-line" x1={endX - 12} y1={topY} x2={endX + 42} y2={topY} />
    <path className="stair-profile" d={commands.join(" ")} />
    <line className="stair-stringer-centerline" x1={x0} y1={baseY} x2={endX} y2={topY} />
    <text className={`stair-note-label${activeDimension === "availableRunMm" || activeDimension === "totalRiseMm" ? " is-active" : ""}`} x={x0 + (endX - x0) * .54} y={baseY - (baseY - topY) * .48 - 18} textAnchor="middle">Tartó elvi hossza {formatMm(geometry.stringerLengthMm)}</text>
    <Dimension x1={x0} y1={480} x2={endX} y2={480} extension1={{ x: x0, y: baseY + 4 }} extension2={{ x: endX, y: baseY + 4 }} label={`Vízszintes hely ${formatMm(geometry.totalRunMm)}`} dataKey="availableRunMm" activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <Dimension x1={endX + 58} y1={baseY} x2={endX + 58} y2={topY} extension1={{ x: endX + 8, y: baseY }} extension2={{ x: endX + 8, y: topY }} label={`Teljes emelkedés ${formatMm(geometry.totalRiseMm)}`} dataKey="totalRiseMm" rotateLabel activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <Dimension x1={x0} y1={baseY - rise - 24} x2={x0 + going} y2={baseY - rise - 24} extension1={{ x: x0, y: baseY - rise }} extension2={{ x: x0 + going, y: baseY - rise }} label={`Belépő ${formatMm(geometry.goingMm)}`} dataKey="availableRunMm" activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <Dimension x1={x0 - 38} y1={baseY} x2={x0 - 38} y2={baseY - rise} extension1={{ x: x0 - 5, y: baseY }} extension2={{ x: x0 - 5, y: baseY - rise }} label={`Fellépő ${formatMm(geometry.riserHeightMm)}`} dataKey="riserCount" rotateLabel activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <path className="stair-angle-mark" d={`M ${x0 + 60} ${baseY} A 60 60 0 0 0 ${x0 + 60 * Math.cos(geometry.pitchDegrees * Math.PI / 180)} ${baseY - 60 * Math.sin(geometry.pitchDegrees * Math.PI / 180)}`} />
    <text className={`stair-angle-label${activeDimension === "availableRunMm" ? " is-active" : ""}`} x={x0 + 72} y={baseY - 18} data-dimension="availableRunMm">{formatNumber(geometry.pitchDegrees)}°</text>
    <text className={`stair-count-label${activeDimension === "riserCount" ? " is-active" : ""}`} x={x0 + (endX - x0) / 2} y={topY - 35} textAnchor="middle" data-dimension="riserCount">{geometry.riserCount} fellépés · {geometry.treadCount} fok</text>
    {geometry.widthMm && <text className={`stair-count-label${activeDimension === "stairWidthMm" ? " is-active" : ""}`} x={x0 + (endX - x0) / 2} y={topY - 14} textAnchor="middle" data-dimension="stairWidthMm">Kar szélessége {formatMm(geometry.widthMm)}</text>}
  </>;
}

function StraightPlan({ geometry, activeDimension, onDimensionSelect }: Readonly<{ geometry: StraightStairDrawingGeometry; activeDimension?: string | null; onDimensionSelect?: (key: string) => void }>) {
  if (!geometry.widthMm) return null;
  const scale = Math.min(660 / geometry.totalRunMm, 220 / geometry.widthMm);
  const x0 = 150;
  const y0 = 250 - geometry.widthMm * scale / 2;
  const runPx = geometry.totalRunMm * scale;
  const widthPx = geometry.widthMm * scale;
  const goingPx = geometry.goingMm * scale;
  return <>
    <rect className="stair-plan-outline" x={x0} y={y0} width={runPx} height={widthPx} />
    {geometry.treads.map((tread, index) => index % 2 === 0 && <rect key={`tread-${index}`} className="stair-tread-highlight" x={x0 + tread.xStartMm * scale} y={y0} width={goingPx} height={widthPx} />)}
    {geometry.treads.map((tread, index) => index < geometry.treads.length - 1 && <line key={index} className="stair-tread-separator" x1={x0 + tread.xEndMm * scale} y1={y0} x2={x0 + tread.xEndMm * scale} y2={y0 + widthPx} />)}
    <rect className="stair-plan-outline" x={x0} y={y0} width={runPx} height={widthPx} />
    <Dimension x1={x0} y1={y0 + widthPx + 64} x2={x0 + runPx} y2={y0 + widthPx + 64} extension1={{ x: x0, y: y0 + widthPx }} extension2={{ x: x0 + runPx, y: y0 + widthPx }} label={`Vízszintes hely ${formatMm(geometry.totalRunMm)}`} dataKey="availableRunMm" activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <Dimension x1={x0 + runPx + 48} y1={y0} x2={x0 + runPx + 48} y2={y0 + widthPx} extension1={{ x: x0 + runPx, y: y0 }} extension2={{ x: x0 + runPx, y: y0 + widthPx }} label={`Kar szélessége ${formatMm(geometry.widthMm)}`} dataKey="stairWidthMm" rotateLabel activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <text className={`stair-count-label${activeDimension === "riserCount" ? " is-active" : ""}`} x="500" y="70" textAnchor="middle" data-dimension="riserCount">Felülnézet · {geometry.treadCount} fokosztás</text>
  </>;
}

function SpiralPlan({ geometry, activeDimension, onDimensionSelect }: Readonly<{ geometry: SpiralStairDrawingGeometry; activeDimension?: string | null; onDimensionSelect?: (key: string) => void }>) {
  const center = { x: 500, y: 270 };
  const outerRadius = 158;
  const scale = outerRadius / (geometry.outerDiameterMm / 2);
  const innerRadius = geometry.innerDiameterMm / 2 * scale;
  const midRadius = geometry.walkingRadiusMm * scale;
  const point = (radius: number, angleDegrees: number) => ({ x: center.x + radius * Math.cos(angleDegrees * Math.PI / 180), y: center.y + radius * Math.sin(angleDegrees * Math.PI / 180) });
  const segmentCount = geometry.treadCount;
  const paths = geometry.stepAngleDegrees >= 360 ? [] : Array.from({ length: segmentCount }, (_, index) => {
    const start = -90 + index * geometry.stepAngleDegrees;
    const end = -90 + (index + 1) * geometry.stepAngleDegrees;
    const a = point(outerRadius, start);
    const b = point(outerRadius, end);
    const c = point(innerRadius, end);
    const d = point(innerRadius, start);
    const largeArc = geometry.stepAngleDegrees > 180 ? 1 : 0;
    return { d: `M ${a.x} ${a.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${d.x} ${d.y} Z`, start, end };
  });
  const walkingPoint = point(midRadius, -38);
  const fullTreadPath = `M ${center.x} ${center.y - outerRadius} A ${outerRadius} ${outerRadius} 0 1 1 ${center.x} ${center.y + outerRadius} A ${outerRadius} ${outerRadius} 0 1 1 ${center.x} ${center.y - outerRadius} M ${center.x} ${center.y - innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${center.x} ${center.y + innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${center.x} ${center.y - innerRadius}`;
  return <>
    {geometry.stepAngleDegrees >= 360 && <path className="spiral-tread" d={fullTreadPath} fillRule="evenodd" />}
    {paths.map((item, index) => <path key={index} className={`spiral-tread${index % 2 ? " is-alternate" : ""}`} d={item.d} />)}
    <circle className="spiral-boundary" cx={center.x} cy={center.y} r={outerRadius} />
    <circle className="spiral-boundary" cx={center.x} cy={center.y} r={innerRadius} />
    <circle className="spiral-walking-line" cx={center.x} cy={center.y} r={midRadius} />
    <line className="spiral-radius" x1={center.x} y1={center.y} x2={walkingPoint.x} y2={walkingPoint.y} />
    <text className="stair-note-label" x={walkingPoint.x + 8} y={walkingPoint.y - 12} data-dimension="outerDiameterMm">Járóvonal r {formatMm(geometry.walkingRadiusMm)}</text>
    <Dimension x1={center.x - outerRadius} y1={48} x2={center.x + outerRadius} y2={48} extension1={{ x: center.x - outerRadius, y: center.y - outerRadius }} extension2={{ x: center.x + outerRadius, y: center.y - outerRadius }} label={`Külső Ø ${formatMm(geometry.outerDiameterMm)}`} dataKey="outerDiameterMm" activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <Dimension x1={center.x - innerRadius} y1={84} x2={center.x + innerRadius} y2={84} extension1={{ x: center.x - innerRadius, y: center.y - innerRadius }} extension2={{ x: center.x + innerRadius, y: center.y - innerRadius }} label={`Belső Ø ${formatMm(geometry.innerDiameterMm)}`} dataKey="innerDiameterMm" activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <text className={`stair-count-label${activeDimension === "turnDegrees" ? " is-active" : ""}`} x="500" y="486" textAnchor="middle" data-dimension="turnDegrees">Fordulás {formatNumber(geometry.turnDegrees)}° · {geometry.treadCount} fok · {formatNumber(geometry.stepAngleDegrees)}°/fok</text>
    <text className={`stair-count-label${activeDimension === "riserCount" ? " is-active" : ""}`} x="500" y="516" textAnchor="middle" data-dimension="riserCount">Járóvonal-belépő {formatMm(geometry.walkingGoingMm)}</text>
    {geometry.turnDegrees > 360 && <text className="stair-view-note" x="500" y="544" textAnchor="middle">A több fordulat felülnézeti vetülete egymásra esik.</text>}
  </>;
}

function SpiralRise({ geometry, activeDimension, onDimensionSelect }: Readonly<{ geometry: SpiralStairDrawingGeometry; activeDimension?: string | null; onDimensionSelect?: (key: string) => void }>) {
  const top = 104;
  const bottom = 452;
  const span = bottom - top;
  const x = 490;
  const tickWidth = 30;
  return <>
    <line className="stair-rise-axis" x1={x} y1={top} x2={x} y2={bottom} />
    {Array.from({ length: geometry.riserCount + 1 }, (_, index) => <line key={index} className="stair-rise-tick" x1={x - tickWidth / 2} y1={bottom - span * index / geometry.riserCount} x2={x + tickWidth / 2} y2={bottom - span * index / geometry.riserCount} />)}
    <Dimension x1={650} y1={bottom} x2={650} y2={top} extension1={{ x: x + 20, y: bottom }} extension2={{ x: x + 20, y: top }} label={`Teljes emelkedés ${formatMm(geometry.totalRiseMm)}`} dataKey="totalRiseMm" rotateLabel activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <text className={`stair-count-label${activeDimension === "riserCount" ? " is-active" : ""}`} x="490" y="68" textAnchor="middle" data-dimension="riserCount">Fellépések {geometry.riserCount} · fokok {geometry.treadCount}</text>
    <text className={`stair-count-label${activeDimension === "totalRiseMm" ? " is-active" : ""}`} x="490" y="502" textAnchor="middle" data-dimension="totalRiseMm">Egyenletes geometriai fellépő {formatMm(geometry.riserHeightMm)}</text>
    <text className="stair-view-note" x="490" y="532" textAnchor="middle">Függőleges kiosztás · vízszintes vetület nélkül</text>
  </>;
}

function BevelProfile({ geometry, activeDimension, onDimensionSelect }: Readonly<{ geometry: BeveledRiserDrawingGeometry; activeDimension?: string | null; onDimensionSelect?: (key: string) => void }>) {
  const scale = Math.min(610 / geometry.horizontalMm, 300 / geometry.riserHeightMm);
  const x0 = 185;
  const baseY = 438;
  const x1 = x0 + geometry.horizontalMm * scale;
  const topY = baseY - geometry.riserHeightMm * scale;
  return <>
    <path className="bevel-profile" d={`M ${x0} ${baseY} L ${x1} ${baseY} L ${x1} ${topY} Z`} />
    <line className="bevel-diagonal" x1={x0} y1={baseY} x2={x1} y2={topY} />
    <Dimension x1={x0} y1={478} x2={x1} y2={478} extension1={{ x: x0, y: baseY }} extension2={{ x: x1, y: baseY }} label={`Belépő + orrkiülés ${formatMm(geometry.horizontalMm)}`} dataKey="goingMm" activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <Dimension x1={x1 + 46} y1={baseY} x2={x1 + 46} y2={topY} extension1={{ x: x1, y: baseY }} extension2={{ x: x1, y: topY }} label={`Fellépő ${formatMm(geometry.riserHeightMm)}`} dataKey="riserHeightMm" rotateLabel activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <text className={`stair-note-label${activeDimension === "nosingProjectionMm" ? " is-active" : ""}`} x={(x0 + x1) / 2 + 12} y={(baseY + topY) / 2 - 16} textAnchor="middle" data-dimension="nosingProjectionMm">Átló {formatMm(geometry.diagonalMm)}</text>
    <text className={`stair-angle-label${activeDimension === "riserHeightMm" ? " is-active" : ""}`} x={x1 - 75} y={baseY - 22} data-dimension="riserHeightMm">{formatNumber(geometry.slopeDegrees)}°</text>
    <text className="stair-count-label" x="500" y="76" textAnchor="middle">Névleges vágási geometria · illesztés és fűrészrés nélkül</text>
  </>;
}

function LandingPlan({ geometry, activeDimension, onDimensionSelect }: Readonly<{ geometry: ReturnType<typeof calculateLandingStairGeometry>; activeDimension?: string | null; onDimensionSelect?: (key: string) => void }>) {
  const scale = Math.min(650 / geometry.planWidthMm, 420 / geometry.planDepthMm);
  const x0 = (VIEWBOX.width - geometry.planWidthMm * scale) / 2;
  const y0 = (VIEWBOX.height - geometry.planDepthMm * scale) / 2 - 12;
  const mapX = (value: number) => x0 + value * scale;
  const mapY = (value: number) => y0 + value * scale;
  const polygonPoints = (points: readonly { xMm: number; yMm: number }[]) => points.map((point) => `${mapX(point.xMm)},${mapY(point.yMm)}`).join(" ");
  return <>
    {geometry.landings.map((polygon, index) => <polygon key={`landing-${index}`} className="stair-landing-fill" points={polygonPoints(polygon)} />)}
    {geometry.flights.flatMap((flight) => flight.treads.map((tread) => <polygon key={`flight-${flight.index}-tread-${tread.index}`} className={`stair-landing-tread${tread.index % 2 === 0 ? " is-alternate" : ""}${activeDimension === "goingMm" ? " is-focused" : ""}`} points={polygonPoints(tread.polygon)} />))}
    {geometry.flights.map((flight) => {
      const points = flight.treads.flatMap((tread) => tread.polygon);
      const minX = Math.min(...points.map((point) => point.xMm));
      const maxX = Math.max(...points.map((point) => point.xMm));
      const minY = Math.min(...points.map((point) => point.yMm));
      const maxY = Math.max(...points.map((point) => point.yMm));
      return <text key={`flight-label-${flight.index}`} className="stair-count-label stair-landing-flight-label" x={mapX((minX + maxX) / 2)} y={mapY((minY + maxY) / 2)} textAnchor="middle" dominantBaseline="middle">{flight.index}. kar · {flight.treadCount} fok</text>;
    })}
    <Dimension x1={mapX(0)} y1={y0 + geometry.planDepthMm * scale + 70} x2={mapX(geometry.planWidthMm)} y2={y0 + geometry.planDepthMm * scale + 70} extension1={{ x: mapX(0), y: y0 + geometry.planDepthMm * scale }} extension2={{ x: mapX(geometry.planWidthMm), y: y0 + geometry.planDepthMm * scale }} label={`Tervhossz ${formatMm(geometry.planWidthMm)}`} dataKey="openingLengthMm" activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <Dimension x1={x0 + geometry.planWidthMm * scale + 60} y1={y0} x2={x0 + geometry.planWidthMm * scale + 60} y2={y0 + geometry.planDepthMm * scale} extension1={{ x: x0 + geometry.planWidthMm * scale, y: y0 }} extension2={{ x: x0 + geometry.planWidthMm * scale, y: y0 + geometry.planDepthMm * scale }} label={`Tervszélesség ${formatMm(geometry.planDepthMm)}`} dataKey="openingWidthMm" rotateLabel activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <text className="stair-view-note" x="500" y="20" textAnchor="middle">{geometry.layout === "quarter_turn" ? "90° pihenős lépcső" : geometry.layout === "half_turn" ? `180° U-alakú pihenő · karhézag ${formatMm(geometry.landingGapMm)}` : "Háromkarú lépcső · két 90°-os pihenő"}</text>
  </>;
}

function WinderPlan({ geometry, activeDimension, onDimensionSelect }: Readonly<{ geometry: ReturnType<typeof calculateWinderStairGeometry>; activeDimension?: string | null; onDimensionSelect?: (key: string) => void }>) {
  const scale = Math.min(660 / geometry.planWidthMm, 340 / geometry.planDepthMm);
  const x0 = (VIEWBOX.width - geometry.planWidthMm * scale) / 2;
  const y0 = (VIEWBOX.height - geometry.planDepthMm * scale) / 2;
  const point = (value: { xMm: number; yMm: number }) => `${x0 + value.xMm * scale},${y0 + value.yMm * scale}`;
  const widthY = Math.min(VIEWBOX.height - 28, y0 + geometry.planDepthMm * scale + 50);
  const depthX = Math.min(VIEWBOX.width - 48, x0 + geometry.planWidthMm * scale + 52);
  return <>
    <text className="stair-count-label" x="500" y="38" textAnchor="middle">{geometry.turnDegrees}°-os forduló{geometry.turns === 2 ? " · két forduló" : ""} · {geometry.turnDirection === "right" ? "jobbra" : "balra"} · {geometry.windersPerTurn} húzott fok / forduló</text>
    <g className="stair-landing-fill">
      {geometry.treads.map((tread) => <polygon key={tread.index} points={tread.polygon.map(point).join(" ")} />)}
    </g>
    {geometry.treads.filter((tread) => tread.kind === "winder").map((tread) => <polygon key={`outline-${tread.index}`} className="stair-profile" points={tread.polygon.map(point).join(" ")} />)}
    <Dimension x1={x0} y1={widthY} x2={x0 + geometry.planWidthMm * scale} y2={widthY} extension1={{ x: x0, y: y0 + geometry.planDepthMm * scale }} extension2={{ x: x0 + geometry.planWidthMm * scale, y: y0 + geometry.planDepthMm * scale }} label={`Teljes tervhossz ${formatMm(geometry.planWidthMm)}`} dataKey="lowerTreadCount" activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <Dimension x1={depthX} y1={y0} x2={depthX} y2={y0 + geometry.planDepthMm * scale} extension1={{ x: x0 + geometry.planWidthMm * scale, y: y0 }} extension2={{ x: x0 + geometry.planWidthMm * scale, y: y0 + geometry.planDepthMm * scale }} label={`Tervszélesség ${formatMm(geometry.planDepthMm)}`} dataKey="stairWidthMm" activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} rotateLabel />
    <text className="stair-dimension-note" x="500" y="548" textAnchor="middle">Belső húr {formatMm(geometry.innerChordMm)} · járóvonal-belépő {formatMm(geometry.walkingGoingMm)}</text>
  </>;
}

function WinderElevation({ geometry, activeDimension, onDimensionSelect }: Readonly<{ geometry: ReturnType<typeof calculateWinderStairGeometry>; activeDimension?: string | null; onDimensionSelect?: (key: string) => void }>) {
  const scale = Math.min(680 / geometry.developedWalkingRunMm, 330 / geometry.totalRiseMm);
  const x0 = 130; const baseY = 445; const stepWidth = geometry.walkingGoingMm * scale; const rise = geometry.riserHeightMm * scale;
  const commands = [`M ${x0} ${baseY}`];
  for (let index = 0; index < geometry.treadCount; index += 1) commands.push(`L ${x0 + index * stepWidth} ${baseY - (index + 1) * rise}`, `L ${x0 + (index + 1) * stepWidth} ${baseY - (index + 1) * rise}`);
  const totalX = x0 + geometry.developedWalkingRunMm * scale; const topY = baseY - geometry.totalRiseMm * scale;
  commands.push(`L ${totalX} ${topY}`);
  return <>
    <path className="stair-profile" d={commands.join(" ")} />
    <Dimension x1={x0} y1={495} x2={totalX} y2={495} extension1={{ x: x0, y: baseY }} extension2={{ x: totalX, y: topY }} label={`Kiterített járóvonal ${formatMm(geometry.developedWalkingRunMm)}`} dataKey="windersPerTurn" activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <Dimension x1={totalX + 42} y1={baseY} x2={totalX + 42} y2={topY} extension1={{ x: totalX, y: baseY }} extension2={{ x: totalX, y: topY }} label={`Emelkedés ${formatMm(geometry.totalRiseMm)}`} dataKey="totalRiseMm" activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} rotateLabel />
    <text className="stair-count-label" x="500" y="60" textAnchor="middle">{geometry.riserCount} fellépés · {geometry.treadCount} vízszintes fok · fellépő {formatMm(geometry.riserHeightMm)}</text>
    <text className="stair-dimension-note" x="500" y="548" textAnchor="middle">Kiterített járóvonal-profil · nem oldalnézeti gyártási rajz</text>
  </>;
}

function landingPlanViewportBounds(geometry: ReturnType<typeof calculateLandingStairGeometry>) {
  const scale = Math.min(650 / geometry.planWidthMm, 420 / geometry.planDepthMm);
  const width = geometry.planWidthMm * scale;
  const depth = geometry.planDepthMm * scale;
  const x = (VIEWBOX.width - width) / 2;
  const y = (VIEWBOX.height - depth) / 2 - 12;
  return { minX: x - 54, minY: Math.min(y - 22, 4), maxX: x + width + 82, maxY: y + depth + 78 };
}

function ConcreteProfile({ geometry, activeDimension, onDimensionSelect }: Readonly<{ geometry: ReturnType<typeof calculateConcreteStairGeometry>; activeDimension?: string | null; onDimensionSelect?: (key: string) => void }>) {
  const scale = Math.min(620 / geometry.availableRunMm, 300 / geometry.totalRiseMm);
  const x0 = 175;
  const baseY = 430;
  const x1 = x0 + geometry.availableRunMm * scale;
  const topY = baseY - geometry.totalRiseMm * scale;
  const going = geometry.goingMm * scale;
  const rise = geometry.riserHeightMm * scale;
  let x = x0;
  const commands = [`M ${x0} ${baseY}`];
  for (let index = 0; index < geometry.treadCount; index += 1) {
    const levelY = baseY - (index + 1) * rise;
    commands.push(`L ${x} ${levelY}`, `L ${x + going} ${levelY}`);
    x += going;
  }
  commands.push(`L ${x1} ${topY}`);
  const bodyPath = `${commands.join(" ")} L ${x1} ${baseY} Z`;
  return <>
    <path className="stair-concrete-body" d={bodyPath} />
    <path className="stair-profile" d={commands.join(" ")} />
    <Dimension x1={x0} y1={492} x2={x1} y2={492} extension1={{ x: x0, y: baseY }} extension2={{ x: x1, y: topY }} label={`Vízszintes futás ${formatMm(geometry.availableRunMm)}`} dataKey="availableRunMm" activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <Dimension x1={x1 + 62} y1={baseY} x2={x1 + 62} y2={topY} extension1={{ x: x1, y: baseY }} extension2={{ x: x1, y: topY }} label={`Teljes emelkedés ${formatMm(geometry.totalRiseMm)}`} dataKey="totalRiseMm" rotateLabel activeDimension={activeDimension} onDimensionSelect={onDimensionSelect} />
    <text className={`stair-count-label${activeDimension === "riserCount" ? " is-active" : ""}`} x="500" y="70" textAnchor="middle" data-dimension="riserCount">{geometry.riserCount} fellépés · {geometry.treadCount} fok · {formatNumber(geometry.pitchDegrees)}°</text>
  </>;
}

function Dimension({ x1, y1, x2, y2, extension1, extension2, label, dataKey, activeDimension, onDimensionSelect, rotateLabel = false }: Readonly<{
  x1: number; y1: number; x2: number; y2: number;
  extension1: { x: number; y: number }; extension2: { x: number; y: number };
  label: string; dataKey: string; activeDimension?: string | null; onDimensionSelect?: (key: string) => void; rotateLabel?: boolean;
}>) {
  const active = activeDimension === dataKey;
  const labelX = (x1 + x2) / 2;
  const labelY = (y1 + y2) / 2 - (rotateLabel ? 0 : 12);
  const focus = () => onDimensionSelect?.(dataKey);
  return <g className={`stair-dimension${active ? " is-active" : ""}`} data-dimension={dataKey} role={onDimensionSelect ? "button" : undefined} tabIndex={onDimensionSelect ? 0 : undefined} aria-label={`${label} mezőre fókuszálás`} aria-pressed={onDimensionSelect ? active : undefined} onPointerDown={onDimensionSelect ? (event) => { event.preventDefault(); event.stopPropagation(); } : undefined} onClick={focus} onKeyDown={onDimensionSelect ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); focus(); } } : undefined}>
    <line className="stair-extension" x1={extension1.x} y1={extension1.y} x2={x1} y2={y1} />
    <line className="stair-extension" x1={extension2.x} y1={extension2.y} x2={x2} y2={y2} />
    <line className="stair-dimension-line" x1={x1} y1={y1} x2={x2} y2={y2} markerStart="url(#stair-arrow)" markerEnd="url(#stair-arrow)" />
    <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" transform={rotateLabel ? `rotate(-90 ${labelX} ${labelY})` : undefined}>{label}</text>
  </g>;
}

function formatNumber(value: number) { return new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 }).format(value); }
function formatMm(value: number) { return `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(value)} mm`; }

function stairViews(model: StairDrawingModel) {
  if (model.kind === "winder") return [{ id: "plan", label: "Alaprajz" }, { id: "elevation", label: "Kiterített profil" }];
  if (model.kind === "straight") return [{ id: "side", label: "Oldalnézet" }, ...(model.geometry.widthMm ? [{ id: "plan", label: "Felülnézet" }] : [])];
  if (model.kind === "spiral") return [{ id: "plan", label: "Alaprajz" }, { id: "rise", label: "Fellépés-kiosztás" }];
  if (model.kind === "landing") return [{ id: "plan", label: "Alaprajz" }];
  if (model.kind === "concrete") return [{ id: "profile", label: "Oldalnézet" }];
  return [{ id: "profile", label: "Keresztmetszet" }];
}

export function ConstructionStairDrawing({ referenceId, values, focusedDimension, onDimensionSelect }: Readonly<{
  referenceId: string;
  values: Readonly<Record<string, string>>;
  focusedDimension?: string | null;
  onDimensionSelect?: (key: string) => void;
}>) {
  const model = useMemo(() => {
    try { return buildDrawingModel(referenceId, values); } catch { return null; }
  }, [referenceId, values]);
  if (!model) return null;
  return <InteractiveStairDrawing model={model} focusedDimension={focusedDimension} onDimensionSelect={onDimensionSelect} />;
}

/** Original quantity diagrams for the concrete, foundation and helper calculators. */
export function ConstructionMaterialDrawing({ referenceId, values, focusedDimension, onDimensionSelect, initialView }: Readonly<{
  referenceId: string;
  values: Readonly<Record<string, string>>;
  focusedDimension?: string | null;
  onDimensionSelect?: (key: string) => void;
  initialView?: string;
}>) {
  const id = referenceId;
  const value = (key: string) => {
    const parsed = Number((values[key] ?? "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const length = value(id === "concrete.strip" ? "totalCenterlineLengthMm" : id === "concrete.paving" ? "lengthMm" : id === "concrete.blind_area" ? "buildingLengthMm" : "lengthMm");
  const width = value(id === "concrete.strip" ? "widthMm" : id === "concrete.paving" ? "widthMm" : id === "concrete.blind_area" ? "buildingWidthMm" : "widthMm");
  const height = value(id === "concrete.strip" ? "depthMm" : id === "concrete.slab" ? "thicknessMm" : id === "concrete.ring" ? "heightMm" : "heightMm");
  const diameter = value(id === "concrete.pile" ? "diameterMm" : id === "concrete.ring" ? "outerDiameterMm" : "barDiameterMm");
  const [view, setView] = useState(() => initialView ?? (id === "concrete.mix" ? "mix" : id === "concrete.rebar" ? "bars" : "plan"));
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<ViewportPoint>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const pointers = useRef(new Map<number, ViewportPoint>());
  const gesture = useRef<{ kind: "pan" | "pinch"; startPoint?: ViewportPoint; startPan: ViewportPoint; startZoom: number; distance?: number; midpoint?: ViewportPoint } | null>(null);
  const viewport = useRef({ zoom: 1, pan: { x: 0, y: 0 } });
  const views = id === "concrete.mix" ? [{ id: "mix", label: "Mennyiségek" }]
    : id === "concrete.rebar" ? [{ id: "bars", label: "Rúdnézet" }, { id: "section", label: "Keresztmetszet" }]
    : id === "concrete.pile" || id === "concrete.ring" ? [{ id: "plan", label: "Felülnézet" }, { id: "section", label: "Metszet" }]
    : id === "concrete.strip" || id === "concrete.slab" ? [{ id: "plan", label: "Alaprajz" }, { id: "section", label: "Metszet" }]
    : id === "concrete.paving" ? [{ id: "plan", label: "Felület" }, { id: "tile", label: "Lapméret" }]
    : id === "concrete.blind_area" ? [{ id: "plan", label: "Alaprajz" }, { id: "section", label: "Rétegmetszet" }]
    : [{ id: "plan", label: "Alaprajz" }];
  useEffect(() => { if (!views.some((item) => item.id === view)) setView(views[0].id); }, [id, view, views]);
  useEffect(() => {
    const targetView = id === "concrete.strip" && focusedDimension === "depthMm" ? "section"
      : id === "concrete.pile" && focusedDimension === "lengthMm" ? "section"
      : id === "concrete.slab" && focusedDimension === "thicknessMm" ? "section"
      : id === "concrete.ring" && focusedDimension === "heightMm" ? "section"
      : id === "concrete.paving" && (focusedDimension === "tileLengthMm" || focusedDimension === "tileWidthMm") ? "tile"
      : id === "concrete.blind_area" && (focusedDimension === "concreteThicknessMm" || focusedDimension === "gravelThicknessMm") ? "section"
      : id === "concrete.rebar" && focusedDimension === "barDiameterMm" ? "section"
      : null;
    if (targetView && targetView !== view && views.some((item) => item.id === targetView)) setView(targetView);
  }, [focusedDimension, id, view, views]);
  useEffect(() => { viewport.current = { zoom: 1, pan: { x: 0, y: 0 } }; setZoom(1); setPan({ x: 0, y: 0 }); }, [id, values, view]);
  const title = `${constructionCalculatorCatalog.find((item) => item.id === id)?.title ?? "Építési kalkulátor"} műszaki vázlata`;
  const setViewport = useCallback((next: { zoom: number; pan: ViewportPoint }) => {
    const nextZoom = clampDrawingZoom(next.zoom);
    const nextPan = { x: Number.isFinite(next.pan.x) ? next.pan.x : 0, y: Number.isFinite(next.pan.y) ? next.pan.y : 0 };
    viewport.current = { zoom: nextZoom, pan: nextPan }; setZoom(nextZoom); setPan(nextPan);
  }, []);
  const fitViewport = useCallback(() => {
    const svg = svgRef.current;
    const rect = svg?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const bounds = id === "concrete.ring" && view === "section"
      ? { minX: 280, minY: 40, maxX: 840, maxY: 520 }
      : { minX: 72, minY: 55, maxX: 928, maxY: 505 };
    setViewport(fitDrawingViewport(bounds, { width: rect.width, height: rect.height }, 24));
  }, [id, setViewport, view]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(fitViewport);
    const element = svgRef.current;
    const observer = typeof ResizeObserver === "undefined" || !element ? null : new ResizeObserver(fitViewport);
    observer?.observe(element!);
    if (!observer) window.addEventListener("resize", fitViewport);
    return () => { window.cancelAnimationFrame(frame); observer?.disconnect(); if (!observer) window.removeEventListener("resize", fitViewport); };
  }, [fitViewport, id, values, view]);
  const pointAt = (event: { clientX: number; clientY: number }) => {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect ? clientPointToViewBox({ x: event.clientX, y: event.clientY }, rect) : null;
  };
  const midpoint = (a: ViewportPoint, b: ViewportPoint): ViewportPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const distance = (a: ViewportPoint, b: ViewportPoint) => Math.hypot(b.x - a.x, b.y - a.y);
  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if ((event.target as Element).closest("[data-dimension]")) return;
    const point = pointAt(event); if (!point) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 1) gesture.current = { kind: "pan", startPoint: point, startPan: viewport.current.pan, startZoom: viewport.current.zoom };
    if (pointers.current.size >= 2) { const [first, second] = [...pointers.current.values()]; gesture.current = { kind: "pinch", startPan: viewport.current.pan, startZoom: viewport.current.zoom, distance: distance(first, second), midpoint: midpoint(first, second) }; }
  };
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const point = pointAt(event); if (!point) return; pointers.current.set(event.pointerId, point);
    const current = gesture.current; const active = [...pointers.current.values()]; if (!current) return;
    if (current.kind === "pinch" && active.length >= 2 && current.distance && current.midpoint) setViewport(pinchViewport({ zoom: current.startZoom, pan: current.startPan, distance: current.distance, midpoint: current.midpoint }, { distance: distance(active[0], active[1]), midpoint: midpoint(active[0], active[1]) }, { x: 500, y: 280 }));
    else if (current.kind === "pan" && current.startPoint && active.length === 1) setViewport({ zoom: viewport.current.zoom, pan: panViewport({ pan: current.startPan, point: current.startPoint }, active[0], current.startZoom) });
  };
  const stopPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.delete(event.pointerId); try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* The browser can release capture before this handler runs. */ }
    const remaining = [...pointers.current.values()]; const rebased = rebasePanGesture(remaining, viewport.current);
    gesture.current = rebased ? { kind: "pan", ...rebased } : null;
  };
  useEffect(() => () => {
    for (const pointerId of pointers.current.keys()) {
      try { if (svgRef.current?.hasPointerCapture(pointerId)) svgRef.current.releasePointerCapture(pointerId); } catch { /* Pointer capture may already be released during unmount. */ }
    }
    pointers.current.clear(); gesture.current = null;
  }, []);
  const dim = (x1: number, y1: number, x2: number, y2: number, label: string, key: string, vertical = false) => {
    const active = focusedDimension === key;
    const activate = () => onDimensionSelect?.(key);
    return <g className={`construction-dimension${active ? " is-active" : ""}`} role="button" tabIndex={0} aria-label={`${label}; kapcsolódó mező megnyitása`} data-dimension={key} onClick={activate} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(); } }}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <line x1={x1 - (vertical ? 5 : 0)} y1={y1 - (vertical ? 0 : 5)} x2={x1 + (vertical ? 5 : 0)} y2={y1 + (vertical ? 0 : 5)} />
      <line x1={x2 - (vertical ? 5 : 0)} y1={y2 - (vertical ? 0 : 5)} x2={x2 + (vertical ? 5 : 0)} y2={y2 + (vertical ? 0 : 5)} />
      <text x={vertical ? x1 + 12 : (x1 + x2) / 2} y={vertical ? (y1 + y2) / 2 : y1 - 10} textAnchor={vertical ? "start" : "middle"}>{label}</text>
    </g>;
  };
  const ratioGroup = (item: { key: string; label: string }, amount: number, x: number, y: number, barWidth: number) => {
    const activate = () => onDimensionSelect?.(item.key);
    return <g key={item.key} className={`construction-dimension${focusedDimension === item.key ? " is-active" : ""}`} role="button" tabIndex={0} aria-label={`${item.label}: ${amount} rész; kapcsolódó mező megnyitása`} data-dimension={item.key} onClick={activate} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(); } }}>
      <text x={x - 20} y={y + 30} textAnchor="end">{item.label} · {amount} rész</text><rect x={x} y={y} width={barWidth} height="48" rx="5" /><text x={x + barWidth + 12} y={y + 30}>arányos tömeg</text>
    </g>;
  };
  const centerText = (text: string, y = 525) => <text className="construction-drawing-label" x="500" y={y} textAnchor="middle">{text}</text>;
  const centerDimensionText = (key: string, text: string, y = 490) => <text className={`construction-drawing-label construction-dimension-label${focusedDimension === key ? " is-active" : ""}`} x="500" y={y} textAnchor="middle" role="button" tabIndex={0} data-dimension={key} onClick={() => onDimensionSelect?.(key)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onDimensionSelect?.(key); } }}>{text}</text>;
  const rectScale = (a: number, b: number, maxWidth = 560, maxHeight = 300) => {
    const scale = Math.min(maxWidth / a, maxHeight / b);
    return { scale, x: 500 - a * scale / 2, y: 260 - b * scale / 2, w: a * scale, h: b * scale };
  };
  let geometry: React.ReactNode;
  if (id === "concrete.mix") {
    const ratios = [{ key: "cementRatio", label: "Cement" }, { key: "sandRatio", label: "Homok" }, { key: "aggregateRatio", label: "Adalék" }];
    const maxRatio = Math.max(1, ...ratios.map((item) => value(item.key)));
    geometry = <>{ratios.map((item, index) => { const y = 145 + index * 102; const amount = value(item.key); return ratioGroup(item, amount, 280, y, Math.max(1, 430 * amount / maxRatio)); })}{centerText("Megadott tömegarány · receptet nem ajánl", 500)}</>;
  } else if (id === "concrete.strip") {
    const r = rectScale(length, width || 1);
    const crossScale = Math.min(270 / width, 220 / height); const crossW = width * crossScale; const crossH = height * crossScale; const crossX = 500 - crossW / 2; const crossY = 240 - crossH / 2;
    geometry = view === "section" ? <><rect className="construction-technical-fill" x={crossX} y={crossY} width={crossW} height={crossH} />{dim(crossX, crossY + crossH + 40, crossX + crossW, crossY + crossH + 40, `${width} mm szélesség`, "widthMm")}{dim(crossX + crossW + 40, crossY, crossX + crossW + 40, crossY + crossH, `${height} mm mélység`, "depthMm", true)}{centerText("Állandó téglalap keresztmetszet · nincs sarkok kiosztása", 455)}</> : <><rect className="construction-technical-fill" x={r.x} y={r.y} width={r.w} height={r.h} />{dim(r.x, r.y + r.h + 55, r.x + r.w, r.y + r.h + 55, `${length} mm összes tengelyhossz`, "totalCenterlineLengthMm")}{dim(r.x + r.w + 36, r.y, r.x + r.w + 36, r.y + r.h, `${width} mm`, "widthMm", true)}{centerText("Egyenes sematikus kiterítés · nem mutat sarkokat", 460)}</>;
  } else if (id === "concrete.pile") {
    const count = Math.min(12, Math.max(1, Math.round(value("count"))));
    const pileLength = value("lengthMm"); const pileScale = Math.min(150 / diameter, 310 / pileLength); const pileW = diameter * pileScale; const pileH = pileLength * pileScale; const pileX = 500 - pileW / 2; const pileY = 250 - pileH / 2;
    geometry = view === "section" ? <><rect className="construction-technical-fill" x={pileX} y={pileY} width={pileW} height={pileH} rx={Math.min(pileW / 2, 18)} />{dim(pileX, pileY + pileH + 42, pileX + pileW, pileY + pileH + 42, `Ø ${diameter} mm`, "diameterMm")}{dim(pileX + pileW + 42, pileY, pileX + pileW + 42, pileY + pileH, `${pileLength} mm`, "lengthMm", true)}{centerText(`${value("count")} db azonos, egyenes körszárú elem · talpbővítés nélkül`)}</> : <>{Array.from({ length: count }, (_, i) => { const cols = Math.min(6, count); const rows = Math.ceil(count / cols); const x = 500 - (cols - 1) * 105 / 2 + (i % cols) * 105; const y = 250 - (rows - 1) * 105 / 2 + Math.floor(i / cols) * 105; return <circle key={i} className="construction-technical-fill" cx={x} cy={y} r="34" />; })}{dim(466, 360, 534, 360, `Ø ${diameter} mm`, "diameterMm")}{centerText(`${value("count")} db · a tervbeli helyzet és kiosztás nincs megadva${value("count") > 12 ? " · legfeljebb 12 elem látszik" : ""}`)}</>;
  } else if (id === "concrete.slab") {
    const r = rectScale(length, width);
    const slabScale = Math.min(640 / length, 210 / height); const slabW = length * slabScale; const slabH = height * slabScale; const slabX = 500 - slabW / 2; const slabY = 255 - slabH / 2;
    geometry = view === "section" ? <><rect className="construction-technical-fill" x={slabX} y={slabY} width={slabW} height={slabH} />{dim(slabX, slabY + slabH + 42, slabX + slabW, slabY + slabH + 42, `${length} mm hossz`, "lengthMm")}{dim(slabX + slabW + 42, slabY, slabX + slabW + 42, slabY + slabH, `${height} mm vastagság`, "thicknessMm", true)}</> : <><rect className="construction-technical-fill" x={r.x} y={r.y} width={r.w} height={r.h} />{dim(r.x, r.y + r.h + 55, r.x + r.w, r.y + r.h + 55, `${length} mm`, "lengthMm")}{dim(r.x + r.w + 42, r.y, r.x + r.w + 42, r.y + r.h, `${width} mm`, "widthMm", true)}</>;
  } else if (id === "concrete.ring") {
    const outer = 170;
    const inner = outer * (value("outerDiameterMm") - 2 * value("wallThicknessMm")) / value("outerDiameterMm");
    const ringScale = Math.min((view === "section" ? 400 : 240) / value("outerDiameterMm"), (view === "section" ? 400 : 250) / height); const outerWidth = value("outerDiameterMm") * ringScale; const wall = value("wallThicknessMm") * ringScale; const ringHeight = height * ringScale; const left = 500 - outerWidth / 2; const top = 260 - ringHeight / 2; const innerLeft = left + wall;
    geometry = view === "section" ? <><rect className="construction-technical-fill" x={left} y={top} width={wall} height={ringHeight} /><rect className="construction-technical-fill" x={innerLeft + outerWidth - 2 * wall} y={top} width={wall} height={ringHeight} />{dim(left, top + ringHeight + 48, left + outerWidth, top + ringHeight + 48, `Ø ${value("outerDiameterMm")} mm külső`, "outerDiameterMm")}{dim(left, top - 24, left + wall, top - 24, `${value("wallThicknessMm")} mm fal`, "wallThicknessMm")}{dim(left + outerWidth + 42, top, left + outerWidth + 42, top + ringHeight, `${height} mm`, "heightMm", true)}</> : <><circle cx="500" cy="260" r={outer} className="construction-technical-fill" /><circle cx="500" cy="260" r={inner} className="construction-technical-cutout" />{dim(500 - outer, 485, 500 + outer, 485, `Ø ${value("outerDiameterMm")} mm`, "outerDiameterMm")}{dim(500 - inner, 445, 500 + inner, 445, `Ø ${value("outerDiameterMm") - 2 * value("wallThicknessMm")} mm belső`, "wallThicknessMm")}</>;
  } else if (id === "concrete.paving") {
    const a = view === "tile" ? value("tileLengthMm") : length;
    const b = view === "tile" ? value("tileWidthMm") : width;
    const r = rectScale(a, b);
    geometry = <><rect className="construction-technical-fill" x={r.x} y={r.y} width={r.w} height={r.h} />{view === "plan" && <text className="construction-drawing-label" x="500" y="260" textAnchor="middle">Terület · lapkiosztás nélkül</text>}{dim(r.x, r.y + r.h + 55, r.x + r.w, r.y + r.h + 55, `${a} mm`, view === "tile" ? "tileLengthMm" : "lengthMm")}{dim(r.x + r.w + 42, r.y, r.x + r.w + 42, r.y + r.h, `${b} mm`, view === "tile" ? "tileWidthMm" : "widthMm", true)}</>;
  } else if (id === "concrete.blind_area") {
    const outerL = length + 2 * value("apronWidthMm"); const outerW = width + 2 * value("apronWidthMm");
    const r = rectScale(outerL, outerW, 540, 310); const inset = value("apronWidthMm") * r.w / outerL;
    geometry = view === "section" ? <>{value("concreteThicknessMm") > 0 && <rect className="construction-technical-fill" x="245" y="290" width="510" height={Math.max(16, value("concreteThicknessMm") / Math.max(value("concreteThicknessMm"), value("gravelThicknessMm"), 1) * 48)} />}{value("gravelThicknessMm") > 0 && <rect className="construction-technical-layer" x="245" y="340" width="510" height={Math.max(16, value("gravelThicknessMm") / Math.max(value("concreteThicknessMm"), value("gravelThicknessMm"), 1) * 48)} />}{value("concreteThicknessMm") === 0 && value("gravelThicknessMm") === 0 ? centerText("Rétegvastagság nincs megadva", 295) : centerText("Csak megadott rétegek · sematikus, nem lejtés- vagy vízelvezetési terv", 440)}{value("concreteThicknessMm") > 0 && dim(775, 290, 775, 338, `${value("concreteThicknessMm")} mm beton`, "concreteThicknessMm", true)}{value("gravelThicknessMm") > 0 && dim(820, 340, 820, 388, `${value("gravelThicknessMm")} mm kavics`, "gravelThicknessMm", true)}</> : <><rect className="construction-technical-band" x={r.x} y={r.y} width={r.w} height={r.h} /><rect className="construction-technical-cutout" x={r.x + inset} y={r.y + inset} width={r.w - 2 * inset} height={r.h - 2 * inset} />{dim(r.x, r.y + r.h + 48, r.x + r.w, r.y + r.h + 48, `${outerL} mm külső hossz`, "buildingLengthMm")}{dim(r.x + inset, r.y + r.h / 2, r.x + inset + 2 * inset, r.y + r.h / 2, `${value("apronWidthMm")} mm sáv`, "apronWidthMm")}{centerText(`Belső épület: ${length} × ${width} mm`)}</>;
  } else if (id === "concrete.rebar") {
    const pieces = Math.min(12, Math.max(1, Math.round(value("pieceCount"))));
    geometry = view === "section" ? <><circle className="construction-technical-fill" cx="500" cy="260" r="100" /><circle className="construction-technical-cutout" cx="500" cy="260" r="25" />{dim(475, 390, 525, 390, `Ø ${diameter} mm · jelképes nagyítás`, "barDiameterMm")}{centerText("A kör csak a megadott átmérőt jelöli; nincs tényleges keresztmetszeti lépték")}</> : <>{Array.from({ length: pieces }, (_, i) => <line key={i} className="construction-rebar-line" x1={240 + i * 44} y1="170" x2={240 + i * 44} y2="360" />)}{dim(240, 415, 240 + 190, 415, `${value("cutLengthMm")} mm / rúd`, "cutLengthMm")}{centerText(`${value("pieceCount")} db · ${diameter} mm átmérő · párhuzamos sematikus ábrázolás${value("pieceCount") > 12 ? " · legfeljebb 12 elem látszik" : ""}`)}</>;
  } else if (id === "concrete.mesh") {
    const l = value("lengthMm"); const w = value("widthMm"); const r = rectScale(l, w, 540, 300); const insetX = value("coverMm") * r.scale; const insetY = value("coverMm") * r.scale; const innerX = r.x + insetX; const innerY = r.y + insetY; const innerW = r.w - 2 * insetX; const innerH = r.h - 2 * insetY;
    const mesh = calculateReinforcementMesh({ lengthMm: value("lengthMm"), widthMm: value("widthMm"), coverMm: value("coverMm"), spacingMm: value("spacingMm"), barDiameterMm: value("barDiameterMm"), steelDensityKgPerM3: value("steelDensityKgPerM3") || 7_850 });
    const intervalsX = Math.max(1, mesh.widthwiseBarCount - 1); const intervalsY = Math.max(1, mesh.lengthwiseBarCount - 1);
    const nx = Math.min(28, intervalsX); const ny = Math.min(20, intervalsY);
    geometry = <><rect className="construction-technical-band" x={r.x} y={r.y} width={r.w} height={r.h} /><rect className="construction-technical-cutout" x={innerX} y={innerY} width={innerW} height={innerH} />{Array.from({ length: nx + 1 }, (_, i) => <line key={`v${i}`} className="construction-mesh-line" x1={innerX + i * innerW / nx} y1={innerY} x2={innerX + i * innerW / nx} y2={innerY + innerH} />)}{Array.from({ length: ny + 1 }, (_, i) => { const y = innerY + i * innerH / ny; return <line key={`h${i}`} className="construction-mesh-line" x1={innerX} y1={y} x2={innerX + innerW} y2={y} />; })}<rect className="construction-technical-outline" x={r.x} y={r.y} width={r.w} height={r.h} />{dim(r.x, r.y + r.h + 52, r.x + r.w, r.y + r.h + 52, `${l} mm teljes hossz`, "lengthMm")}{dim(r.x + r.w + 42, r.y, r.x + r.w + 42, r.y + r.h, `${w} mm teljes szélesség`, "widthMm", true)}{dim(r.x, r.y - 28, innerX, r.y - 28, `${value("coverMm")} mm fedés`, "coverMm")}{intervalsX <= 28 ? dim(innerX, innerY - 28, innerX + innerW / intervalsX, innerY - 28, `${mesh.actualSpacingAlongLengthMm} mm tényleges osztás`, "spacingMm") : centerDimensionText("spacingMm", `Tényleges osztás: ${mesh.actualSpacingAlongLengthMm} × ${mesh.actualSpacingAlongWidthMm} mm · ritkított sematikus rács`, 490)}{centerText(`${mesh.lengthwiseBarCount}/${mesh.widthwiseBarCount} rúd · a rajzon legfeljebb 28/20 ismétlés`, 525)}</>;
  } else {
    const r = rectScale(length, width);
    geometry = <><rect className="construction-technical-outline" x={r.x} y={r.y} width={r.w} height={r.h} /><line className="construction-diagonal-line" x1={r.x} y1={r.y + r.h} x2={r.x + r.w} y2={r.y} /><path className="construction-technical-outline" d={`M ${r.x + 18} ${r.y + r.h} v -18 h 18`} />{dim(r.x, r.y + r.h + 55, r.x + r.w, r.y + r.h + 55, `${length} mm`, "lengthMm")}{dim(r.x + r.w + 40, r.y, r.x + r.w + 40, r.y + r.h, `${width} mm`, "widthMm", true)}<text className="construction-drawing-label" x="500" y="245" textAnchor="middle">d = átló</text>{centerText("90° kitűzési segédgeometria")}</>;
  }
  return <section className="construction-stair-drawing construction-material-drawing" aria-label={title}>
    <div className="construction-stair-drawing-heading"><div><p className="section-eyebrow">MÉRETEZETT MENNYISÉGI VÁZLAT</p><h3>Műszaki rajz</h3></div><span>{id.startsWith("aux.") ? "Segédgeometria" : "Beton és alapozás"}</span></div>
    <div className="construction-stair-view-tabs" role="group" aria-label="Műszaki rajz nézetei">{views.map((item) => <button key={item.id} type="button" aria-pressed={view === item.id} className={view === item.id ? "is-active" : ""} onClick={() => setView(item.id)}>{item.label}</button>)}</div>
    <GlassToolbar ariaLabel="Műszaki rajz vezérlői" className="construction-stair-toolbar"><div className="drawing-toolbar-group" aria-label="Nagyítás"><button type="button" aria-label="Rajz kicsinyítése" onClick={() => setViewport({ zoom: viewport.current.zoom - .1, pan: viewport.current.pan })}><Minus aria-hidden="true" className="size-4" /></button><output className="drawing-zoom-value" aria-live="polite">{Math.round(zoom * 100)}%</output><button type="button" aria-label="Rajz nagyítása" onClick={() => setViewport({ zoom: viewport.current.zoom + .1, pan: viewport.current.pan })}><Plus aria-hidden="true" className="size-4" /></button></div><div className="drawing-toolbar-group" aria-label="Rajz elrendezése"><button type="button" aria-label="Rajz illesztése" onClick={fitViewport}><Maximize2 aria-hidden="true" className="size-4" /></button><button type="button" aria-label="Nézet visszaállítása" onClick={() => setViewport({ zoom: 1, pan: { x: 0, y: 0 } })}><RotateCcw aria-hidden="true" className="size-4" /></button></div></GlassToolbar>
    <div className="construction-stair-canvas" ref={canvasRef}><svg ref={svgRef} className="construction-stair-svg" viewBox="0 0 1000 560" role="group" aria-label={title} preserveAspectRatio="xMidYMid meet" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopPointer} onPointerCancel={stopPointer} onLostPointerCapture={stopPointer}><title>{title}</title><desc>A rajz az aktuális, ellenőrzött kalkulátor bemeneteinek geometriai méreteit mutatja. Nem szerkezeti terv.</desc><g transform={`translate(${500 + pan.x} ${280 + pan.y}) scale(${zoom}) translate(-500 -280)`}>{geometry}</g></svg></div>
    {focusedDimension && <p className="construction-stair-focus-note" role="status">A kiemelt méret a fókuszált adatmezőhöz tartozik.</p>}
    <p className="construction-stair-caption">Mennyiségi geometriai vázlat. Nem szerkezeti vagy kivitelezési jóváhagyás.</p>
  </section>;
}

function InteractiveStairDrawing({ model, focusedDimension, onDimensionSelect }: Readonly<{
  model: StairDrawingModel;
  focusedDimension?: string | null;
  onDimensionSelect?: (key: string) => void;
}>) {
  const drawingId = useId().replace(/:/g, "");
  const titleId = `stair-drawing-title-${drawingId}`;
  const descriptionId = `stair-drawing-description-${drawingId}`;
  const views = useMemo(() => stairViews(model), [model]);
  const [view, setView] = useState(views[0].id);
  const [zoom, setZoom] = useState<number>(drawingInitialViewport.zoom);
  const [pan, setPan] = useState<ViewportPoint>({ ...drawingInitialViewport.pan });
  const [compactPlanView, setCompactPlanView] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const pointers = useRef(new Map<number, ViewportPoint>());
  const animationFrame = useRef<number | null>(null);
  const gesture = useRef<{ kind: "pan" | "pinch"; startPoint?: ViewportPoint; startPan: { x: number; y: number }; startZoom: number; distance?: number; midpoint?: ViewportPoint } | null>(null);
  const viewport = useRef<{ zoom: number; pan: { x: number; y: number } }>({ zoom: drawingInitialViewport.zoom, pan: { ...drawingInitialViewport.pan } });

  useEffect(() => {
    if (!views.some((item) => item.id === view)) setView(views[0].id);
  }, [view, views]);

  useEffect(() => {
    const element = svgRef.current;
    if (!element) return;
    const update = () => setCompactPlanView(model.kind === "landing" && element.clientWidth <= 390);
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [model.kind]);

  const setViewport = useCallback((next: Readonly<{ zoom: number; pan: ViewportPoint }>) => {
    const value = { zoom: clampDrawingZoom(next.zoom), pan: { x: Number.isFinite(next.pan.x) ? next.pan.x : 0, y: Number.isFinite(next.pan.y) ? next.pan.y : 0 } };
    viewport.current = value;
    setZoom(value.zoom);
    setPan(value.pan);
  }, []);
  const resetViewport = useCallback(() => setViewport(drawingInitialViewport), [setViewport]);
  const fitViewport = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const bounds = model.kind === "landing" ? landingPlanViewportBounds(model.geometry) : { minX: 64, minY: 34, maxX: 936, maxY: 526 };
    setViewport(fitDrawingViewport(bounds, { width: rect.width, height: rect.height }, 30));
  }, [model, setViewport]);
  const setZoomBounded = useCallback((value: number) => setViewport({ zoom: value, pan: viewport.current.pan }), [setViewport]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(fitViewport);
    const element = svgRef.current;
    const observer = typeof ResizeObserver === "undefined" || !element ? null : new ResizeObserver(fitViewport);
    observer?.observe(element!);
    if (!observer) window.addEventListener("resize", fitViewport);
    return () => { window.cancelAnimationFrame(frame); observer?.disconnect(); if (!observer) window.removeEventListener("resize", fitViewport); };
  }, [fitViewport, model, view]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoomBounded(viewport.current.zoom + (event.deltaY < 0 ? .1 : -.1));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [setZoomBounded]);
  useEffect(() => () => {
    if (animationFrame.current !== null) window.cancelAnimationFrame(animationFrame.current);
    for (const pointerId of pointers.current.keys()) {
      try { if (svgRef.current?.hasPointerCapture(pointerId)) svgRef.current.releasePointerCapture(pointerId); } catch { /* Pointer capture may already be released by the browser. */ }
    }
    pointers.current.clear();
    gesture.current = null;
  }, []);

  const clientToViewBox = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (svg && matrix) {
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const transformed = point.matrixTransform(matrix.inverse());
      return { x: transformed.x, y: transformed.y };
    }
    const rect = svg?.getBoundingClientRect();
    return rect ? clientPointToViewBox({ x: clientX, y: clientY }, rect) : null;
  };
  const midpoint = (a: ViewportPoint, b: ViewportPoint): ViewportPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const distance = (a: ViewportPoint, b: ViewportPoint) => Math.hypot(b.x - a.x, b.y - a.y);
  const applyGesture = () => {
    const currentGesture = gesture.current;
    if (!currentGesture) return;
    const active = [...pointers.current.values()];
    if (currentGesture.kind === "pinch" && active.length >= 2 && currentGesture.distance && currentGesture.midpoint) {
      setViewport(pinchViewport({ zoom: currentGesture.startZoom, pan: currentGesture.startPan, distance: currentGesture.distance, midpoint: currentGesture.midpoint }, { distance: distance(active[0], active[1]), midpoint: midpoint(active[0], active[1]) }, { x: VIEWBOX.width / 2, y: VIEWBOX.height / 2 }));
    } else if (currentGesture.kind === "pan" && currentGesture.startPoint && active.length === 1) {
      setViewport({ zoom: viewport.current.zoom, pan: panViewport({ pan: currentGesture.startPan, point: currentGesture.startPoint }, active[0], currentGesture.startZoom) });
    }
  };
  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if ((event.target as Element).closest("[data-dimension]")) return;
    const point = clientToViewBox(event.clientX, event.clientY);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 1) gesture.current = { kind: "pan", startPoint: point, startPan: viewport.current.pan, startZoom: viewport.current.zoom };
    if (pointers.current.size >= 2) {
      const [first, second] = [...pointers.current.values()];
      gesture.current = { kind: "pinch", startPan: viewport.current.pan, startZoom: viewport.current.zoom, distance: distance(first, second), midpoint: midpoint(first, second) };
    }
  };
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    event.preventDefault();
    const point = clientToViewBox(event.clientX, event.clientY);
    if (!point) return;
    pointers.current.set(event.pointerId, point);
    if (animationFrame.current !== null) return;
    animationFrame.current = window.requestAnimationFrame(() => { animationFrame.current = null; applyGesture(); });
  };
  const stopPointer = (event: React.PointerEvent<SVGSVGElement>, final: boolean) => {
    if (!pointers.current.has(event.pointerId)) return;
    event.preventDefault();
    if (final) {
      const point = clientToViewBox(event.clientX, event.clientY);
      if (point) pointers.current.set(event.pointerId, point);
    }
    if (animationFrame.current !== null) { window.cancelAnimationFrame(animationFrame.current); animationFrame.current = null; }
    applyGesture();
    pointers.current.delete(event.pointerId);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Pointer capture may already be released by the browser. */ }
    const remaining = [...pointers.current.values()];
    const rebased = rebasePanGesture(remaining, viewport.current);
    gesture.current = rebased ? { kind: "pan", ...rebased } : null;
  };

  const title = model.kind === "straight" ? model.id.startsWith("stair.metal") ? "Egyenes fémlépcső geometriai rajza" : "Egyenes fa lépcső geometriai rajza" : model.kind === "spiral" ? "Csigalépcső geometriai rajza" : model.kind === "bevel" ? "Ferde lépcsőelem metszeti rajza" : model.kind === "landing" ? "Pihenős lépcső alaprajzi geometriai rajza" : model.kind === "winder" ? "Húzott fokos lépcső geometriai rajza" : "Betonlépcső keresztmetszeti geometriai rajza";
  return <section className="construction-stair-drawing" aria-labelledby={titleId}>
    <div className="construction-stair-drawing-heading"><div><p className="section-eyebrow">GEOMETRIAI VÁZLAT · NEM GYÁRTÁSI RAJZ</p><h3 id={titleId}>Műszaki rajz</h3></div><span>{model.kind === "straight" || model.kind === "landing" || model.kind === "winder" ? "Lépcső" : model.kind === "spiral" ? "Csigalépcső" : model.kind === "concrete" ? "Betonlépcső" : "Alkatrész"}</span></div>
    <div className="construction-stair-view-tabs" role="group" aria-label="Lépcsőrajz nézetei">{views.map((item) => <button key={item.id} type="button" aria-pressed={view === item.id} className={view === item.id ? "is-active" : ""} onClick={() => setView(item.id)}>{item.label}</button>)}</div>
    <GlassToolbar ariaLabel="Lépcsőrajz vezérlők" className="construction-stair-toolbar">
      <div className="drawing-toolbar-group" aria-label="Nagyítás"><button type="button" title="Kicsinyítés" aria-label="Lépcsőrajz kicsinyítése" onClick={() => setZoomBounded(viewport.current.zoom - .1)}><Minus aria-hidden="true" className="size-4" /></button><output className="drawing-zoom-value" aria-live="polite">{Math.round(zoom * 100)}%</output><button type="button" title="Nagyítás" aria-label="Lépcsőrajz nagyítása" onClick={() => setZoomBounded(viewport.current.zoom + .1)}><Plus aria-hidden="true" className="size-4" /></button></div>
      <div className="drawing-toolbar-group" aria-label="Rajz elrendezése"><button type="button" title="Illesztés" aria-label="Lépcsőrajz illesztése" onClick={fitViewport}><Maximize2 aria-hidden="true" className="size-4" /></button><button type="button" title="Alaphelyzet" aria-label="Lépcsőrajz visszaállítása" onClick={resetViewport}><RotateCcw aria-hidden="true" className="size-4" /></button></div>
      <span className="drawing-toolbar-hint"><Move aria-hidden="true" className="size-4" /> Húzás · két ujjal nagyítás</span>
    </GlassToolbar>
    <div className="construction-stair-canvas" ref={canvasRef}>
      <svg ref={svgRef} className="construction-stair-svg" viewBox={compactPlanView ? "220 0 560 560" : `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} role="group" aria-labelledby={`${titleId} ${descriptionId}`} preserveAspectRatio="xMidYMid meet" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={(event) => stopPointer(event, true)} onPointerCancel={(event) => stopPointer(event, false)} onLostPointerCapture={(event) => stopPointer(event, false)}>
        <title>{title}</title><desc id={descriptionId}>A rajz az ellenőrzött lépcső-geometriából készült. A rajzi méretek egységben is megjelennek az eredménylistában.</desc>
        <defs><marker id="stair-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>
        <g transform={`translate(${VIEWBOX.width / 2 + pan.x} ${VIEWBOX.height / 2 + pan.y}) scale(${zoom}) translate(${-VIEWBOX.width / 2} ${-VIEWBOX.height / 2})`}>
          {model.kind === "straight" ? view === "plan" ? <StraightPlan geometry={model.geometry} activeDimension={focusedDimension} onDimensionSelect={onDimensionSelect} /> : <StairStepPath geometry={model.geometry} activeDimension={focusedDimension} onDimensionSelect={onDimensionSelect} /> : model.kind === "spiral" ? view === "plan" ? <SpiralPlan geometry={model.geometry} activeDimension={focusedDimension} onDimensionSelect={onDimensionSelect} /> : <SpiralRise geometry={model.geometry} activeDimension={focusedDimension} onDimensionSelect={onDimensionSelect} /> : model.kind === "bevel" ? <BevelProfile geometry={model.geometry} activeDimension={focusedDimension} onDimensionSelect={onDimensionSelect} /> : model.kind === "landing" ? <LandingPlan geometry={model.geometry} activeDimension={focusedDimension} onDimensionSelect={onDimensionSelect} /> : model.kind === "winder" ? view === "plan" ? <WinderPlan geometry={model.geometry} activeDimension={focusedDimension} onDimensionSelect={onDimensionSelect} /> : <WinderElevation geometry={model.geometry} activeDimension={focusedDimension} onDimensionSelect={onDimensionSelect} /> : <ConcreteProfile geometry={model.geometry} activeDimension={focusedDimension} onDimensionSelect={onDimensionSelect} />}
        </g>
      </svg>
    </div>
    {focusedDimension && <p className="construction-stair-focus-note" role="status">A kiemelt rajzi méret a fókuszált mezőhöz kapcsolódik.</p>}
    <p className="construction-stair-caption">Geometriai szemléltetés. Nem tartalmaz szerkezeti ellenőrzést, gyártási méreteket vagy jogszabályi megfelelőség-igazolást.</p>
  </section>;
}

function stairProfileIcon(id: string) {
  const stairs = (x: number, y: number, count: number, width: number, rise: number, fill: boolean) => {
    const points = [`${x},${y + count * rise}`];
    for (let i = 0; i < count; i++) points.push(`${x + i * width},${y + (count - i) * rise}`, `${x + (i + 1) * width},${y + (count - i) * rise}`);
    return <><polyline points={points.join(" ")} /><line x1={x - 2} y1={y + count * rise + 3} x2={x + count * width + 4} y2={y - 2} className={fill ? "construction-icon-stringer" : "construction-icon-dash"} /></>;
  };
  const stairPlan = (turn: 90 | 180, winder: boolean, metal = false, three = false) => {
    const treadClass = metal ? "construction-icon-metal-tread" : "construction-icon-tread";
    if (turn === 90 && !three) return <>
      <g className={treadClass}>{Array.from({ length: 5 }, (_, i) => <rect key={`a${i}`} x={7 + i * 9} y="31" width="8" height="7" />)}{Array.from({ length: 4 }, (_, i) => <rect key={`b${i}`} x="43" y={22 - i * 7} width="7" height="6" />)}</g>
      {winder ? <><path className="construction-icon-winder" d="M43 31 L51 31 L51 23 Z M43 31 L43 23 L51 23 Z M43 31 L35 31 L43 23 Z" /><path d="M6 40 H43 V15 H53" /></> : <><rect className="construction-icon-landing" x="43" y="24" width="10" height="14" /><path d="M6 40 H43 V14" /></>}
    </>;
    if (turn === 180 && !three) return <>
      <g className={treadClass}>{Array.from({ length: 5 }, (_, i) => <rect key={`a${i}`} x="17" y={7 + i * 7} width="7" height="6" />)}{Array.from({ length: 5 }, (_, i) => <rect key={`b${i}`} x="47" y={7 + i * 7} width="7" height="6" />)}</g>
      {winder ? <><path className="construction-icon-winder" d="M24 40 L32 40 L32 32 Z M32 40 L40 40 L32 32 Z M40 40 L47 40 L40 32 Z" /><path d="M17 6 V40 H47 V6" /></> : <><rect className="construction-icon-landing" x="24" y="39" width="23" height="9" /><path d="M17 6 V39 H47 V6" /></>}
    </>;
    return <>
      <g className={treadClass}>{Array.from({ length: 4 }, (_, i) => <rect key={`a${i}`} x="6" y={33 - i * 7} width="7" height="6" />)}{Array.from({ length: 4 }, (_, i) => <rect key={`b${i}`} x={22 + i * 7} y="8" width="6" height="7" />)}{Array.from({ length: 4 }, (_, i) => <rect key={`c${i}`} x="50" y={18 + i * 7} width="7" height="6" />)}</g>
      {winder ? <><path className="construction-icon-winder" d="M14 12 L22 12 L22 20 Z M22 12 L30 12 L30 20 Z M43 16 L50 16 L43 23 Z" /><path d="M5 35 H18 V12 H50 V38" /></> : <><rect className="construction-icon-landing" x="14" y="10" width="9" height="25" /><rect className="construction-icon-landing" x="40" y="13" width="10" height="25" /><path d="M5 35 H18 V10 H45 V38" /></>}
    </>;
  };

  if (id === "stair.wood.90_landing") return stairPlan(90, false);
  if (id === "stair.wood.90_winder") return stairPlan(90, true);
  if (id === "stair.metal.90_landing") return stairPlan(90, false, true);
  if (id === "stair.metal.90_zigzag") return <>{stairPlan(90, false, true)}<path className="construction-icon-zigzag" d="M8 42 L15 38 L22 42 L29 38 L36 42 L43 38 L48 31 L52 26 L48 21 L52 16" /></>;
  if (id === "stair.wood.180_landing") return stairPlan(180, false);
  if (id === "stair.wood.180_winder") return stairPlan(180, true);
  if (id === "stair.metal.180_landing") return stairPlan(180, false, true);
  if (id === "stair.metal.180_zigzag") return <>{stairPlan(180, false, true)}<path className="construction-icon-zigzag" d="M17 6 L22 10 L17 14 L22 18 L17 22 L22 26 L17 30 L22 35 L32 35 L38 40 L32 44 L38 48" /></>;
  if (id === "stair.wood.three_landing") return stairPlan(90, false, false, true);
  if (id === "stair.wood.three_winder") return stairPlan(90, true, false, true);
  if (id === "stair.wood.spiral") return <><circle cx="32" cy="27" r="19" /><circle cx="32" cy="27" r="5" />{Array.from({ length: 8 }, (_, i) => <line key={i} x1="32" y1="27" x2={32 + 19 * Math.cos(i * Math.PI / 4)} y2={27 + 19 * Math.sin(i * Math.PI / 4)} />)}</>;
  if (id === "stair.beveled_riser") return <><path className="construction-icon-tread" d="M12 10 H36 V18 H25 L50 38 H15 Z" /><path d="M25 18 L15 38" /></>;
  if (id === "stair.concrete_straight") return <><path className="construction-icon-concrete" d="M8 41 V34 H18 V27 H28 V20 H38 V13 H48 V6 H58 V46 H8 Z" /></>;
  if (id === "stair.metal.straight") return <>{stairs(7, 7, 5, 9, 7, false)}<path className="construction-icon-zigzag" d="M7 47 L16 40 L25 33 L34 26 L43 19 L52 12" /></>;
  if (id === "stair.metal.zigzag") return <>{stairs(7, 7, 5, 9, 7, false)}<path className="construction-icon-zigzag" d="M7 45 L7 40 L16 40 L16 33 L25 33 L25 26 L34 26 L34 19 L43 19 L43 12 L52 12" /></>;
  if (id === "stair.wood.open_straight") return stairs(7, 7, 5, 9, 7, false);
  return stairs(7, 7, 5, 9, 7, true);
}

function concreteIcon(id: string) {
  if (id === "concrete.strip") return <><path className="construction-icon-concrete" d="M10 10 H54 V44 H10 Z" /><path d="M17 17 H47 V37 H17 Z" /><path className="construction-icon-tread" d="M10 10 H54 V17 H10 Z M10 37 H54 V44 H10 Z M10 17 H17 V37 H10 Z M47 17 H54 V37 H47 Z" /></>;
  if (id === "concrete.pile") return <>{[17, 32, 47].map((x) => <g key={x}><ellipse className="construction-icon-tread" cx={x} cy="13" rx="6" ry="3" /><path className="construction-icon-concrete" d={`M ${x - 6} 13 V40 Q ${x} 46 ${x + 6} 40 V13 Z`} /></g>)}</>;
  if (id === "concrete.slab") return <><path className="construction-icon-concrete" d="M9 17 L32 7 L55 17 L32 27 Z" /><path d="M9 17 V39 L32 50 V27 M55 17 V39 L32 50" /><path className="construction-icon-tread" d="M9 33 L32 43 L55 33 V40 L32 51 L9 40 Z" /></>;
  if (id === "concrete.ring") return <><ellipse className="construction-icon-concrete" cx="32" cy="20" rx="21" ry="8" /><path d="M11 20 V37 C11 42 20 47 32 47 S53 42 53 37 V20" /><ellipse cx="32" cy="20" rx="10" ry="4" /></>;
  if (id === "concrete.paving") return <><rect className="construction-icon-concrete" x="9" y="8" width="46" height="38" />{[1, 2].map((row) => <line key={`r${row}`} x1="9" y1={8 + row * 12.7} x2="55" y2={8 + row * 12.7} />)}{[1, 2, 3].map((col) => <line key={`c${col}`} x1={9 + col * 11.5} y1="8" x2={9 + col * 11.5} y2="46" />)}<line x1="14" y1="8" x2="14" y2="46" /></>;
  if (id === "concrete.blind_area") return <><rect className="construction-icon-band" x="8" y="7" width="48" height="40" rx="2" /><path className="construction-icon-concrete" d="M18 17 H46 V37 H18 Z" /><path d="M23 17 V11 H40 V17 M32 28 V37" /></>;
  if (id === "concrete.mix") return <><path className="construction-icon-concrete" d="M19 16 H46 L43 38 Q32 47 21 38 Z" /><path className="construction-icon-tread" d="M18 16 L11 10 L16 6 L27 15 M46 16 L55 10 L51 6 L40 15" /><path d="M23 40 L18 48 M41 40 L46 48 M15 49 H49" /></>;
  if (id === "concrete.rebar") return <><path className="construction-icon-rebar" d="M13 42 L44 11 M8 35 L37 6 M24 48 L54 18 M12 12 L43 43 M7 19 L36 48 M20 6 L52 38" /><path className="construction-icon-rib" d="M16 37 L19 40 M24 29 L27 32 M32 21 L35 24 M40 13 L43 16" /></>;
  if (id === "concrete.mesh") return <><rect className="construction-icon-concrete" x="8" y="8" width="48" height="40" />{[1, 2, 3, 4, 5].map((i) => <line key={`v${i}`} x1={8 + i * 8} y1="8" x2={8 + i * 8} y2="48" />)}{[1, 2, 3].map((i) => <line key={`h${i}`} x1="8" y1={8 + i * 10} x2="56" y2={8 + i * 10} />)}</>;
  if (id === "aux.diagonal") return <><path className="construction-icon-band" d="M11 43 H52 V10 Z" /><path d="M43 43 V34 H52" /><text className="construction-icon-label" x="33" y="29">d</text></>;
  return null;
}

function roofIcon(id: string) {
  if (id === "roof.shed") return <><path className="construction-icon-roof" d="M8 38 L55 12 V40 H8 Z" /><line x1="8" y1="42" x2="55" y2="42" /></>;
  if (id === "roof.mansard") return <><path className="construction-icon-roof" d="M8 40 L18 25 L27 20 L37 20 L46 25 L56 40 Z" /><line x1="18" y1="25" x2="46" y2="25" /></>;
  if (id === "roof.hip") return <><path className="construction-icon-roof" d="M8 18 L32 7 L56 18 L45 25 L20 25 Z" /><path d="M8 18 V39 L20 46 V25 M56 18 V39 L45 46 V25 M20 25 L32 18 L45 25" /></>;
  if (id === "roof.truss") return <><path d="M8 42 L32 9 L56 42 Z M8 42 H56 M20 26 H44 M20 26 L32 9 M44 26 L32 9" /><circle className="construction-icon-joint" cx="32" cy="9" r="2.5" /></>;
  if (id === "roof.rafter") return <><path d="M9 42 H55 M18 42 L41 11 M41 11 V44 M17 42 V32 H25 M24 32 V22 H32 M32 22 V11 H41" /><line className="construction-icon-zigzag" x1="14" y1="42" x2="41" y2="11" /></>;
  return <><path className="construction-icon-roof" d="M7 27 L32 8 L57 27 V44 H7 Z" /><path d="M7 27 H57 M32 8 V44" /></>;
}

export function ConstructionCalculatorThumbnail({ id, className = "" }: Readonly<{ id: string; className?: string }>) {
  const stair = STAIR_IDS.has(id);
  const roof = id.startsWith("roof.");
  return <svg className={`construction-thumbnail ${className}`.trim()} viewBox="0 0 64 54" aria-hidden="true" focusable="false">
    <g className="construction-icon-geometry" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
      {stair ? stairProfileIcon(id) : roof ? roofIcon(id) : concreteIcon(id)}
    </g>
  </svg>;
}
