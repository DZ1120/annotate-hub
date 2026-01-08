import { useRef, useState, useCallback, useEffect } from "react";
import { Upload, ImageIcon, RotateCw } from "lucide-react";
import type { AnnotationStore, ToolType } from "@/lib/annotation-store";
import type { Annotation, Shape } from "@shared/schema";

interface AnnotationCanvasProps {
  store: AnnotationStore;
  onUploadClick: () => void;
}

export function AnnotationCanvas({ store, onUploadClick }: AnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgImageRef = useRef<HTMLImageElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [tempShape, setTempShape] = useState<{
    x: number; y: number; width: number; height: number;
    // For lines/arrows: actual endpoints relative to bounding box
    startX?: number; startY?: number; endX?: number; endY?: number;
  } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false); // Track if actual drag happened
  const [resizing, setResizing] = useState<{ id: string; handle: string } | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; annotation: Annotation } | null>(null);
  const [rotating, setRotating] = useState<{ id: string } | null>(null);
  const [rotateStart, setRotateStart] = useState<{ angle: number; startAngle: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [bgImageSize, setBgImageSize] = useState<{ width: number; height: number } | null>(null);

  // Image preview states - supports multiple images
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [imagePreviewIndex, setImagePreviewIndex] = useState(0);

  // Background editing states
  const [isDraggingBackground, setIsDraggingBackground] = useState(false);
  const [bgDragStart, setBgDragStart] = useState<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

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
    isEditingBackground,
    updateBackgroundSettings,
  } = store;

  const bgSettings = project.backgroundSettings || { rotation: 0, scale: 1, offsetX: 0, offsetY: 0 };

  // Center background in viewport
  const centerBackground = useCallback(() => {
    if (!containerRef.current || !bgImageSize) return;

    const container = containerRef.current.getBoundingClientRect();
    const imgWidth = bgImageSize.width * bgSettings.scale;
    const imgHeight = bgImageSize.height * bgSettings.scale;

    // Calculate zoom to fit image with some padding (90% of viewport)
    const scaleX = (container.width * 0.9) / imgWidth;
    const scaleY = (container.height * 0.9) / imgHeight;
    const fitZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%

    // Calculate pan to center the background (accounting for bgSettings.offset)
    const scaledWidth = imgWidth * fitZoom;
    const scaledHeight = imgHeight * fitZoom;
    const panX = (container.width - scaledWidth) / 2 - bgSettings.offsetX * fitZoom;
    const panY = (container.height - scaledHeight) / 2 - bgSettings.offsetY * fitZoom;

    // DEBUG: Print all values for comparison with export
    console.log('[EDITOR] centerBackground DEBUG:', {
      container: { width: container.width, height: container.height },
      bgImageSize: { width: bgImageSize.width, height: bgImageSize.height },
      bgSettings: { scale: bgSettings.scale, offsetX: bgSettings.offsetX, offsetY: bgSettings.offsetY },
      imgWidth, imgHeight,
      scaleX, scaleY,
      fitZoom,
      scaledWidth, scaledHeight,
      panX, panY
    });

    setZoom(fitZoom);
    setPan(panX, panY);
  }, [bgImageSize, bgSettings.scale, bgSettings.offsetX, bgSettings.offsetY, setZoom, setPan]);

  // Auto-center when background image loads
  const handleBgImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setBgImageSize({ width: img.naturalWidth, height: img.naturalHeight });
  }, []);

  // Auto-center on first load
  useEffect(() => {
    if (bgImageSize && project.backgroundImage) {
      // Only auto-center if zoom is at default (1) - indicating fresh load
      if (project.zoom === 1 && project.panX === 0 && project.panY === 0) {
        centerBackground();
      }
    }
  }, [bgImageSize, project.backgroundImage]);

  // Expose centerBackground through store for toolbar access
  useEffect(() => {
    (store as any).centerBackground = centerBackground;
  }, [centerBackground, store]);

  // Convert screen coordinates to world coordinates (accounting for zoom and pan)
  const getCanvasCoords = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    // Screen position relative to container
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    // Convert to world coordinates: (screen - pan) / zoom
    const worldX = (screenX - project.panX) / project.zoom;
    const worldY = (screenY - project.panY) / project.zoom;
    // Convert to annotation coordinates (relative to background offset)
    const x = worldX - bgSettings.offsetX;
    const y = worldY - bgSettings.offsetY;
    return { x, y };
  }, [project.zoom, project.panX, project.panY, bgSettings.offsetX, bgSettings.offsetY]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    if (isEditingBackground) {
      // Zoom background image in edit mode
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      const newScale = Math.max(0.1, Math.min(5, bgSettings.scale + delta));
      updateBackgroundSettings({ scale: newScale });
    } else {
      // Visual zoom centered on mouse position
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const oldZoom = project.zoom;
      const newZoom = Math.max(0.1, Math.min(5, oldZoom + delta));

      // Calculate the world point under the mouse before zoom
      const worldX = (mouseX - project.panX) / oldZoom;
      const worldY = (mouseY - project.panY) / oldZoom;

      // Calculate new pan to keep the same world point under the mouse
      // mouseX = worldX * newZoom + newPanX
      // newPanX = mouseX - worldX * newZoom
      const newPanX = mouseX - worldX * newZoom;
      const newPanY = mouseY - worldY * newZoom;

      // Update zoom and pan together
      store.setProject(prev => ({
        ...prev,
        zoom: newZoom,
        panX: newPanX,
        panY: newPanY,
      }));
    }
  }, [project.zoom, project.panX, project.panY, isEditingBackground, bgSettings.scale, updateBackgroundSettings, store]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // If editing background, handle background drag
    if (isEditingBackground && project.backgroundImage) {
      if (e.button === 0 && !e.altKey && !isSpacePressed) {
        setIsDraggingBackground(true);
        setBgDragStart({
          x: e.clientX,
          y: e.clientY,
          offsetX: bgSettings.offsetX,
          offsetY: bgSettings.offsetY,
        });
        return;
      }
    }

    if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && isSpacePressed)) {
      setIsPanning(true);
      return;
    }

    const coords = getCanvasCoords(e);

    if (selectedTool === "select") {
      return;
    }

    if (selectedTool === "point" && project.backgroundImage && !isEditingBackground) {
      const point = createPoint(coords.x, coords.y);
      addAnnotation(point);
      return;
    }

    if (selectedTool === "text" && project.backgroundImage && !isEditingBackground) {
      setIsDrawing(true);
      setDrawStart(coords);
      setTempShape({ x: coords.x, y: coords.y, width: 0, height: 0 });
      return;
    }

    if (["rectangle", "circle", "line", "arrow"].includes(selectedTool) && project.backgroundImage && !isEditingBackground) {
      setIsDrawing(true);
      setDrawStart(coords);
      setTempShape({ x: coords.x, y: coords.y, width: 0, height: 0 });
    }
  }, [selectedTool, project.backgroundImage, getCanvasCoords, createPoint, addAnnotation, isSpacePressed, isEditingBackground, bgSettings]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Handle background dragging
    if (isDraggingBackground && bgDragStart) {
      const dx = (e.clientX - bgDragStart.x) / project.zoom;
      const dy = (e.clientY - bgDragStart.y) / project.zoom;
      updateBackgroundSettings({
        offsetX: bgDragStart.offsetX + dx,
        offsetY: bgDragStart.offsetY + dy,
      });
      return;
    }

    if (isPanning) {
      setPan(project.panX + e.movementX, project.panY + e.movementY);
      return;
    }

    // Handle rotation
    if (rotating && rotateStart) {
      const annotation = project.annotations.find(a => a.id === rotating.id);
      if (annotation && (annotation.type === "shape" || annotation.type === "text")) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        // World center position (includes background offset)
        const worldCenterX = bgSettings.offsetX + annotation.x + annotation.width / 2;
        const worldCenterY = bgSettings.offsetY + annotation.y + annotation.height / 2;
        // Convert to screen position
        const screenCenterX = worldCenterX * project.zoom + project.panX + rect.left;
        const screenCenterY = worldCenterY * project.zoom + project.panY + rect.top;

        const angle = Math.atan2(e.clientY - screenCenterY, e.clientX - screenCenterX);
        const angleDeg = (angle * 180 / Math.PI) - rotateStart.startAngle + rotateStart.angle;

        updateAnnotation(rotating.id, { rotation: angleDeg });
      }
      return;
    }

    if (resizing && resizeStart) {
      const coords = getCanvasCoords(e);
      const annotation = resizeStart.annotation;

      // Handle line and arrow endpoint dragging
      if (annotation.type === "shape" && (annotation.shapeType === "line" || annotation.shapeType === "arrow")) {
        if (resizing.handle === "start" || resizing.handle === "end") {
          // Get current start and end points in absolute coordinates
          let startX = annotation.x + (annotation.startX ?? 0);
          let startY = annotation.y + (annotation.startY ?? annotation.height);
          let endX = annotation.x + (annotation.endX ?? annotation.width);
          let endY = annotation.y + (annotation.endY ?? 0);

          // Update the dragged point
          if (resizing.handle === "start") {
            startX = coords.x;
            startY = coords.y;
          } else {
            endX = coords.x;
            endY = coords.y;
          }

          // Calculate new bounding box
          const newX = Math.min(startX, endX);
          const newY = Math.min(startY, endY);
          const newWidth = Math.max(Math.abs(endX - startX), 1);
          const newHeight = Math.max(Math.abs(endY - startY), 1);

          // Calculate relative endpoints
          const newStartX = startX - newX;
          const newStartY = startY - newY;
          const newEndX = endX - newX;
          const newEndY = endY - newY;

          updateAnnotation(resizing.id, {
            x: newX, y: newY, width: newWidth, height: newHeight,
            startX: newStartX, startY: newStartY, endX: newEndX, endY: newEndY
          });
          return;
        }
      }

      // Standard resize for rectangles, circles, text
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
      setHasDragged(true); // Mark that actual drag happened
      const coords = getCanvasCoords(e);
      updateAnnotation(draggedId, {
        x: coords.x - dragOffset.x,
        y: coords.y - dragOffset.y,
      });
      return;
    }

    if (isDrawing && drawStart) {
      const coords = getCanvasCoords(e);
      const x = Math.min(drawStart.x, coords.x);
      const y = Math.min(drawStart.y, coords.y);
      const width = Math.abs(coords.x - drawStart.x);
      const height = Math.abs(coords.y - drawStart.y);

      // For lines and arrows, track actual endpoints relative to bounding box
      const isLineOrArrow = selectedTool === "line" || selectedTool === "arrow";
      setTempShape({
        x,
        y,
        width: Math.max(width, 1),
        height: Math.max(height, 1),
        // Store actual start and end points relative to bounding box top-left
        startX: isLineOrArrow ? drawStart.x - x : undefined,
        startY: isLineOrArrow ? drawStart.y - y : undefined,
        endX: isLineOrArrow ? coords.x - x : undefined,
        endY: isLineOrArrow ? coords.y - y : undefined,
      });
    }
  }, [isPanning, isDrawing, drawStart, draggedId, dragOffset, getCanvasCoords, setPan, project.panX, project.panY, updateAnnotation, resizing, resizeStart, rotating, rotateStart, project.annotations, project.zoom, isDraggingBackground, bgDragStart, updateBackgroundSettings]);

  const handleMouseUp = useCallback(() => {
    if (isDraggingBackground) {
      setIsDraggingBackground(false);
      setBgDragStart(null);
      return;
    }

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (rotating) {
      setRotating(null);
      setRotateStart(null);
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
        // Start editing the text immediately
        setTimeout(() => setEditingTextId(text.id), 50);
      } else if (tempShape.width > 5 || tempShape.height > 5) {
        const shapeType = selectedTool as Shape["shapeType"];
        const shape = createShape(
          shapeType,
          tempShape.x,
          tempShape.y,
          Math.max(tempShape.width, 10),
          Math.max(tempShape.height, 10),
          tempShape.startX,
          tempShape.startY,
          tempShape.endX,
          tempShape.endY
        );
        addAnnotation(shape);
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setTempShape(null);
  }, [isPanning, isDrawing, tempShape, selectedTool, createTextNote, createShape, addAnnotation, draggedId, resizing, rotating, isDraggingBackground]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only deselect when clicking directly on canvas container (not on annotations)
    // and only when in select mode
    const target = e.target as HTMLElement;
    const isCanvasClick = target === containerRef.current ||
      target.closest('[data-canvas-background]') !== null;

    if (isCanvasClick && selectedTool === "select" && !isEditingBackground) {
      setSelectedAnnotationId(null);
      setEditingTextId(null);
    }
  }, [selectedTool, setSelectedAnnotationId, isEditingBackground]);

  const handleAnnotationMouseDown = useCallback((e: React.MouseEvent, annotation: Annotation) => {
    e.stopPropagation();

    if (isEditingBackground) return;
    if (isLocked(annotation.id)) return;
    if (isSpacePressed) return;

    const coords = getCanvasCoords(e);
    setSelectedAnnotationId(annotation.id);
    setHasDragged(false); // Reset drag flag on mouse down

    if (selectedTool === "select") {
      setDraggedId(annotation.id);
      setDragOffset({
        x: coords.x - annotation.x,
        y: coords.y - annotation.y,
      });
    }
  }, [selectedTool, getCanvasCoords, setSelectedAnnotationId, isLocked, isSpacePressed, isEditingBackground]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, annotation: Annotation, handle: string) => {
    e.stopPropagation();
    if (isLocked(annotation.id)) return;
    if (isEditingBackground) return;

    const coords = getCanvasCoords(e);
    setResizing({ id: annotation.id, handle });
    setResizeStart({ x: coords.x, y: coords.y, annotation });
  }, [getCanvasCoords, isLocked, isEditingBackground]);

  const handleRotateMouseDown = useCallback((e: React.MouseEvent, annotation: Annotation) => {
    e.stopPropagation();
    if (isLocked(annotation.id)) return;
    if (isEditingBackground) return;
    if (annotation.type === "point") return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // World center position (includes background offset)
    const worldCenterX = bgSettings.offsetX + annotation.x + (annotation.type === "shape" || annotation.type === "text" ? annotation.width / 2 : 0);
    const worldCenterY = bgSettings.offsetY + annotation.y + (annotation.type === "shape" || annotation.type === "text" ? annotation.height / 2 : 0);
    // Convert to screen position
    const screenCenterX = worldCenterX * project.zoom + project.panX + rect.left;
    const screenCenterY = worldCenterY * project.zoom + project.panY + rect.top;

    const startAngle = Math.atan2(e.clientY - screenCenterY, e.clientX - screenCenterX) * 180 / Math.PI;
    const currentRotation = (annotation.type === "shape" || annotation.type === "text") ? (annotation.rotation || 0) : 0;

    setRotating({ id: annotation.id });
    setRotateStart({ angle: currentRotation, startAngle });
  }, [isLocked, project.zoom, project.panX, project.panY, isEditingBackground]);

  const handlePointClick = useCallback((e: React.MouseEvent, annotation: Annotation) => {
    e.stopPropagation();

    // Don't show image preview if we just dragged
    if (hasDragged) {
      return;
    }

    if (annotation.type === "point" && selectedTool === "select" && !isEditingBackground) {
      // Get all images (support both legacy single and new multiple)
      const images: string[] = [];
      if (annotation.attachedImageUrls && annotation.attachedImageUrls.length > 0) {
        images.push(...annotation.attachedImageUrls);
      } else if (annotation.attachedImageUrl) {
        images.push(annotation.attachedImageUrl);
      }

      if (images.length > 0) {
        setImagePreviewUrls(images);
        setImagePreviewIndex(0);
      }
    }
  }, [selectedTool, isEditingBackground, hasDragged]);

  const handleTextDoubleClick = useCallback((e: React.MouseEvent, annotation: Annotation) => {
    e.stopPropagation();
    if (annotation.type === "text" && !isLocked(annotation.id) && !isEditingBackground) {
      setEditingTextId(annotation.id);
    }
  }, [isLocked, isEditingBackground]);

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
        setImagePreviewUrls([]);
        setImagePreviewIndex(0);
        setEditingTextId(null);
        if (isEditingBackground) {
          store.setIsEditingBackground(false);
        }
      }
      // Image preview navigation with arrow keys
      if (imagePreviewUrls.length > 1) {
        if (e.key === "ArrowLeft") {
          setImagePreviewIndex((prev) => (prev - 1 + imagePreviewUrls.length) % imagePreviewUrls.length);
        }
        if (e.key === "ArrowRight") {
          setImagePreviewIndex((prev) => (prev + 1) % imagePreviewUrls.length);
        }
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
  }, [selectedAnnotationId, store, setSelectedAnnotationId, isLocked, isEditingBackground]);

  const renderRotateHandle = (annotation: Annotation) => {
    if (annotation.id !== selectedAnnotationId) return null;
    if (annotation.type === "point") return null;
    if (isLocked(annotation.id)) return null;
    if (isEditingBackground) return null;
    // Lines and arrows don't need rotation - their direction is set by endpoints
    if (annotation.type === "shape" && (annotation.shapeType === "line" || annotation.shapeType === "arrow")) return null;

    const rawWidth = annotation.type === "shape" || annotation.type === "text" ? annotation.width : 0;
    const scaledWidth = rawWidth * project.zoom;

    return (
      <div
        className="absolute flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{
          left: scaledWidth / 2 - 10,
          top: -35,
          width: 20,
          height: 20,
        }}
        onMouseDown={(e) => handleRotateMouseDown(e, annotation)}
      >
        <div className="w-5 h-5 rounded-full bg-primary border-2 border-white shadow-md flex items-center justify-center">
          <RotateCw className="w-3 h-3 text-white" />
        </div>
        <div
          className="absolute w-0.5 bg-primary"
          style={{ height: 15, top: 20, left: "50%", transform: "translateX(-50%)" }}
        />
      </div>
    );
  };

  const renderResizeHandles = (annotation: Annotation) => {
    if (annotation.id !== selectedAnnotationId) return null;
    if (annotation.type === "point") return null;
    if (isLocked(annotation.id)) return null;
    if (isEditingBackground) return null;

    const handleSize = 10;

    // For lines and arrows, only show handles at the two endpoints
    if (annotation.type === "shape" && (annotation.shapeType === "line" || annotation.shapeType === "arrow")) {
      const x1 = (annotation.startX ?? 0) * project.zoom;
      const y1 = (annotation.startY ?? annotation.height) * project.zoom;
      const x2 = (annotation.endX ?? annotation.width) * project.zoom;
      const y2 = (annotation.endY ?? 0) * project.zoom;

      return (
        <>
          {/* Start point handle */}
          <div
            className="absolute bg-primary border-2 border-white rounded-full shadow-sm cursor-move"
            style={{
              width: handleSize,
              height: handleSize,
              left: x1 - handleSize / 2,
              top: y1 - handleSize / 2,
            }}
            onMouseDown={(e) => handleResizeMouseDown(e, annotation, "start")}
          />
          {/* End point handle */}
          <div
            className="absolute bg-primary border-2 border-white rounded-full shadow-sm cursor-move"
            style={{
              width: handleSize,
              height: handleSize,
              left: x2 - handleSize / 2,
              top: y2 - handleSize / 2,
            }}
            onMouseDown={(e) => handleResizeMouseDown(e, annotation, "end")}
          />
        </>
      );
    }

    // For rectangles, circles, and text - use standard 8 corner handles
    const handles = ["nw", "ne", "sw", "se", "n", "s", "e", "w"];
    const width = annotation.width * project.zoom;
    const height = annotation.height * project.zoom;

    return (
      <>
        {handles.map(handle => {
          let x = 0;
          let y = 0;
          let cursor = "";

          if (handle.includes("w")) x = -handleSize / 2;
          if (handle.includes("e")) x = width - handleSize / 2;
          if (handle === "n" || handle === "s") x = width / 2 - handleSize / 2;

          if (handle.includes("n")) y = -handleSize / 2;
          if (handle.includes("s")) y = height - handleSize / 2;
          if (handle === "e" || handle === "w") y = height / 2 - handleSize / 2;

          if (handle === "nw" || handle === "se") cursor = "nwse-resize";
          if (handle === "ne" || handle === "sw") cursor = "nesw-resize";
          if (handle === "n" || handle === "s") cursor = "ns-resize";
          if (handle === "e" || handle === "w") cursor = "ew-resize";

          return (
            <div
              key={handle}
              className="absolute bg-primary border-2 border-white rounded-sm shadow-sm"
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
        })}
        {renderRotateHandle(annotation)}
      </>
    );
  };

  // Calculate screen position for an annotation point
  const getScreenPos = useCallback((x: number, y: number) => {
    const worldX = bgSettings.offsetX + x;
    const worldY = bgSettings.offsetY + y;
    return {
      x: worldX * project.zoom + project.panX,
      y: worldY * project.zoom + project.panY,
    };
  }, [bgSettings.offsetX, bgSettings.offsetY, project.zoom, project.panX, project.panY]);

  const renderAnnotation = (annotation: Annotation) => {
    if (!isVisible(annotation.id)) return null;
    if (isEditingBackground) return null;

    const isSelected = annotation.id === selectedAnnotationId;
    const locked = isLocked(annotation.id);
    const rotation = (annotation.type === "shape" || annotation.type === "text") ? (annotation.rotation || 0) : 0;
    const screenPos = getScreenPos(annotation.x, annotation.y);

    if (annotation.type === "point") {
      const scaledSize = annotation.size * project.zoom;

      return (
        <div
          key={annotation.id}
          className={`absolute cursor-pointer ${isSelected ? "z-10" : ""} ${locked ? "cursor-not-allowed opacity-75" : ""}`}
          style={{
            left: screenPos.x,
            top: screenPos.y,
            transform: `translate(-50%, -50%)`,
          }}
          onMouseDown={(e) => handleAnnotationMouseDown(e, annotation)}
          onClick={(e) => handlePointClick(e, annotation)}
          data-testid={`point-${annotation.id}`}
        >
          <div
            className="relative flex items-center justify-center rounded-full shadow-md transition-transform hover:scale-110"
            style={{
              width: scaledSize,
              height: scaledSize,
              backgroundColor: annotation.color,
            }}
          >
            <span
              className="text-white font-bold select-none"
              style={{ fontSize: scaledSize * 0.4 }}
            >
              {annotation.number}
            </span>
            {(() => {
              const imageCount = annotation.attachedImageUrls?.length || (annotation.attachedImageUrl ? 1 : 0);
              if (imageCount === 0) return null;
              const badgeSize = Math.max(14, 12 * project.zoom);
              return (
                <div
                  className="absolute -top-1 -right-1 bg-green-500 rounded-full border-2 border-white flex items-center justify-center"
                  style={{
                    minWidth: badgeSize,
                    height: badgeSize,
                    padding: imageCount > 1 ? '0 3px' : 0,
                    fontSize: badgeSize * 0.6,
                  }}
                >
                  {imageCount > 1 && (
                    <span className="text-white font-bold">{imageCount}</span>
                  )}
                </div>
              );
            })()}
          </div>
          {isSelected && (
            <div
              className="absolute rounded-full border-2 border-primary pointer-events-none"
              style={{
                width: scaledSize + 8,
                height: scaledSize + 8,
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
      const isEditing = editingTextId === annotation.id;
      const scaledWidth = annotation.width * project.zoom;
      const scaledHeight = annotation.height * project.zoom;
      const scaledFontSize = annotation.fontSize * project.zoom;

      return (
        <div
          key={annotation.id}
          className={`absolute ${locked ? "cursor-not-allowed" : "cursor-move"}`}
          style={{
            left: screenPos.x,
            top: screenPos.y,
            width: scaledWidth,
            minHeight: scaledHeight,
            transformOrigin: "center center",
            transform: `rotate(${rotation}deg)`,
          }}
          onMouseDown={(e) => handleAnnotationMouseDown(e, annotation)}
          onDoubleClick={(e) => handleTextDoubleClick(e, annotation)}
          data-testid={`text-${annotation.id}`}
        >
          <div
            className="w-full h-full rounded-md shadow-md"
            style={{
              backgroundColor: bgOpacity > 0 ? bgColor : "transparent",
              opacity: bgOpacity > 0 ? 1 : undefined,
              border: `${annotation.borderWidth || 1}px solid ${annotation.borderColor || "#e5e7eb"}`,
            }}
          >
            {isEditing ? (
              <textarea
                autoFocus
                value={annotation.content}
                onChange={(e) => updateAnnotation(annotation.id, { content: e.target.value })}
                onBlur={() => setEditingTextId(null)}
                className="w-full h-full p-2 bg-transparent resize-none outline-none"
                style={{
                  fontSize: scaledFontSize,
                  fontWeight: annotation.fontWeight || "normal",
                  color: annotation.textColor || "#000000",
                  minHeight: scaledHeight,
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div
                className="p-2 whitespace-pre-wrap break-words"
                style={{
                  fontSize: scaledFontSize,
                  fontWeight: annotation.fontWeight || "normal",
                  color: annotation.textColor || "#000000",
                }}
              >
                {annotation.content || <span className="italic opacity-50">Double-click to edit</span>}
              </div>
            )}
          </div>
          {isSelected && !isEditing && (
            <div className="absolute inset-0 border-2 border-primary rounded-md pointer-events-none" style={{ margin: -2 }}>
              {renderResizeHandles(annotation)}
            </div>
          )}
        </div>
      );
    }

    if (annotation.type === "shape") {
      const scaledWidth = annotation.width * project.zoom;
      const scaledHeight = annotation.height * project.zoom;

      return (
        <div
          key={annotation.id}
          className={`absolute ${locked ? "cursor-not-allowed" : "cursor-move"}`}
          style={{
            left: screenPos.x,
            top: screenPos.y,
            width: scaledWidth,
            height: scaledHeight,
            transformOrigin: "center center",
            transform: `rotate(${rotation}deg)`,
          }}
          onMouseDown={(e) => handleAnnotationMouseDown(e, annotation)}
          data-testid={`shape-${annotation.id}`}
        >
          <svg className="w-full h-full" style={{ overflow: "visible" }}>
            {annotation.shapeType === "rectangle" && (
              <rect
                x={annotation.strokeWidth / 2}
                y={annotation.strokeWidth / 2}
                width={Math.max(0, scaledWidth - annotation.strokeWidth)}
                height={Math.max(0, scaledHeight - annotation.strokeWidth)}
                stroke={annotation.strokeColor}
                strokeWidth={annotation.strokeWidth}
                fill={annotation.fillOpacity > 0 ? (annotation.fillColor || annotation.strokeColor) : "none"}
                fillOpacity={annotation.fillOpacity}
              />
            )}
            {annotation.shapeType === "circle" && (
              <ellipse
                cx={scaledWidth / 2}
                cy={scaledHeight / 2}
                rx={Math.max(0, (scaledWidth - annotation.strokeWidth) / 2)}
                ry={Math.max(0, (scaledHeight - annotation.strokeWidth) / 2)}
                stroke={annotation.strokeColor}
                strokeWidth={annotation.strokeWidth}
                fill={annotation.fillOpacity > 0 ? (annotation.fillColor || annotation.strokeColor) : "none"}
                fillOpacity={annotation.fillOpacity}
              />
            )}
            {annotation.shapeType === "line" && (() => {
              // Use stored endpoints or default diagonal
              const x1 = (annotation.startX ?? 0) * project.zoom;
              const y1 = (annotation.startY ?? annotation.height) * project.zoom;
              const x2 = (annotation.endX ?? annotation.width) * project.zoom;
              const y2 = (annotation.endY ?? 0) * project.zoom;
              return (
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={annotation.strokeColor}
                  strokeWidth={annotation.strokeWidth}
                />
              );
            })()}
            {annotation.shapeType === "arrow" && (() => {
              // Use stored endpoints or default horizontal
              const x1 = (annotation.startX ?? 0) * project.zoom;
              const y1 = (annotation.startY ?? annotation.height / 2) * project.zoom;
              const x2 = (annotation.endX ?? annotation.width) * project.zoom;
              const y2 = (annotation.endY ?? annotation.height / 2) * project.zoom;

              // Calculate arrow head
              const angle = Math.atan2(y2 - y1, x2 - x1);
              const arrowLen = 12;
              const arrowAngle = Math.PI / 6; // 30 degrees

              const ax1 = x2 - arrowLen * Math.cos(angle - arrowAngle);
              const ay1 = y2 - arrowLen * Math.sin(angle - arrowAngle);
              const ax2 = x2 - arrowLen * Math.cos(angle + arrowAngle);
              const ay2 = y2 - arrowLen * Math.sin(angle + arrowAngle);

              // Shorten line to not overlap arrow head
              const lineEndX = x2 - 8 * Math.cos(angle);
              const lineEndY = y2 - 8 * Math.sin(angle);

              return (
                <g>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={lineEndX}
                    y2={lineEndY}
                    stroke={annotation.strokeColor}
                    strokeWidth={annotation.strokeWidth}
                  />
                  <polygon
                    points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`}
                    fill={annotation.strokeColor}
                  />
                </g>
              );
            })()}
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

    const tempScreenPos = getScreenPos(tempShape.x, tempShape.y);
    const scaledWidth = tempShape.width * project.zoom;
    const scaledHeight = tempShape.height * project.zoom;

    const style = {
      left: tempScreenPos.x,
      top: tempScreenPos.y,
      width: scaledWidth,
      height: scaledHeight,
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
            width={Math.max(0, scaledWidth - 2)}
            height={Math.max(0, scaledHeight - 2)}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeDasharray="5,5"
            fill="none"
          />
        )}
        {selectedTool === "circle" && (
          <ellipse
            cx={scaledWidth / 2}
            cy={scaledHeight / 2}
            rx={Math.max(0, scaledWidth / 2 - 1)}
            ry={Math.max(0, scaledHeight / 2 - 1)}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeDasharray="5,5"
            fill="none"
          />
        )}
        {selectedTool === "line" && (() => {
          const x1 = (tempShape.startX ?? 0) * project.zoom;
          const y1 = (tempShape.startY ?? tempShape.height) * project.zoom;
          const x2 = (tempShape.endX ?? tempShape.width) * project.zoom;
          const y2 = (tempShape.endY ?? 0) * project.zoom;
          return (
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="5,5"
            />
          );
        })()}
        {selectedTool === "arrow" && (() => {
          const x1 = (tempShape.startX ?? 0) * project.zoom;
          const y1 = (tempShape.startY ?? tempShape.height / 2) * project.zoom;
          const x2 = (tempShape.endX ?? tempShape.width) * project.zoom;
          const y2 = (tempShape.endY ?? tempShape.height / 2) * project.zoom;

          // Calculate arrow head
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const arrowLen = 12;
          const arrowAngle = Math.PI / 6;

          const ax1 = x2 - arrowLen * Math.cos(angle - arrowAngle);
          const ay1 = y2 - arrowLen * Math.sin(angle - arrowAngle);
          const ax2 = x2 - arrowLen * Math.cos(angle + arrowAngle);
          const ay2 = y2 - arrowLen * Math.sin(angle + arrowAngle);

          return (
            <g>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
              <polygon
                points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`}
                fill="hsl(var(--primary))"
                opacity={0.5}
              />
            </g>
          );
        })()}
      </svg>
    );
  };

  const getCursor = () => {
    if (isPanning || isSpacePressed) return "grab";
    if (resizing || rotating) return "grabbing";
    if (isEditingBackground) return isDraggingBackground ? "grabbing" : "move";
    if (selectedTool === "select") return "default";
    if (selectedTool === "point") return "crosshair";
    if (selectedTool === "text") return "text";
    return "crosshair";
  };

  // Image preview popup component - centered with margin
  const renderImagePreview = () => {
    if (imagePreviewUrls.length === 0) return null;

    const currentImage = imagePreviewUrls[imagePreviewIndex];
    const hasMultiple = imagePreviewUrls.length > 1;

    const closePreview = () => {
      setImagePreviewUrls([]);
      setImagePreviewIndex(0);
    };

    const prevImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      setImagePreviewIndex((prev) => (prev - 1 + imagePreviewUrls.length) % imagePreviewUrls.length);
    };

    const nextImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      setImagePreviewIndex((prev) => (prev + 1) % imagePreviewUrls.length);
    };

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-8"
        onClick={closePreview}
        style={{ background: "rgba(0, 0, 0, 0.3)" }}
      >
        <div
          className="relative bg-card rounded-lg shadow-2xl overflow-hidden"
          style={{
            maxWidth: "calc(100vw - 80px)",
            maxHeight: "calc(100vh - 80px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={closePreview}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10 text-lg font-light"
          >
            ×
          </button>

          {/* Image counter */}
          {hasMultiple && (
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 text-white text-sm z-10">
              {imagePreviewIndex + 1} / {imagePreviewUrls.length}
            </div>
          )}

          {/* Previous button */}
          {hasMultiple && (
            <button
              onClick={prevImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10 text-2xl font-light"
            >
              ‹
            </button>
          )}

          {/* Next button */}
          {hasMultiple && (
            <button
              onClick={nextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10 text-2xl font-light"
            >
              ›
            </button>
          )}

          <img
            src={currentImage}
            alt={`Attached image ${imagePreviewIndex + 1}`}
            className="block"
            style={{
              maxWidth: "calc(100vw - 80px)",
              maxHeight: "calc(100vh - 80px)",
              objectFit: "contain",
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none canvas-checker"
        style={{
          cursor: getCursor(),
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          userSelect: "none",
        } as React.CSSProperties}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        onDragStart={(e) => e.preventDefault()}
        data-testid="annotation-canvas"
      >
        {/* Background image - positioned directly with transform */}
        {project.backgroundImage && (
          <div
            className="absolute"
            style={{
              left: 0,
              top: 0,
              transform: `translate(${project.panX + bgSettings.offsetX * project.zoom}px, ${project.panY + bgSettings.offsetY * project.zoom}px) scale(${project.zoom * bgSettings.scale}) rotate(${bgSettings.rotation}deg)`,
              transformOrigin: "0 0",
              // Only allow pointer events when editing background
              pointerEvents: isEditingBackground ? "auto" : "none",
            }}
          >
            <img
              ref={bgImageRef}
              src={project.backgroundImage}
              alt="Background"
              className={`shadow-2xl transition-shadow block ${isEditingBackground ? "ring-4 ring-primary ring-opacity-50 cursor-move" : ""}`}
              style={{
                // Completely prevent selection and drag ghost
                userSelect: "none",
                WebkitUserSelect: "none",
                MozUserSelect: "none",
                WebkitUserDrag: "none",
                WebkitTouchCallout: "none",
              } as React.CSSProperties}
              draggable={false}
              onLoad={handleBgImageLoad}
              onDragStart={(e: React.DragEvent) => e.preventDefault()}
              onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
            />
          </div>
        )}

        {/* Annotations layer */}
        {project.backgroundImage && project.annotations.map(renderAnnotation)}
        {project.backgroundImage && renderTempShape()}

        {/* Upload placeholder when no background */}
        {!project.backgroundImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              onClick={onUploadClick}
              className="flex flex-col items-center gap-5 p-10 rounded-lg border border-dashed border-border bg-card/80 backdrop-blur-sm cursor-pointer hover:bg-card hover:border-primary/50 transition-all duration-200"
              data-testid="upload-placeholder"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-base font-medium text-foreground">Upload an image or PDF</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Engineering drawings, maps, photos, and more
                </p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                <Upload className="h-4 w-4" />
                Choose File
              </button>
            </div>
          </div>
        )}

        {isSpacePressed && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm px-3 py-1.5 rounded text-xs text-muted-foreground border border-border/60 shadow-lg z-50">
            Drag to pan
          </div>
        )}

        {isEditingBackground && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-primary backdrop-blur-sm px-4 py-2 rounded text-xs text-primary-foreground shadow-lg flex items-center gap-3 z-50">
            <span className="font-medium">Editing Background</span>
            <span className="opacity-80">Drag to move • Scroll to zoom • ESC to exit</span>
          </div>
        )}
      </div>

      {renderImagePreview()}
    </>
  );
}
