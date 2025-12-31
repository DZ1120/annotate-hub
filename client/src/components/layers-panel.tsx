import { useState } from "react";
import { MapPin, Type, Square, Minus, MoveRight, Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, Circle, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AnnotationStore } from "@/lib/annotation-store";
import type { Annotation } from "@shared/schema";

interface LayersPanelProps {
  store: AnnotationStore;
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

export function LayersPanel({ store }: LayersPanelProps) {
  const { 
    project, 
    selectedAnnotationId, 
    setSelectedAnnotationId,
    toggleVisibility,
    toggleLocked,
    isVisible,
    isLocked,
    moveAnnotation,
    updateAnnotation,
  } = store;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

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

  return (
    <aside className="w-60 border-r bg-card flex flex-col flex-shrink-0">
      <div className="p-4 border-b">
        <h2 className="text-base font-semibold">Layers</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {project.annotations.length} annotation{project.annotations.length !== 1 ? "s" : ""}
        </p>
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

                return (
                  <li key={annotation.id} className="group">
                    <div
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors ${
                        isSelected ? "bg-accent" : "hover-elevate"
                      } ${!visible ? "opacity-50" : ""}`}
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
                          <button
                            onClick={() => setSelectedAnnotationId(annotation.id)}
                            className="flex items-center gap-2 flex-1 min-w-0 text-left text-sm"
                            data-testid={`layer-item-${annotation.id}`}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">
                              {getAnnotationLabel(annotation)}
                            </span>
                          </button>
                          
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ visibility: "visible" }}>
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
                                    moveAnnotation(annotation.id, "up");
                                  }}
                                  disabled={index === 0}
                                  data-testid={`layer-move-up-${annotation.id}`}
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Move Up</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveAnnotation(annotation.id, "down");
                                  }}
                                  disabled={index === project.annotations.length - 1}
                                  data-testid={`layer-move-down-${annotation.id}`}
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Move Down</TooltipContent>
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
