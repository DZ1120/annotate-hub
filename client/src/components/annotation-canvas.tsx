import { useRef, useState, useCallback, useEffect } from "react";
import { Upload, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import type { AnnotationStore, ToolType } from "@/lib/annotation-store";
import type { Annotation, Shape } from "@shared/schema";

interface AnnotationCanvasProps {
  store: AnnotationStore;
  onUploadClick: () => void;
}

export function AnnotationCanvas({ store, onUploadClick }: AnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [tempShape, setTempShape] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const { 
    project, 
    selectedTool, 
    selectedAnnotationId, 
    setSelectedAnnotationId,
    addAnnotation,
    updateAnnotation,
    createPoint,
    createTextNote,
    createShape,
    setZoom,
    setPan,
    isSpacePressed,
    isVisible,
    isLocked,
  } = store;

  const getCanvasCoords = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - project.panX) / project.zoom;
    const y = (e.clientY - rect.top - project.panY) / project.zoom;
    return { x, y };
  }, [project.zoom, project.panX, project.panY]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(project.zoom + delta);
  }, [project.zoom, setZoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && isSpacePressed)) {
      setIsPanning(true);
      return;
    }

    const coords = getCanvasCoords(e);

    if (selectedTool === "select") {
      return;
    }

    if (selectedTool === "point" && project.backgroundImage) {
      const point = createPoint(coords.x, coords.y);
      addAnnotation(point);
      return;
    }

    if (selectedTool === "text" && project.backgroundImage) {
      const text = createTextNote(coords.x, coords.y);
      addAnnotation(text);
      return;
    }

    if (["rectangle", "circle", "line", "arrow"].includes(selectedTool) && project.backgroundImage) {
      setIsDrawing(true);
      setDrawStart(coords);
      setTempShape({ x: coords.x, y: coords.y, width: 0, height: 0 });
    }
  }, [selectedTool, project.backgroundImage, getCanvasCoords, createPoint, createTextNote, addAnnotation, isSpacePressed]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan(project.panX + e.movementX, project.panY + e.movementY);
      return;
    }

    if (draggedId) {
      const coords = getCanvasCoords(e);
      updateAnnotation(draggedId, {
        x: coords.x - dragOffset.x,
        y: coords.y - dragOffset.y,
      });
      return;
    }

    if (isDrawing && drawStart) {
      const coords = getCanvasCoords(e);
      setTempShape({
        x: Math.min(drawStart.x, coords.x),
        y: Math.min(drawStart.y, coords.y),
        width: Math.abs(coords.x - drawStart.x),
        height: Math.abs(coords.y - drawStart.y),
      });
    }
  }, [isPanning, isDrawing, drawStart, draggedId, dragOffset, getCanvasCoords, setPan, project.panX, project.panY, updateAnnotation]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (draggedId) {
      setDraggedId(null);
      return;
    }

    if (isDrawing && tempShape && tempShape.width > 5 && tempShape.height > 5) {
      const shapeType = selectedTool as Shape["shapeType"];
      const shape = createShape(shapeType, tempShape.x, tempShape.y, tempShape.width, tempShape.height);
      addAnnotation(shape);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setTempShape(null);
  }, [isPanning, isDrawing, tempShape, selectedTool, createShape, addAnnotation, draggedId]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current && selectedTool === "select") {
      setSelectedAnnotationId(null);
    }
  }, [selectedTool, setSelectedAnnotationId]);

  const handleAnnotationMouseDown = useCallback((e: React.MouseEvent, annotation: Annotation) => {
    e.stopPropagation();
    
    if (isLocked(annotation.id)) return;
    if (isSpacePressed) return;
    
    const coords = getCanvasCoords(e);
    setSelectedAnnotationId(annotation.id);
    
    if (selectedTool === "select") {
      setDraggedId(annotation.id);
      setDragOffset({
        x: coords.x - annotation.x,
        y: coords.y - annotation.y,
      });
    }
  }, [selectedTool, getCanvasCoords, setSelectedAnnotationId, isLocked, isSpacePressed]);

  const handlePointClick = useCallback((e: React.MouseEvent, annotation: Annotation) => {
    e.stopPropagation();
    
    if (annotation.type === "point" && annotation.attachedImageUrl && selectedTool === "select") {
      setImagePreview(annotation.attachedImageUrl);
    }
  }, [selectedTool]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedAnnotationId && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          if (!isLocked(selectedAnnotationId)) {
            store.deleteAnnotation(selectedAnnotationId);
          }
        }
      }
      if (e.key === "Escape") {
        setSelectedAnnotationId(null);
        setImagePreview(null);
      }
      if (e.key === "v" || e.key === "V") {
        store.setSelectedTool("select");
      }
      if (e.key === "p" || e.key === "P") {
        store.setSelectedTool("point");
      }
      if (e.key === "t" || e.key === "T") {
        store.setSelectedTool("text");
      }
      if (e.key === "r" || e.key === "R") {
        store.setSelectedTool("rectangle");
      }
      if (e.key === "c" || e.key === "C") {
        store.setSelectedTool("circle");
      }
      if (e.key === "l" || e.key === "L") {
        store.setSelectedTool("line");
      }
      if (e.key === "a" || e.key === "A") {
        store.setSelectedTool("arrow");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedAnnotationId, store, setSelectedAnnotationId, isLocked]);

  const renderAnnotation = (annotation: Annotation) => {
    if (!isVisible(annotation.id)) return null;
    
    const isSelected = annotation.id === selectedAnnotationId;
    const locked = isLocked(annotation.id);
    const style = {
      left: annotation.x * project.zoom + project.panX,
      top: annotation.y * project.zoom + project.panY,
      transform: `translate(-50%, -50%) scale(${project.zoom})`,
    };

    if (annotation.type === "point") {
      return (
        <div
          key={annotation.id}
          className={`absolute cursor-pointer transition-transform duration-100 ${isSelected ? "ring-2 ring-offset-2 ring-ring rounded-full" : ""} ${locked ? "cursor-not-allowed opacity-75" : ""}`}
          style={{
            ...style,
            width: annotation.size,
            height: annotation.size,
            backgroundColor: annotation.color,
          }}
          onMouseDown={(e) => handleAnnotationMouseDown(e, annotation)}
          onClick={(e) => handlePointClick(e, annotation)}
          data-testid={`point-${annotation.id}`}
        >
          <div 
            className="absolute inset-0 flex items-center justify-center text-white font-bold rounded-full"
            style={{ fontSize: annotation.size * 0.4 }}
          >
            {annotation.number}
          </div>
          {annotation.attachedImageUrl && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>
      );
    }

    if (annotation.type === "text") {
      return (
        <div
          key={annotation.id}
          className={`absolute bg-card border rounded-md shadow-md p-2 ${locked ? "cursor-not-allowed" : "cursor-move"} ${isSelected ? "ring-2 ring-ring" : ""}`}
          style={{
            left: annotation.x * project.zoom + project.panX,
            top: annotation.y * project.zoom + project.panY,
            width: annotation.width * project.zoom,
            minHeight: annotation.height * project.zoom,
            fontSize: annotation.fontSize * project.zoom,
            transformOrigin: "top left",
          }}
          onMouseDown={(e) => handleAnnotationMouseDown(e, annotation)}
          data-testid={`text-${annotation.id}`}
        >
          <p className="whitespace-pre-wrap break-words">
            {annotation.content || <span className="text-muted-foreground italic">Empty note</span>}
          </p>
        </div>
      );
    }

    if (annotation.type === "shape") {
      const shapeStyle = {
        left: annotation.x * project.zoom + project.panX,
        top: annotation.y * project.zoom + project.panY,
        width: annotation.width * project.zoom,
        height: annotation.height * project.zoom,
      };

      return (
        <svg
          key={annotation.id}
          className={`absolute ${locked ? "cursor-not-allowed" : "cursor-move"} ${isSelected ? "outline outline-2 outline-ring outline-offset-2" : ""}`}
          style={shapeStyle}
          onMouseDown={(e) => handleAnnotationMouseDown(e, annotation)}
          data-testid={`shape-${annotation.id}`}
        >
          {annotation.shapeType === "rectangle" && (
            <rect
              x={annotation.strokeWidth / 2}
              y={annotation.strokeWidth / 2}
              width={Math.max(0, annotation.width * project.zoom - annotation.strokeWidth)}
              height={Math.max(0, annotation.height * project.zoom - annotation.strokeWidth)}
              stroke={annotation.strokeColor}
              strokeWidth={annotation.strokeWidth}
              fill={annotation.fillColor || annotation.strokeColor}
              fillOpacity={annotation.fillOpacity}
            />
          )}
          {annotation.shapeType === "circle" && (
            <ellipse
              cx={annotation.width * project.zoom / 2}
              cy={annotation.height * project.zoom / 2}
              rx={Math.max(0, (annotation.width * project.zoom - annotation.strokeWidth) / 2)}
              ry={Math.max(0, (annotation.height * project.zoom - annotation.strokeWidth) / 2)}
              stroke={annotation.strokeColor}
              strokeWidth={annotation.strokeWidth}
              fill={annotation.fillColor || annotation.strokeColor}
              fillOpacity={annotation.fillOpacity}
            />
          )}
          {annotation.shapeType === "line" && (
            <line
              x1={0}
              y1={annotation.height * project.zoom}
              x2={annotation.width * project.zoom}
              y2={0}
              stroke={annotation.strokeColor}
              strokeWidth={annotation.strokeWidth}
            />
          )}
          {annotation.shapeType === "arrow" && (
            <g>
              <line
                x1={0}
                y1={annotation.height * project.zoom / 2}
                x2={annotation.width * project.zoom - 10}
                y2={annotation.height * project.zoom / 2}
                stroke={annotation.strokeColor}
                strokeWidth={annotation.strokeWidth}
              />
              <polygon
                points={`
                  ${annotation.width * project.zoom},${annotation.height * project.zoom / 2}
                  ${annotation.width * project.zoom - 12},${annotation.height * project.zoom / 2 - 6}
                  ${annotation.width * project.zoom - 12},${annotation.height * project.zoom / 2 + 6}
                `}
                fill={annotation.strokeColor}
              />
            </g>
          )}
        </svg>
      );
    }
  };

  const renderTempShape = () => {
    if (!isDrawing || !tempShape) return null;

    const style = {
      left: tempShape.x * project.zoom + project.panX,
      top: tempShape.y * project.zoom + project.panY,
      width: tempShape.width * project.zoom,
      height: tempShape.height * project.zoom,
    };

    return (
      <svg className="absolute pointer-events-none" style={style}>
        {selectedTool === "rectangle" && (
          <rect
            x={1}
            y={1}
            width={Math.max(0, tempShape.width * project.zoom - 2)}
            height={Math.max(0, tempShape.height * project.zoom - 2)}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeDasharray="5,5"
            fill="none"
          />
        )}
        {selectedTool === "circle" && (
          <ellipse
            cx={tempShape.width * project.zoom / 2}
            cy={tempShape.height * project.zoom / 2}
            rx={Math.max(0, tempShape.width * project.zoom / 2 - 1)}
            ry={Math.max(0, tempShape.height * project.zoom / 2 - 1)}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeDasharray="5,5"
            fill="none"
          />
        )}
        {selectedTool === "line" && (
          <line
            x1={0}
            y1={tempShape.height * project.zoom}
            x2={tempShape.width * project.zoom}
            y2={0}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        )}
        {selectedTool === "arrow" && (
          <line
            x1={0}
            y1={tempShape.height * project.zoom / 2}
            x2={tempShape.width * project.zoom}
            y2={tempShape.height * project.zoom / 2}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        )}
      </svg>
    );
  };

  const getCursor = () => {
    if (isPanning || isSpacePressed) return "grab";
    if (selectedTool === "select") return "default";
    if (selectedTool === "point") return "crosshair";
    if (selectedTool === "text") return "text";
    return "crosshair";
  };

  return (
    <>
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{
          cursor: getCursor(),
          background: "repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 20px 20px",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        data-testid="annotation-canvas"
      >
        {project.backgroundImage ? (
          <img
            src={project.backgroundImage}
            alt="Background"
            className="absolute shadow-2xl"
            style={{
              left: project.panX,
              top: project.panY,
              transform: `scale(${project.zoom})`,
              transformOrigin: "top left",
              pointerEvents: "none",
            }}
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              onClick={onUploadClick}
              className="flex flex-col items-center gap-4 p-12 rounded-lg border-2 border-dashed bg-card cursor-pointer hover-elevate transition-colors"
              data-testid="upload-placeholder"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium">Upload an image or PDF</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Engineering drawings, maps, photos, and more
                </p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground">
                <Upload className="h-4 w-4" />
                Choose File
              </button>
            </div>
          </div>
        )}

        {project.annotations.map(renderAnnotation)}
        {renderTempShape()}
        
        {isSpacePressed && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-md text-sm text-muted-foreground border">
            Drag to pan
          </div>
        )}
      </div>

      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>Attached Image Preview</DialogTitle>
          </VisuallyHidden>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Attached image preview"
              className="w-full h-full object-contain"
              data-testid="image-preview"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
