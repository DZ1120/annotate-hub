import { useState, useCallback, useEffect } from "react";
import type { Project, Annotation, AnnotationPoint, TextNote, Shape, DefaultPointSettings, BackgroundSettings } from "@shared/schema";

export type ToolType = "select" | "point" | "text" | "rectangle" | "circle" | "line" | "arrow";

export type AnnotationWithVisibility = Annotation & {
  visible?: boolean;
  locked?: boolean;
};

const STORAGE_KEY = "image-annotator-project";
const STORAGE_KEY_VISIBILITY = "image-annotator-visibility";
const STORAGE_KEY_LOCKED = "image-annotator-locked";

// Load project data from localStorage
function loadProjectFromStorage(): Project | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Project;
    }
  } catch (error) {
    console.error("Failed to load project from storage:", error);
  }
  return null;
}

// Save project data to localStorage
function saveProjectToStorage(project: Project) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch (error) {
    console.error("Failed to save project to storage:", error);
  }
}

// Load visibility map from localStorage
function loadVisibilityMap(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VISIBILITY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load visibility map:", error);
  }
  return {};
}

// Save visibility map to localStorage
function saveVisibilityMap(map: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY_VISIBILITY, JSON.stringify(map));
  } catch (error) {
    console.error("Failed to save visibility map:", error);
  }
}

// Load locked map from localStorage
function loadLockedMap(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LOCKED);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load locked map:", error);
  }
  return {};
}

// Save locked map to localStorage
function saveLockedMap(map: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY_LOCKED, JSON.stringify(map));
  } catch (error) {
    console.error("Failed to save locked map:", error);
  }
}

export function useAnnotationStore() {
  // Initialize by loading data from localStorage
  const storedProject = loadProjectFromStorage();
  const defaultProject: Project = storedProject || {
    id: crypto.randomUUID(),
    name: "Untitled Project",
    annotations: [],
    zoom: 1,
    panX: 0,
    panY: 0,
    defaultPointSettings: {
      size: 32,
      color: "#3b82f6",
    },
  };

  const [project, setProject] = useState<Project>(defaultProject);
  
  const [selectedTool, setSelectedTool] = useState<ToolType>("select");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  
  // Calculate next point number
  const calculateNextPointNumber = useCallback((annotations: Annotation[]) => {
    const pointAnnotations = annotations.filter(a => a.type === "point") as AnnotationPoint[];
    if (pointAnnotations.length === 0) return 1;
    return Math.max(...pointAnnotations.map(p => p.number)) + 1;
  }, []);
  
  const [nextPointNumber, setNextPointNumber] = useState(() => 
    calculateNextPointNumber(defaultProject.annotations)
  );
  
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>(() => 
    loadVisibilityMap()
  );
  const [lockedMap, setLockedMap] = useState<Record<string, boolean>>(() => 
    loadLockedMap()
  );
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isEditingBackground, setIsEditingBackground] = useState(false);

  const selectedAnnotation = project.annotations.find(a => a.id === selectedAnnotationId) || null;

  // Auto-save project data to localStorage when it changes
  useEffect(() => {
    saveProjectToStorage(project);
  }, [project]);

  // Save visibility map to localStorage when it changes
  useEffect(() => {
    saveVisibilityMap(visibilityMap);
  }, [visibilityMap]);

  // Save locked map to localStorage when it changes
  useEffect(() => {
    saveLockedMap(lockedMap);
  }, [lockedMap]);

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
    setProject(prev => {
      const updated = { 
        ...prev, 
        backgroundImage: url,
        backgroundSettings: {
          rotation: 0,
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        }
      };
      saveProjectToStorage(updated);
      return updated;
    });
  }, []);

  const updateBackgroundSettings = useCallback((settings: Partial<BackgroundSettings>) => {
    setProject(prev => {
      const currentSettings = prev.backgroundSettings || {
        rotation: 0,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
      };
      const updated = {
        ...prev,
        backgroundSettings: {
          ...currentSettings,
          ...settings,
        },
      };
      saveProjectToStorage(updated);
      return updated;
    });
  }, []);

  const toggleEditingBackground = useCallback(() => {
    setIsEditingBackground(prev => !prev);
    if (isEditingBackground) {
      setSelectedAnnotationId(null);
    }
  }, [isEditingBackground]);

  const addAnnotation = useCallback((annotation: Annotation) => {
    setProject(prev => {
      const updated = {
        ...prev,
        annotations: [...prev.annotations, annotation],
      };
      saveProjectToStorage(updated);
      return updated;
    });
    if (annotation.type === "point") {
      setNextPointNumber(prev => prev + 1);
    }
    setSelectedAnnotationId(annotation.id);
    setVisibilityMap(prev => {
      const updated = { ...prev, [annotation.id]: true };
      saveVisibilityMap(updated);
      return updated;
    });
    setLockedMap(prev => {
      const updated = { ...prev, [annotation.id]: false };
      saveLockedMap(updated);
      return updated;
    });
  }, []);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setProject(prev => {
      const updated = {
        ...prev,
        annotations: prev.annotations.map(a => 
          a.id === id ? { ...a, ...updates } as Annotation : a
        ),
      };
      saveProjectToStorage(updated);
      return updated;
    });
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    setProject(prev => {
      const updated = {
        ...prev,
        annotations: prev.annotations.filter(a => a.id !== id),
      };
      saveProjectToStorage(updated);
      return updated;
    });
    if (selectedAnnotationId === id) {
      setSelectedAnnotationId(null);
    }
    setVisibilityMap(prev => {
      const newMap = { ...prev };
      delete newMap[id];
      saveVisibilityMap(newMap);
      return newMap;
    });
    setLockedMap(prev => {
      const newMap = { ...prev };
      delete newMap[id];
      saveLockedMap(newMap);
      return newMap;
    });
  }, [selectedAnnotationId]);

  const setZoom = useCallback((zoom: number) => {
    setProject(prev => {
      const updated = { ...prev, zoom: Math.max(0.1, Math.min(5, zoom)) };
      saveProjectToStorage(updated);
      return updated;
    });
  }, []);

  const setPan = useCallback((panX: number, panY: number) => {
    setProject(prev => {
      const updated = { ...prev, panX, panY };
      saveProjectToStorage(updated);
      return updated;
    });
  }, []);

  const toggleVisibility = useCallback((id: string) => {
    setVisibilityMap(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      saveVisibilityMap(updated);
      return updated;
    });
  }, []);

  const toggleLocked = useCallback((id: string) => {
    setLockedMap(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      saveLockedMap(updated);
      return updated;
    });
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
      
      const updated = { ...prev, annotations: newAnnotations };
      saveProjectToStorage(updated);
      return updated;
    });
  }, []);

  const setDefaultPointSettings = useCallback((settings: Partial<DefaultPointSettings>) => {
    setProject(prev => {
      const updated = {
        ...prev,
        defaultPointSettings: {
          ...prev.defaultPointSettings,
          ...settings,
        } as DefaultPointSettings,
      };
      saveProjectToStorage(updated);
      return updated;
    });
  }, []);

  const createPoint = useCallback((x: number, y: number): AnnotationPoint => {
    const defaults = project.defaultPointSettings || { size: 32, color: "#3b82f6" };
    return {
      id: crypto.randomUUID(),
      type: "point",
      x,
      y,
      number: nextPointNumber,
      size: defaults.size,
      color: defaults.color,
    };
  }, [nextPointNumber, project.defaultPointSettings]);

  const createTextNote = useCallback((x: number, y: number, width?: number, height?: number): TextNote => {
    return {
      id: crypto.randomUUID(),
      type: "text",
      x,
      y,
      width: width || 200,
      height: height || 100,
      content: "",
      fontSize: 14,
      fontWeight: "normal",
      textColor: "#000000",
      backgroundColor: "#ffffff",
      backgroundOpacity: 1,
      borderColor: "#e5e7eb",
      borderWidth: 1,
    };
  }, []);

  const createShape = useCallback((
    shapeType: Shape["shapeType"], 
    x: number, 
    y: number, 
    width: number, 
    height: number,
    startX?: number,
    startY?: number,
    endX?: number,
    endY?: number
  ): Shape => {
    const shape: Shape = {
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
    
    // For lines and arrows, store the actual endpoints
    if ((shapeType === "line" || shapeType === "arrow") && 
        startX !== undefined && startY !== undefined && 
        endX !== undefined && endY !== undefined) {
      shape.startX = startX;
      shape.startY = startY;
      shape.endX = endX;
      shape.endY = endY;
    }
    
    return shape;
  }, []);

  const clearProject = useCallback(() => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: "Untitled Project",
      annotations: [],
      zoom: 1,
      panX: 0,
      panY: 0,
      defaultPointSettings: {
        size: 32,
        color: "#3b82f6",
      },
    };
    setProject(newProject);
    saveProjectToStorage(newProject);
    setNextPointNumber(1);
    setSelectedAnnotationId(null);
    setVisibilityMap({});
    saveVisibilityMap({});
    setLockedMap({});
    saveLockedMap({});
  }, []);

  const importProject = useCallback((importedProject: Project) => {
    setProject(importedProject);
    saveProjectToStorage(importedProject);
    setNextPointNumber(
      Math.max(1, ...importedProject.annotations
        .filter(a => a.type === "point")
        .map(a => (a as AnnotationPoint).number + 1))
    );
    setSelectedAnnotationId(null);
    const newVisibilityMap: Record<string, boolean> = {};
    const newLockedMap: Record<string, boolean> = {};
    importedProject.annotations.forEach(a => {
      newVisibilityMap[a.id] = true;
      newLockedMap[a.id] = false;
    });
    setVisibilityMap(newVisibilityMap);
    saveVisibilityMap(newVisibilityMap);
    setLockedMap(newLockedMap);
    saveLockedMap(newLockedMap);
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
    updateBackgroundSettings,
    isEditingBackground,
    setIsEditingBackground,
    toggleEditingBackground,
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
    setDefaultPointSettings,
    importProject,
  };
}

export type AnnotationStore = ReturnType<typeof useAnnotationStore>;
