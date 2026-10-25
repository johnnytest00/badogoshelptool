import type { ReactNode } from "react";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";

/**
 * M9.6 order of the rafter-cut result: short state, the dimensioned rafter drawing (overview, marks, joint picker, detail,
 * cut guide), the main lengths, the joint state and limits, then the remaining numbers in a closed disclosure.
 */
export function RafterCutFlow({ status, drawing, main, limits, details }: Readonly<{ status: ReactNode; drawing: ReactNode; main?: ReactNode; limits?: ReactNode; details?: ReactNode }>) {
  return <>
    {status}
    {drawing}
    {main}
    {limits}
    {details && <GlassDisclosure className="construction-suite-result-details" summary="Részletes eredmények és kiindulási adatok">{details}</GlassDisclosure>}
  </>;
}

/**
 * M9.6 order of the roof calculators' drawings, after the material or cut-list result: the common rafter cross-section with
 * its joint detail, the geometric rafter lines per plane, then the 3D close-up and the general roof drawing, closed.
 */
export function RoofDrawingStack({ joints, layout, moreViews }: Readonly<{ joints?: ReactNode; layout?: ReactNode; moreViews?: ReactNode }>) {
  return <>
    {joints}
    {layout}
    {moreViews && <GlassDisclosure className="construction-suite-more-views" summary="További nézetek · térbeli szarufarészlet és tetőforma">{moreViews}</GlassDisclosure>}
  </>;
}
