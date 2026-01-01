import { useState, useRef } from "react";
import { MapPin, Type, Square, Minus, MoveRight, Eye, EyeOff, Lock, Unlock, Circle, Pencil, Check, X, GripVertical, Trash2, CheckSquare, Square as SquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import type { AnnotationStore } from "@/lib/annotation-store";
import type { Annotation } from "@shared/schema";

interface LayersPanelProps {
  store: AnnotationStore;
  width?: number;
}

function getAnnotationIcon(annotation: Annotation) {
  switch (annotation.type) {
    case "point":
      return MapPin;
    case "text":
      return Type;
    case "shape":
      switch (annotation.shapeType) {
        case "rectangle":
          return Square;
        case "circle":
          return Circle;
        case "line":
          return Minus;
        case "arrow":
          return MoveRight;
      }
  }
}

function getAnnotationLabel(annotation: Annotation) {
  const customLabel = annotation.label;
  switch (annotation.type) {
    case "point":
      return customLabel ? `Point ${annotation.number} - ${customLabel}` : `Point ${annotation.number}`;
    case "text":
      return customLabel || annotation.content.slice(0, 20) || "Text Note";
    case "shape":
      const shapeName = annotation.shapeType.charAt(0).toUpperCase() + annotation.shapeType.slice(1);
      return customLabel || shapeName;
  }
}

export function LayersPanel({ store, width }: LayersPanelProps) {
  const { 
    project, 
    selectedAnnotationId, 
    setSelectedAnnotationId,
    toggleVisibility,
    toggleLocked,
    isVisible,
    isLocked,
    updateAnnotation,
    deleteAnnotation,
  } = store;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const draggedIndexRef = useRef<number>(-1);
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  const startEditing = (annotation: Annotation) => {
    setEditingId(annotation.id);
    setEditingLabel(annotation.label || "");
  };

  const saveLabel = (id: string) => {
    updateAnnotation(id, { label: editingLabel || undefined });
    setEditingId(null);
    setEditingLabel("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingLabel("");
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, annotation: Annotation, index: number) => {
    setDraggedId(annotation.id);
    draggedIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", annotation.id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (targetId !== draggedId) {
      setDragOverId(targetId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = draggedIndexRef.current;
    
    if (sourceIndex !== -1 && sourceIndex !== targetIndex) {
      // Reorder annotations
      const newAnnotations = [...project.annotations];
      const [removed] = newAnnotations.splice(sourceIndex, 1);
      newAnnotations.splice(targetIndex, 0, removed);
      
      // Update project with new order
      store.setProject(prev => ({
        ...prev,
        annotations: newAnnotations,
      }));
    }
    
    setDraggedId(null);
    setDragOverId(null);
    draggedIndexRef.current = -1;
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    draggedIndexRef.current = -1;
  };

  // Multi-select helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(project.annotations.map(a => a.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const isAllSelected = project.annotations.length > 0 && selectedIds.size === project.annotations.length;
  const hasSelection = selectedIds.size > 0;

  // Batch operations
  const batchDelete = () => {
    selectedIds.forEach(id => deleteAnnotation(id));
    setSelectedIds(new Set());
  };

  const batchHide = () => {
    selectedIds.forEach(id => {
      if (isVisible(id)) toggleVisibility(id);
    });
  };

  const batchShow = () => {
    selectedIds.forEach(id => {
      if (!isVisible(id)) toggleVisibility(id);
    });
  };

  const batchLock = () => {
    selectedIds.forEach(id => {
      if (!isLocked(id)) toggleLocked(id);
    });
  };

  const batchUnlock = () => {
    selectedIds.forEach(id => {
      if (isLocked(id)) toggleLocked(id);
    });
  };

  return (
    <aside 
      className="border-r border-border/60 bg-card/95 backdrop-blur-sm flex flex-col flex-shrink-0 h-full"
      style={{ width: width || 220 }}
    >
      <div className="p-2.5 border-b border-border/60 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layers</h2>
          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
            {project.annotations.length}
          </span>
        </div>
        
        {/* Multi-select toggle and actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isMultiSelectMode ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setIsMultiSelectMode(!isMultiSelectMode);
                  if (isMultiSelectMode) deselectAll();
                }}
              >
                <CheckSquare className="h-3 w-3 mr-1" />
                {isMultiSelectMode ? "Done" : "Select"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle multi-select mode</TooltipContent>
          </Tooltip>
          
          {isMultiSelectMode && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={isAllSelected ? deselectAll : selectAll}
              >
                {isAllSelected ? "Deselect" : "All"}
              </Button>
              
              {hasSelection && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {selectedIds.size} selected
                </span>
              )}
            </>
          )}
        </div>
        
        {/* Batch action buttons */}
        {isMultiSelectMode && hasSelection && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={batchDelete}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete selected</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={batchShow}>
                  <Eye className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Show selected</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={batchHide}>
                  <EyeOff className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hide selected</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={batchLock}>
                  <Lock className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Lock selected</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={batchUnlock}>
                  <Unlock className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Unlock selected</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {project.annotations.length === 0 ? (
            <p className="text-sm text-muted-foreground p-2 text-center">
              No annotations yet
            </p>
          ) : (
            <ul className="space-y-1">
              {project.annotations.map((annotation, index) => {
                const Icon = getAnnotationIcon(annotation);
                const isSelected = annotation.id === selectedAnnotationId;
                const visible = isVisible(annotation.id);
                const locked = isLocked(annotation.id);
                const isEditing = editingId === annotation.id;
                const isDragging = draggedId === annotation.id;
                const isDragOver = dragOverId === annotation.id;
                const isMultiSelected = selectedIds.has(annotation.id);

                return (
                  <li 
                    key={annotation.id} 
                    className="group"
                    draggable={!isEditing && !isMultiSelectMode}
                    onDragStart={(e) => handleDragStart(e, annotation, index)}
                    onDragOver={(e) => handleDragOver(e, annotation.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <div
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-md transition-all ${
                        isSelected && !isMultiSelectMode ? "bg-accent" : ""
                      } ${isMultiSelected ? "bg-primary/20 ring-1 ring-primary/50" : "hover:bg-accent/50"
                      } ${!visible ? "opacity-50" : ""} ${
                        isDragging ? "opacity-50 scale-95" : ""
                      } ${isDragOver ? "ring-2 ring-primary ring-offset-1" : ""}`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            value={editingLabel}
                            onChange={(e) => setEditingLabel(e.target.value)}
                            placeholder="Enter label..."
                            className="h-7 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveLabel(annotation.id);
                              if (e.key === "Escape") cancelEditing();
                            }}
                            data-testid={`input-layer-label-${annotation.id}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => saveLabel(annotation.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={cancelEditing}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          {/* Checkbox for multi-select mode */}
                          {isMultiSelectMode ? (
                            <Checkbox
                              checked={selectedIds.has(annotation.id)}
                              onCheckedChange={() => toggleSelect(annotation.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4"
                            />
                          ) : (
                            /* Drag handle */
                            <div 
                              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>
                          )}
                          
                          <button
                            onClick={() => {
                              if (isMultiSelectMode) {
                                toggleSelect(annotation.id);
                              } else {
                                setSelectedAnnotationId(annotation.id);
                              }
                            }}
                            className="flex items-center gap-2 flex-1 min-w-0 text-left text-sm"
                            data-testid={`layer-item-${annotation.id}`}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">
                              {getAnnotationLabel(annotation)}
                            </span>
                          </button>
                          
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(annotation);
                                  }}
                                  data-testid={`layer-rename-${annotation.id}`}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Rename</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleVisibility(annotation.id);
                                  }}
                                  data-testid={`layer-visibility-${annotation.id}`}
                                >
                                  {visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{visible ? "Hide" : "Show"}</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleLocked(annotation.id);
                                  }}
                                  data-testid={`layer-lock-${annotation.id}`}
                                >
                                  {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{locked ? "Unlock" : "Lock"}</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteAnnotation(annotation.id);
                                  }}
                                  data-testid={`layer-delete-${annotation.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
