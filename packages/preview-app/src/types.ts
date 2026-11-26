export interface Asset {
  id: string;
  label: string;
  source: string;
  project?: string;
  logoType?: string;
  variants?: { size: number }[];
}

export interface SteeringSource {
  kind?: string;
  src?: string;
  url?: string;
  path?: string;
  title?: string;
  alt?: string;
  text?: string;
  palette?: { hex: string; percentage?: number }[];
}

export interface ProjectSteer {
  notes: string[];
  sources: SteeringSource[];
  favoriteColors: string[];
  customColors: string[];
}

export interface Project {
  name: string;
  slug?: string;
  primaryAssetId?: string;
  documentation?: string;
  samplePrompts?: string[];
  agentSteer?: Partial<ProjectSteer>;
  iconSlots?: Record<
    string,
    {
      title?: string;
      note?: string;
      assetId?: string;
      src?: string;
      url?: string;
    }
  >;
}

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface LayerEdit {
  paints: Record<string, string>;
  attrs: Record<string, string>;
  opacity?: number;
  offsetX?: number;
  offsetY?: number;
  rotation?: number;
  resize?: Box & {
    nativeLeft: number;
    nativeTop: number;
    nativeWidth: number;
    nativeHeight: number;
  };
}

export interface PaintLayer {
  number: number;
  element: string;
  elementNode: SVGGraphicsElement;
  id: string;
  paints: string[][];
  opacity: string;
  attributes: string[][];
  groupDepth: number;
}

export type ElementTree =
  | { type: "element"; number: number }
  | { type: "group"; element: SVGGElement; children: ElementTree[] };

export interface SvgData {
  colors: string[];
  viewBox: string;
  width: string;
  height: string;
  paintLayers: PaintLayer[];
  paintLayerCount: number;
  topmostLayer: string;
  pathCount: number;
  closedPathCount: number;
  pathSubpathCount: number;
  pathCommandCount: number;
  groupCount: number;
  maxGroupDepth: number;
  effects: string;
  byteSize: number;
  accessibleName: string;
  description: string;
  svg: SVGSVGElement;
}

export interface LayerController {
  setHoveredLayer(number: number): void;
  clearHoveredLayer(number: number): void;
  selectLayer(number: number, options?: { additive?: boolean }): void;
  getSelectedLayer(): number | null;
  getMultiSelection(): number[];
  syncDimensionInputs(number: number, values: Record<string, string | number>): void;
  syncGeometryInput?(number: number, name: string, value: string): void;
  openEditor?(number: number): void;
}
