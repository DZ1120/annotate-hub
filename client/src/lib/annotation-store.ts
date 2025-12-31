import { useState, useCallback, useEffect } from "react";
import type { Project, Annotation, AnnotationPoint, TextNote, Shape } from "@shared/schema";

export type ToolType = "select" | "point" | "text" | "rectangle" | "circle" | "line" | "arrow";

export interface AnnotationWithVisibility extends Annotation {
  visible?: boolean;
  locked?: boolean;
}

export function useAnnotationStore() {
  const [project, setProject] = useState<Project>({
    id: crypto.randomUUID(),
    name: "Untitled Project",
    annotations: [],
    zoom: 1,
    panX: 0,
    panY: 0,
  });
  
  const [selectedTool, setSelectedTool] = useState<ToolType>("select");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [nextPointNumber, setNextPointNumber] = useState(1);
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({});
  const [lockedMap, setLockedMap] = useState<Record<string, boolean>>({});
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const selectedAnnotation = project.annotations.find(a => a.id === selectedAnnotationId) || null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const setBackgroundImage = useCallback((url: string) => {
    setProject(prev => ({ ...prev, backgroundImage: url }));
  }, []);

  const addAnnotation = useCallback((annotation: Annotation) => {
    setProject(prev => ({
      ...prev,
      annotations: [...prev.annotations, annotation],
    }));
    if (annotation.type === "point") {
      setNextPointNumber(prev => prev + 1);
    }
    setSelectedAnnotationId(annotation.id);
    setVisibilityMap(prev => ({ ...prev, [annotation.id]: true }));
    setLockedMap(prev => ({ ...prev, [annotation.id]: false }));
  }, []);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setProject(prev => ({
      ...prev,
      annotations: prev.annotations.map(a => 
        a.id === id ? { ...a, ...updates } as Annotation : a
      ),
    }));
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    setProject(prev => ({
      ...prev,
      annotations: prev.annotations.filter(a => a.id !== id),
    }));
    if (selectedAnnotationId === id) {
      setSelectedAnnotationId(null);
    }
    setVisibilityMap(prev => {
      const newMap = { ...prev };
      delete newMap[id];
      return newMap;
    });
    setLockedMap(prev => {
      const newMap = { ...prev };
      delete newMap[id];
      return newMap;
    });
  }, [selectedAnnotationId]);

  const setZoom = useCallback((zoom: number) => {
    setProject(prev => ({ ...prev, zoom: Math.max(0.1, Math.min(5, zoom)) }));
  }, []);

  const setPan = useCallback((panX: number, panY: number) => {
    setProject(prev => ({ ...prev, panX, panY }));
  }, []);

  const toggleVisibility = useCallback((id: string) => {
    setVisibilityMap(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleLocked = useCallback((id: string) => {
    setLockedMap(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const isVisible = useCallback((id: string) => {
    return visibilityMap[id] !== false;
  }, [visibilityMap]);

  const isLocked = useCallback((id: string) => {
    return lockedMap[id] === true;
  }, [lockedMap]);

  const moveAnnotation = useCallback((id: string, direction: "up" | "down") => {
    setProject(prev => {
      const index = prev.annotations.findIndex(a => a.id === id);
      if (index === -1) return prev;
      
      const newAnnotations = [...prev.annotations];
      const newIndex = direction === "up" ? index - 1 : index + 1;
      
      if (newIndex < 0 || newIndex >= newAnnotations.length) return prev;
      
      [newAnnotations[index], newAnnotations[newIndex]] = [newAnnotations[newIndex], newAnnotations[index]];
      
      return { ...prev, annotations: newAnnotations };
    });
  }, []);

  const createPoint = useCallback((x: number, y: number): AnnotationPoint => {
    return {
      id: crypto.randomUUID(),
      type: "point",
      x,
      y,
      number: nextPointNumber,
      size: 32,
      color: "#3b82f6",
    };
  }, [nextPointNumber]);

  const createTextNote = useCallback((x: number, y: number): TextNote => {
    return {
      id: crypto.randomUUID(),
      type: "text",
      x,
      y,
      width: 200,
      height: 100,
      content: "",
      fontSize: 14,
    };
  }, []);

  const createShape = useCallback((shapeType: Shape["shapeType"], x: number, y: number, width: number, height: number): Shape => {
    return {
      id: crypto.randomUUID(),
      type: "shape",
      shapeType,
      x,
      y,
      width,
      height,
      strokeColor: "#3b82f6",
      strokeWidth: 2,
      fillOpacity: 0,
    };
  }, []);

  const clearProject = useCallback(() => {
    setProject({
      id: crypto.randomUUID(),
      name: "Untitled Project",
      annotations: [],
      zoom: 1,
      panX: 0,
      panY: 0,
    });
    setNextPointNumber(1);
    setSelectedAnnotationId(null);
    setVisibilityMap({});
    setLockedMap({});
  }, []);

  return {
    project,
    setProject,
    selectedTool,
    setSelectedTool,
    selectedAnnotationId,
    setSelectedAnnotationId,
    selectedAnnotation,
    nextPointNumber,
    setBackgroundImage,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    setZoom,
    setPan,
    createPoint,
    createTextNote,
    createShape,
    clearProject,
    isSpacePressed,
    toggleVisibility,
    toggleLocked,
    isVisible,
    isLocked,
    moveAnnotation,
  };
}

export type AnnotationStore = ReturnType<typeof useAnnotationStore>;
