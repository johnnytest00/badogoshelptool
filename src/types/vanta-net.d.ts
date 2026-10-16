declare module "vanta/dist/vanta.net.min.js" {
  type VantaNetEffect = {
    destroy: () => void;
    setOptions: (options: Record<string, unknown>) => void;
    renderer?: { setPixelRatio: (ratio: number) => void; domElement?: HTMLCanvasElement };
  };

  const NET: (options: Record<string, unknown>) => VantaNetEffect;
  export default NET;
}
