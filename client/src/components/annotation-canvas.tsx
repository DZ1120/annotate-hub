import { useRef, useState, useCallback, useEffect } from "react";
import { Upload, ImageIcon, MapPin } from "lucide-react";
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
  const [resizing, setResizing] = useState<{ id: string; handle: string } | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; annotation: Annotation } | null>(null);
  
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
      setIsDrawing(true);
      setDrawStart(coords);
      setTempShape({ x: coords.x, y: coords.y, width: 0, height: 0 });
      return;
    }

    if (["rectangle", "circle", "line", "arrow"].includes(selectedTool) && project.backgroundImage) {
      setIsDrawing(true);
      setDrawStart(coords);
      setTempShape({ x: coords.x, y: coords.y, width: 0, height: 0 });
    }
  }, [selectedTool, project.backgroundImage, getCanvasCoords, createPoint, addAnnotation, isSpacePressed]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan(project.panX + e.movementX, project.panY + e.movementY);
      return;
    }

    if (resizing && resizeStart) {
      const coords = getCanvasCoords(e);
      const annotation = resizeStart.annotation;
      
      if (annotation.type === "shape" || annotation.type === "text") {
        const dx = coords.x - resizeStart.x;
        const dy = coords.y - resizeStart.y;
        
        let newWidth = annotation.width;
        let newHeight = annotation.height;
        let newX = annotation.x;
        let newY = annotation.y;
        
        if (resizing.handle.includes("e")) {
          newWidth = Math.max(20, annotation.width + dx);
        }
        if (resizing.handle.includes("w")) {
          newWidth = Math.max(20, annotation.width - dx);
          newX = annotation.x + dx;
        }
        if (resizing.handle.includes("s")) {
          newHeight = Math.max(20, annotation.height + dy);
        }
        if (resizing.handle.includes("n")) {
          newHeight = Math.max(20, annotation.height - dy);
          newY = annotation.y + dy;
        }
        
        updateAnnotation(resizing.id, { x: newX, y: newY, width: newWidth, height: newHeight });
        setResizeStart({ ...resizeStart, x: coords.x, y: coords.y, annotation: { ...annotation, x: newX, y: newY, width: newWidth, height: newHeight } as Annotation });
      }
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
  }, [isPanning, isDrawing, drawStart, draggedId, dragOffset, getCanvasCoords, setPan, project.panX, project.panY, updateAnnotation, resizing, resizeStart]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (resizing) {
      setResizing(null);
      setResizeStart(null);
      return;
    }

    if (draggedId) {
      setDraggedId(null);
      return;
    }

    if (isDrawing && tempShape) {
      if (selectedTool === "text") {
        const width = tempShape.width > 30 ? tempShape.width : 200;
        const height = tempShape.height > 20 ? tempShape.height : 100;
        const text = createTextNote(tempShape.x, tempShape.y, width, height);
        addAnnotation(text);
      } else if (tempShape.width > 5 && tempShape.height > 5) {
        const shapeType = selectedTool as Shape["shapeType"];
        const shape = createShape(shapeType, tempShape.x, tempShape.y, tempShape.width, tempShape.height);
        addAnnotation(shape);
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setTempShape(null);
  }, [isPanning, isDrawing, tempShape, selectedTool, createTextNote, createShape, addAnnotation, draggedId, resizing]);

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

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, annotation: Annotation, handle: string) => {
    e.stopPropagation();
    if (isLocked(annotation.id)) return;
    
    const coords = getCanvasCoords(e);
    setResizing({ id: annotation.id, handle });
    setResizeStart({ x: coords.x, y: coords.y, annotation });
  }, [getCanvasCoords, isLocked]);

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
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
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

  const renderResizeHandles = (annotation: Annotation) => {
    if (annotation.id !== selectedAnnotationId) return null;
    if (annotation.type === "point") return null;
    if (isLocked(annotation.id)) return null;

    const handleSize = 8;
    const handles = ["nw", "ne", "sw", "se", "n", "s", "e", "w"];
    
    let width: number;
    let height: number;
    
    if (annotation.type === "text") {
      width = annotation.width;
      height = annotation.height;
    } else {
      width = annotation.width;
      height = annotation.height;
    }

    return handles.map(handle => {
      let x = 0;
      let y = 0;
      let cursor = "";
      
      if (handle.includes("w")) x = -handleSize / 2;
      if (handle.includes("e")) x = width * project.zoom - handleSize / 2;
      if (handle === "n" || handle === "s") x = (width * project.zoom) / 2 - handleSize / 2;
      
      if (handle.includes("n")) y = -handleSize / 2;
      if (handle.includes("s")) y = height * project.zoom - handleSize / 2;
      if (handle === "e" || handle === "w") y = (height * project.zoom) / 2 - handleSize / 2;

      if (handle === "nw" || handle === "se") cursor = "nwse-resize";
      if (handle === "ne" || handle === "sw") cursor = "nesw-resize";
      if (handle === "n" || handle === "s") cursor = "ns-resize";
      if (handle === "e" || handle === "w") cursor = "ew-resize";

      return (
        <div
          key={handle}
          className="absolute bg-primary border-2 border-primary-foreground rounded-sm"
          style={{
            width: handleSize,
            height: handleSize,
            left: x,
            top: y,
            cursor,
          }}
          onMouseDown={(e) => handleResizeMouseDown(e, annotation, handle)}
        />
      );
    });
  };

  const renderAnnotation = (annotation: Annotation) => {
    if (!isVisible(annotation.id)) return null;
    
    const isSelected = annotation.id === selectedAnnotationId;
    const locked = isLocked(annotation.id);

    if (annotation.type === "point") {
      const style = {
        left: annotation.x * project.zoom + project.panX,
        top: annotation.y * project.zoom + project.panY,
        transform: `translate(-50%, -50%)`,
      };

      return (
        <div
          key={annotation.id}
          className={`absolute cursor-pointer ${isSelected ? "z-10" : ""} ${locked ? "cursor-not-allowed opacity-75" : ""}`}
          style={style}
          onMouseDown={(e) => handleAnnotationMouseDown(e, annotation)}
          onClick={(e) => handlePointClick(e, annotation)}
          data-testid={`point-${annotation.id}`}
        >
          <div 
            className="relative flex items-center justify-center rounded-full shadow-md"
            style={{ 
              width: annotation.size * project.zoom, 
              height: annotation.size * project.zoom,
              backgroundColor: annotation.color,
            }}
          >
            <span 
              className="text-white font-bold"
              style={{ fontSize: annotation.size * project.zoom * 0.4 }}
            >
              {annotation.number}
            </span>
            {annotation.attachedImageUrl && (
              <div 
                className="absolute -top-1 -right-1 bg-green-500 rounded-full border-2 border-white"
                style={{ width: 12 * project.zoom, height: 12 * project.zoom }}
              />
            )}
          </div>
          {isSelected && (
            <div 
              className="absolute rounded-full border-2 border-primary pointer-events-none"
              style={{
                width: annotation.size * project.zoom + 8,
                height: annotation.size * project.zoom + 8,
                left: -4,
                top: -4,
              }}
            />
          )}
        </div>
      );
    }

    if (annotation.type === "text") {
      const bgColor = annotation.backgroundColor || "#ffffff";
      const bgOpacity = annotation.backgroundOpacity ?? 1;
      
      return (
        <div
          key={annotation.id}
          className={`absolute ${locked ? "cursor-not-allowed" : "cursor-move"}`}
          style={{
            left: annotation.x * project.zoom + project.panX,
            top: annotation.y * project.zoom + project.panY,
            width: annotation.width * project.zoom,
            minHeight: annotation.height * project.zoom,
            transformOrigin: "top left",
          }}
          onMouseDown={(e) => handleAnnotationMouseDown(e, annotation)}
          data-testid={`text-${annotation.id}`}
        >
          <div
            className="w-full h-full rounded-md shadow-md p-2"
            style={{
              backgroundColor: bgOpacity > 0 ? bgColor : "transparent",
              opacity: bgOpacity,
              border: `${annotation.borderWidth || 1}px solid ${annotation.borderColor || "#e5e7eb"}`,
              fontSize: annotation.fontSize * project.zoom,
              fontWeight: annotation.fontWeight || "normal",
              color: annotation.textColor || "#000000",
            }}
          >
            <p className="whitespace-pre-wrap break-words">
              {annotation.content || <span className="italic opacity-50">Empty note</span>}
            </p>
          </div>
          {isSelected && (
            <div className="absolute inset-0 border-2 border-primary rounded-md pointer-events-none" style={{ margin: -2 }}>
              {renderResizeHandles(annotation)}
            </div>
          )}
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
        <div
          key={annotation.id}
          className={`absolute ${locked ? "cursor-not-allowed" : "cursor-move"}`}
          style={shapeStyle}
          onMouseDown={(e) => handleAnnotationMouseDown(e, annotation)}
          data-testid={`shape-${annotation.id}`}
        >
          <svg className="w-full h-full" style={{ overflow: "visible" }}>
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
          {isSelected && (
            <div className="absolute inset-0 border-2 border-primary pointer-events-none" style={{ margin: -2 }}>
              {renderResizeHandles(annotation)}
            </div>
          )}
        </div>
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

    if (selectedTool === "text") {
      return (
        <div
          className="absolute border-2 border-dashed border-primary bg-primary/10 rounded-md pointer-events-none"
          style={style}
        />
      );
    }

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
    if (resizing) return "grabbing";
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
