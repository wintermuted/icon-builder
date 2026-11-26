import type {
  Asset,
  Box,
  LayerController,
  LayerEdit,
  PaintLayer,
  ProjectSteer,
  SvgData,
} from "./types.js";
import type { EditorPresentation } from "./editor/presentation.js";

type Point = { x: number; y: number };
type Gesture = { pointerId: number; startX: number; startY: number };
type ResizeEntry = {
  layerNumber: number;
  nativeBBox: DOMRect;
  offsetX: number;
  offsetY: number;
  base: Box;
  adjusted: Box;
};
type Edges = Box & { centerX: number; centerY: number };
type Snap = { delta: number; screenPos: number } | null;

export interface CanvasBindings {
  asset: Asset;
  root: HTMLElement;
  previewContainer: HTMLElement;
  handles: HTMLElement | null;
  points: HTMLElement | null;
  guides: HTMLElement | null;
  tooltip: HTMLElement | null;
  gridOverlay: HTMLElement | null;
  shapeModeBanner: HTMLElement | null;
  layersController: LayerController;
  getGraphics(): SVGGraphicsElement[];
  getUnitsPerPixel(): Point;
  getAlignmentTargets(excludeIndices: number[]): Edges[];
  getElementEdges(element: SVGGraphicsElement): Edges;
  findAxisSnap(active: Edges, keys: string[], targets: Edges[]): Snap;
  showGuide(axis: string, position: number): void;
  clearGuides(): void;
  syncLayerDimensions(layer: number): void;
  updateHandles(layer: number | null): void;
  updateTooltip(layer: number | null): void;
  updatePointHandles(): void;
  updateGridOverlay(): void;
  updateShapeModeBanner(): void;
  exitShapeEditMode(): void;
  snapToGrid(value: number): number;
  onLayerEdited?(): void;
  shapeEditLayerNumber: number | null;
  gridVisible: boolean;
  gridEnabled: boolean;
  gridSize: number;
  pointDragState: {
    handleEl: HTMLElement;
    pointerId: number;
    index: number;
    inverse: DOMMatrix;
    points: Point[];
  } | null;
  rotateState: {
    layerNumber: number;
    pointerId: number;
    centerX: number;
    centerY: number;
    startAngleDeg: number;
    startPointerAngleDeg: number;
  } | null;
  resizeState:
    | (Gesture & {
        layerNumber: number;
        handle: string;
        nativeBBox: DOMRect;
        currentBox: Box;
        unitsPerPixel: Point;
      })
    | null;
  groupResizeState:
    | (Gesture & {
        handle: string;
        unitsPerPixel: Point;
        initialBox: Box;
        entries: ResizeEntry[];
      })
    | null;
  dragState:
    | (Gesture & {
        layerNumbers: number[];
        primaryLayerNumber: number;
        bases: Map<number, { offsetX: number; offsetY: number }>;
        scaleX: number;
        scaleY: number;
        moved: boolean;
      })
    | null;
}

export interface LayerBindings {
  presentation: EditorPresentation;
  asset: Asset;
  data: SvgData;
  layer: PaintLayer;
  layerEdits: Map<number, LayerEdit>;
  layerItems: Map<number, HTMLLIElement>;
  layerButtons: Map<number, HTMLElement>;
  layerEditButtons: Map<number, HTMLButtonElement>;
  layerCheckboxes: Map<number, HTMLInputElement>;
  geometryInputs: Map<string, HTMLInputElement | HTMLTextAreaElement>;
  layerByNumber: Map<number, PaintLayer>;
  selection: Set<number>;
  root: HTMLElement;
  editorPanel: HTMLElement;
  actionsBar: HTMLElement;
  hoveredLayerNumber: number | null;
  focusedLayerNumber: number | null;
  onHighlight?(layer: number | null, highlighted: boolean): void;
  onEdit?(layer?: number, edit?: LayerEdit): void;
  onRefresh(): void;
  syncHighlight(): void;
  syncSelection(): void;
  selectLayer(layer: number, options?: { additive?: boolean }): void;
  addElement(shape: string, container: SVGElement): void;
  renderElementRow(layer: PaintLayer, container: HTMLElement): HTMLLIElement;
}

export interface ProjectSourceBindings {
  steer: ProjectSteer;
  targetProject: string;
  sourcesGrid: HTMLElement;
  applyFavoriteResult(
    result: Pick<ProjectSteer, "favoriteColors" | "customColors">,
    color: string,
  ): void;
}
