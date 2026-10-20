type PlanPoint = Readonly<{ x: number; y: number }>;
type IsoPoint = PlanPoint & Readonly<{ level: number }>;
const iconStepRise = 2.1;

function projectPoint(point: PlanPoint, level = 0): PlanPoint {
  return {
    x: 32 + (point.x - point.y) * 0.56,
    y: 12 + (point.x + point.y) * 0.36 - level * 0.55,
  };
}

function formatPoint(value: number) {
  return Number(value.toFixed(2)).toString();
}

function isoPath3(points: readonly IsoPoint[], close = true) {
  const projected = points.map((point) => {
    const position = projectPoint(point, point.level);
    return formatPoint(position.x) + " " + formatPoint(position.y);
  });
  return "M" + projected.join(" L") + (close ? " Z" : "");
}

function isoPath(points: readonly PlanPoint[], level: number, close = true) {
  return isoPath3(points.map((point) => ({ ...point, level })), close);
}

function screenPath(points: readonly PlanPoint[], close = true) {
  const projected = points.map((point) => formatPoint(point.x) + " " + formatPoint(point.y));
  return "M" + projected.join(" L") + (close ? " Z" : "");
}

function isoRiserPath(start: PlanPoint, end: PlanPoint, lower: number, upper: number) {
  return isoPath3([
    { ...start, level: lower },
    { ...end, level: lower },
    { ...end, level: upper },
    { ...start, level: upper },
  ]);
}

type FlightProps = Readonly<{
  x: number;
  y: number;
  length: number;
  width: number;
  steps?: number;
  axis: "x" | "y";
  direction?: "positive" | "negative";
  index: number;
  baseLevel?: number;
  metal?: boolean;
}>;

function IsoFlight({ x, y, length, width, steps = 4, axis, direction = "positive", index, baseLevel = 0, metal = false }: FlightProps) {
  const pitch = length / steps;
  return <g className="construction-icon-flight" data-flight={index} data-projection="axonometric" data-axis={axis} data-direction={direction} data-treads={steps}>
    {Array.from({ length: steps }, (_, stepIndex) => {
      const before = baseLevel + stepIndex * iconStepRise;
      const after = before + iconStepRise;
      let xStart = x;
      let yStart = y;
      const treadLength = pitch;
      let leadStart: PlanPoint;
      let leadEnd: PlanPoint;

      if (axis === "x") {
        xStart = direction === "positive" ? x + stepIndex * pitch : x + length - (stepIndex + 1) * pitch;
        leadStart = { x: direction === "positive" ? xStart : xStart + pitch, y };
        leadEnd = { x: leadStart.x, y: y + width };
      } else {
        yStart = direction === "positive" ? y + stepIndex * pitch : y + length - (stepIndex + 1) * pitch;
        leadStart = { x, y: direction === "positive" ? yStart : yStart + pitch };
        leadEnd = { x: x + width, y: leadStart.y };
      }

      const top = axis === "x"
        ? [{ x: xStart, y }, { x: xStart + treadLength, y }, { x: xStart + treadLength, y: y + width }, { x: xStart, y: y + width }]
        : [{ x, y: yStart }, { x: x + width, y: yStart }, { x: x + width, y: yStart + treadLength }, { x, y: yStart + treadLength }];

      return <g className="construction-icon-step" data-step={stepIndex + 1} key={stepIndex}>
        <path className="construction-icon-step-riser" d={isoRiserPath(leadStart, leadEnd, before, after)} />
        <path className={"construction-icon-step-top" + (metal ? " construction-icon-metal-step" : "")} data-step-top={stepIndex + 1} d={isoPath(top, after)} />
      </g>;
    })}
  </g>;
}

function IsoLanding({ x, y, width, height, level, index }: Readonly<{ x: number; y: number; width: number; height: number; level: number; index: number }>) {
  return <g className="construction-icon-landing" data-landing={index}>
    <path className="construction-icon-landing-surface" d={isoPath([{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }], level)} />
  </g>;
}

function QuarterWinders({ x, y, size = 11, turn = "north-east", baseLevel = 0 }: Readonly<{ x: number; y: number; size?: number; turn?: "north-east" | "south-east"; baseLevel?: number }>) {
  const origin = turn === "north-east" ? { x, y } : { x, y: y + size };
  const sectors: PlanPoint[][] = turn === "north-east"
    ? [
      [origin, { x: x + size, y }, { x: x + size, y: y + size / 3 }],
      [origin, { x: x + size, y: y + size / 3 }, { x: x + size, y: y + 2 * size / 3 }],
      [origin, { x: x + size, y: y + 2 * size / 3 }, { x: x + size, y: y + size }, { x, y: y + size }],
    ]
    : [
      [origin, { x, y }, { x: x + size / 3, y }],
      [origin, { x: x + size / 3, y }, { x: x + 2 * size / 3, y }],
      [origin, { x: x + 2 * size / 3, y }, { x: x + size, y }, { x: x + size, y: y + size }],
    ];

  return <g className="construction-icon-winders" data-winder="quarter-turn" data-winder-treads="3" data-turn={turn}>
    {sectors.map((sector, index) => {
      const lower = baseLevel + index * iconStepRise;
      const upper = lower + iconStepRise;
      return <g className="construction-icon-winder-step" data-step={index + 1} key={index}>
        <path className="construction-icon-step-riser" d={isoRiserPath(sector[1], sector[2], lower, upper)} />
        <path className="construction-icon-step-top" data-step-top={index + 1} d={isoPath(sector, upper)} />
      </g>;
    })}
  </g>;
}

function HalfTurnWinders({ x, y, width, height, baseLevel = 0 }: Readonly<{ x: number; y: number; width: number; height: number; baseLevel?: number }>) {
  const center = { x: x + width / 2, y: y + height / 2 };
  const points: PlanPoint[] = [
    { x, y }, { x: x + width / 3, y }, { x: x + 2 * width / 3, y }, { x: x + width, y },
    { x: x + 2 * width / 3, y: y + height }, { x: x + width / 3, y: y + height }, { x, y: y + height },
  ];
  return <g className="construction-icon-winders" data-winder="half-turn" data-winder-treads={points.length - 1}>
    {points.slice(0, -1).map((point, index) => {
      const next = points[index + 1];
      const lower = baseLevel + index * iconStepRise;
      const upper = lower + iconStepRise;
      return <g className="construction-icon-winder-step" data-step={index + 1} key={index}>
        <path className="construction-icon-step-riser" d={isoRiserPath(point, next, lower, upper)} />
        <path className="construction-icon-step-top" data-step-top={index + 1} d={isoPath([center, point, next], upper)} />
      </g>;
    })}
  </g>;
}

function Landing90({ winder = false, metal = false }: Readonly<{ winder?: boolean; metal?: boolean }>) {
  const firstFlightLevel = 4 * iconStepRise;
  const secondBase = firstFlightLevel + (winder ? 3 * iconStepRise : 0);
  return <>
    <IsoFlight x={8} y={37} length={27} width={10} axis="x" index={1} metal={metal} />
    {winder
      ? <QuarterWinders x={35} y={37} turn="north-east" baseLevel={firstFlightLevel} />
      : <IsoLanding x={35} y={37} width={11} height={10} level={firstFlightLevel} index={1} />}
    <IsoFlight x={35} y={10} length={27} width={10} axis="y" direction="negative" index={2} baseLevel={secondBase} metal={metal} />
  </>;
}

function Landing180({ winder = false, metal = false }: Readonly<{ winder?: boolean; metal?: boolean }>) {
  const firstFlightLevel = 4 * iconStepRise;
  const secondBase = firstFlightLevel + (winder ? 6 * iconStepRise : 0);
  return <>
    <IsoFlight x={9} y={8} length={27} width={10} axis="y" index={1} metal={metal} />
    {winder
      ? <HalfTurnWinders x={9} y={35} width={44} height={12} baseLevel={firstFlightLevel} />
      : <IsoLanding x={9} y={35} width={44} height={12} level={firstFlightLevel} index={1} />}
    <IsoFlight x={43} y={8} length={27} width={10} axis="y" direction="negative" index={2} baseLevel={secondBase} metal={metal} />
  </>;
}

function ThreeFlight({ winder = false }: Readonly<{ winder?: boolean }>) {
  const firstLevel = 4 * iconStepRise;
  const middleBase = firstLevel + (winder ? 3 * iconStepRise : 0);
  const middleLevel = middleBase + 3 * iconStepRise;
  const lastBase = middleLevel + (winder ? 3 * iconStepRise : 0);
  return <>
    <IsoFlight x={7} y={9} length={27} width={10} axis="x" index={1} />
    {winder
      ? <QuarterWinders x={34} y={9} turn="south-east" baseLevel={firstLevel} />
      : <IsoLanding x={34} y={9} width={11} height={11} level={firstLevel} index={1} />}
    <IsoFlight x={34} y={20} length={18} width={11} axis="y" index={2} baseLevel={middleBase} steps={3} />
    {winder
      ? <QuarterWinders x={34} y={38} turn="north-east" baseLevel={middleLevel} />
      : <IsoLanding x={34} y={38} width={11} height={11} level={middleLevel} index={2} />}
    <IsoFlight x={7} y={39} length={27} width={10} axis="x" direction="negative" index={3} baseLevel={lastBase} />
  </>;
}

function StraightStair({ closed = false, metal = false, zigzag = false, concrete = false }: Readonly<{ closed?: boolean; metal?: boolean; zigzag?: boolean; concrete?: boolean }>) {
  const steps = Array.from({ length: 5 }, (_, index) => {
    const x = 8 + index * 8.2;
    const y = 41 - index * 5.8;
    const top = [{ x, y }, { x: x + 6, y }, { x: x + 8, y: y - 1.6 }, { x: x + 2, y: y - 1.6 }];
    const riser = [{ x, y: y + 5.8 }, { x: x + 2, y: y + 4.2 }, { x: x + 2, y: y - 1.6 }, { x, y }];
    return { top, riser, index };
  });
  return <g data-projection="axonometric-elevation" data-treads={steps.length}>
    {closed && <path className="construction-icon-stair-body" d="M7 47 V41 H15 V35 H23 V29 H31 V23 H39 V17 H47 V11 H55 V49 H7 Z" />}
    {!closed && !zigzag && <path className="construction-icon-stair-stringer" d="M8 45 L50 12 L53 15 L11 48 Z" />}
    {zigzag && <path className="construction-icon-zigzag-stringer" d="M8 46 L8 41 H15 V35 H23 V29 H31 V23 H39 V17 H47 V11 H53 V16 H50 V22 H42 V28 H34 V34 H26 V40 H18 V45 Z" />}
    {steps.map((step) => <g className="construction-icon-step" data-step={step.index + 1} key={step.index}>
      <path className="construction-icon-step-riser" d={screenPath(step.riser)} />
      <path className="construction-icon-step-top" data-step-top={step.index + 1} d={screenPath(step.top)} />
    </g>)}
    {concrete && <path className="construction-icon-stair-edge" d="M7 47 H55" />}
    {metal && !zigzag && <path className="construction-icon-metal-cue" d="M10 47 L51 14" />}
  </g>;
}

function roofIcon(id: string) {
  if (id === "roof.material-takeoff") return <g data-roof-planes="2">
    <path data-roof-plane="1" className="construction-icon-roof-plane construction-icon-roof-plane-a" d="M17 12 L43 20 L33 39 L7 31 Z" />
    <path data-roof-plane="2" className="construction-icon-roof-plane construction-icon-roof-plane-b" d="M17 12 L43 20 L51 40 L25 32 Z" />
    <path className="construction-icon-roof-edge" d="M7 31 L17 12 L43 20 L51 40 L25 32 Z M7 31 L33 39 M25 32 L51 40" />
    <path className="construction-icon-roof-ridge" d="M17 12 L43 20" />
  </g>;
  if (id === "roof.timber-cutlist") return <g data-roof-planes="4">
    <path data-roof-plane="main-near" className="construction-icon-roof-plane construction-icon-roof-plane-a" d="M7 34 L34 24 L41 9 L14 19 Z" />
    <path data-roof-plane="main-far" className="construction-icon-roof-plane construction-icon-roof-plane-b" d="M20 43 L47 33 L41 9 L14 19 Z" />
    <path data-roof-plane="hip-near" className="construction-icon-roof-plane construction-icon-roof-plane-c" d="M7 34 L20 43 L14 19 Z" />
    <path data-roof-plane="hip-far" className="construction-icon-roof-plane construction-icon-roof-plane-d" d="M34 24 L47 33 L41 9 Z" />
    <path className="construction-icon-roof-edge" d="M7 34 L34 24 L47 33 L20 43 Z M7 34 L14 19 L41 9 L47 33 M20 43 L14 19 M34 24 L41 9" />
    <path className="construction-icon-roof-ridge" d="M14 19 L41 9" />
  </g>;
  if (id === "roof.rafter-cut") return <>
    <path className="construction-icon-wood-beam" d="M10 43 L39 8 L46 13 L17 49 Z" />
    <path className="construction-icon-rafter-cut" d="M39 8 L46 13 M10 43 L17 49" />
    <path className="construction-icon-roof-edge" d="M7 49 H53" />
    <path className="construction-icon-angle" d="M17 49 A12 12 0 0 0 14.7 41.5 M17 49 V37" />
  </>;
  if (id === "roof.truss-members") return <>
    <path className="construction-icon-truss-depth" d="M9 44 L32 8 L36 8 L59 44 L55 46 L34 13 L13 46 Z M10 42 L12 40 M32 10 L34 8 M57 44 L59 42 M10 42 H58 L60 40 H12 Z" />
    <path className="construction-icon-truss-timber" d="M7 46 L30 10 L34 10 L57 46 L53 48 L32 15 L11 48 Z" />
    <path className="construction-icon-truss-timber" d="M8 44 H56 V48 H8 Z" />
    <path className="construction-icon-truss-web" d="M32 13 V44 M19 28 L32 44 M45 28 L32 44" />
    <circle className="construction-icon-joint" cx="32" cy="44" r="1.6" />
  </>;
  return null;
}

function stairIcon(id: string) {
  if (id === "stair.wood.closed_straight") return <StraightStair closed />;
  if (id === "stair.wood.open_straight") return <StraightStair />;
  if (id === "stair.wood.90_landing") return <Landing90 />;
  if (id === "stair.wood.90_winder") return <Landing90 winder />;
  if (id === "stair.wood.180_landing") return <Landing180 />;
  if (id === "stair.wood.180_winder") return <Landing180 winder />;
  if (id === "stair.wood.three_landing") return <ThreeFlight />;
  if (id === "stair.wood.three_winder") return <ThreeFlight winder />;
  if (id === "stair.wood.spiral") return <g data-spiral-treads="8" data-projection="axonometric-spiral">
    {Array.from({ length: 8 }, (_, index) => {
      const start = -90 + index * 45;
      const end = start + 45;
      const polar = (radius: number, angle: number): PlanPoint => ({
        x: 32 + radius * Math.cos(angle * Math.PI / 180),
        y: 26 + radius * Math.sin(angle * Math.PI / 180) * 0.72,
      });
      const outer = Array.from({ length: 5 }, (_, pointIndex) => polar(19, start + (end - start) * pointIndex / 4));
      const inner = Array.from({ length: 5 }, (_, pointIndex) => polar(5, end - (end - start) * pointIndex / 4));
      const level = (index + 1) * iconStepRise;
      const before = index * iconStepRise;
      const outerStart = polar(19, start);
      const innerStart = polar(5, start);
      return <g className="construction-icon-spiral-step" data-step={index + 1} key={index}>
        <path className="construction-icon-step-riser" d={isoRiserPath(outerStart, innerStart, before, level)} />
        <path className="construction-icon-spiral-tread" data-spiral-tread={index + 1} d={isoPath([...outer, ...inner], level)} />
      </g>;
    })}
    <path className="construction-icon-spiral-post" d={isoPath3([
      { x: 30.5, y: 25, level: 0 }, { x: 33.5, y: 25, level: 0 },
      { x: 33.5, y: 25, level: 8 * iconStepRise }, { x: 30.5, y: 25, level: 8 * iconStepRise },
    ])} />
    <path className="construction-icon-spiral-post-side" d={isoPath3([
      { x: 33.5, y: 25, level: 0 }, { x: 33.5, y: 27, level: 0 },
      { x: 33.5, y: 27, level: 8 * iconStepRise }, { x: 33.5, y: 25, level: 8 * iconStepRise },
    ])} />
  </g>;
  if (id === "stair.metal.straight") return <StraightStair metal />;
  if (id === "stair.metal.zigzag") return <StraightStair metal zigzag />;
  if (id === "stair.metal.90_landing") return <Landing90 metal />;
  if (id === "stair.metal.90_zigzag") return <Landing90 metal />;
  if (id === "stair.metal.180_landing") return <Landing180 metal />;
  if (id === "stair.metal.180_zigzag") return <Landing180 metal />;
  if (id === "stair.beveled_riser") return <g data-projection="axonometric-elevation">
    <path className="construction-icon-side" d="M14 12 H42 L60 36 L55 44 H17 Z" />
    <path className="construction-icon-surface" d="M9 16 H37 L42 12 H14 Z" />
    <path className="construction-icon-line" d="M9 16 H37 L55 40 L50 47 H12 Z M37 16 L42 12 M50 47 L55 40" />
    <path className="construction-icon-accent-line" d="M37 16 L31 23 L50 47" />
  </g>;
  if (id === "stair.concrete_straight") return <StraightStair closed concrete />;
  return null;
}

function concreteIcon(id: string) {
  if (id === "concrete.strip") return <><path className="construction-icon-surface" d="M8 25 L29 14 L56 27 L35 39 Z" /><path className="construction-icon-side" d="M8 25 V36 L35 51 V39 L56 27 V38 L35 51" /><path className="construction-icon-line" d="M8 25 L29 14 L56 27 L35 39 Z M8 25 V36 L35 51 L56 38 V27" /><path className="construction-icon-accent-line" d="M16 25 L30 18 L48 27 L34 35" /></>;
  if (id === "concrete.pile") return <>{[16, 32, 48].map((x) => <g key={x}><path className="construction-icon-side" d={`M${x - 5} 18 V43 Q${x} 48 ${x + 5} 43 V18 Z`} /><ellipse className="construction-icon-surface" cx={x} cy="18" rx="5" ry="3" /></g>)}<path className="construction-icon-line" d="M11 18 V43 Q16 48 21 43 V18 M27 18 V43 Q32 48 37 43 V18 M43 18 V43 Q48 48 53 43 V18" /><path className="construction-icon-accent-line" d="M11 18 Q16 12 21 18 M27 18 Q32 12 37 18 M43 18 Q48 12 53 18" /></>;
  if (id === "concrete.slab") return <><path className="construction-icon-surface" d="M8 22 L32 9 L56 22 L32 36 Z" /><path className="construction-icon-side" d="M8 22 V34 L32 48 V36 L56 22 V34 L32 48" /><path className="construction-icon-line" d="M8 22 L32 9 L56 22 L32 36 Z M8 22 V34 L32 48 L56 34 V22" /><path className="construction-icon-accent-line" d="M8 30 L32 44 L56 30" /></>;
  if (id === "concrete.ring") return <><path className="construction-icon-side" d="M11 20 V39 C11 47 20 51 32 51 S53 47 53 39 V20" /><ellipse className="construction-icon-surface" cx="32" cy="20" rx="21" ry="10" /><ellipse className="construction-icon-cutout" cx="32" cy="20" rx="10" ry="5" /><path className="construction-icon-line" d="M11 20 V39 C11 47 20 51 32 51 S53 47 53 39 V20 M22 20 V38 C22 42 26 44 32 44 S42 42 42 38 V20" /><path className="construction-icon-accent-line" d="M11 20 A21 10 0 0 0 53 20" /></>;
  if (id === "concrete.paving") return <><path className="construction-icon-surface" d="M8 28 L31 15 L56 29 L33 43 Z" /><path className="construction-icon-line" d="M8 28 L31 15 L56 29 L33 43 Z" /><path className="construction-icon-detail" d="M14 25 L38 39 M21 21 L45 35 M28 17 L52 31 M20 35 L44 21 M29 40 L53 26" /><path className="construction-icon-accent-line" d="M8 28 V35 L33 50 L56 36 V29" /></>;
  if (id === "concrete.blind_area") return <><path className="construction-icon-surface" fillRule="evenodd" d="M7 29 L32 15 L57 29 L32 44 Z M18 29 L32 21 L46 29 L32 37 Z" /><path className="construction-icon-line" d="M7 29 L32 15 L57 29 L32 44 Z M18 29 L32 21 L46 29 L32 37 Z" /><path className="construction-icon-muted-line" d="M21 27 L32 21 L43 27 V42 L32 49 L21 42 Z" /><path className="construction-icon-accent-line" d="M7 29 L32 44 L57 29" /></>;
  if (id === "concrete.mix") return <><path className="construction-icon-muted-line" d="M14 15 H20 L23 38 M44 38 L48 15 H54 M20 45 H47 M25 39 L21 50 M42 39 L46 50" /><path className="construction-icon-surface" d="M20 16 H48 L44 36 Q34 46 24 36 Z" /><path className="construction-icon-line" d="M20 16 H48 L44 36 Q34 46 24 36 Z" /><path className="construction-icon-accent-line" d="M23 28 Q34 23 45 28" /></>;
  if (id === "concrete.rebar") return <>
    <path className="construction-icon-rebar" d="M5 35 L34 4 M18 49 L52 12 M8 44 L42 7" />
    <path className="construction-icon-rebar-highlight" d="M5 35 L34 4 M8 44 L42 7" />
    <path className="construction-icon-detail" d="M12 29 L16 32 M19 21 L23 24 M26 13 L30 16 M24 43 L28 46 M31 35 L35 38 M38 27 L42 30 M14 38 L18 41 M21 30 L25 33 M28 22 L32 25" />
  </>;
  if (id === "concrete.mesh") return <><path className="construction-icon-surface" d="M7 24 L31 10 L57 24 L33 39 Z" /><path className="construction-icon-line" d="M7 24 L31 10 L57 24 L33 39 Z" /><path className="construction-icon-detail" d="M13 21 L39 36 M20 17 L46 32 M27 13 L53 28 M15 29 L39 15 M23 34 L47 20 M31 39 L55 25" /><path className="construction-icon-accent-line" d="M7 24 V30 L33 45 L57 30 V24" /></>;
  if (id === "aux.diagonal") return <>
    <path className="construction-icon-diagonal-side" d="M10 46 H55 L59 43 H14 Z M55 46 V9 L59 6 V43 Z M10 46 L55 9 L59 6 L14 43 Z" />
    <path className="construction-icon-diagonal-face" d="M10 46 H55 V9 Z" />
    <path className="construction-icon-triangle-edge" d="M10 46 H55 V9 Z M55 46 L59 43 V6 M10 46 L14 43 L59 6" />
    <path className="construction-icon-angle-square" d="M47 46 V38 H55" />
    <path className="construction-icon-accent-line" d="M10 46 L55 9" />
  </>;
  return null;
}

export function ConstructionCalculatorThumbnail({ id, className = "" }: Readonly<{ id: string; className?: string }>) {
  const category = id.startsWith("roof.") ? "roof" : id.startsWith("stair.") ? "stair" : "concrete";
  const art = category === "roof" ? roofIcon(id) : category === "stair" ? stairIcon(id) : concreteIcon(id);
  return <svg className={`construction-thumbnail ${className}`.trim()} data-calculator-icon={id} data-calculator-category={category} viewBox="4 3 56 51" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <g className={`construction-icon-art construction-icon-art-${category}`} data-visual-language="2.5d-gray-yellow">{art}</g>
  </svg>;
}
