import { Circle, Type, Square, Minus, MoveRight, Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      return Circle;
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
  switch (annotation.type) {
    case "point":
      return `Point ${annotation.number}`;
    case "text":
      return annotation.content.slice(0, 20) || "Text Note";
    case "shape":
      return `${annotation.shapeType.charAt(0).toUpperCase() + annotation.shapeType.slice(1)}`;
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
  } = store;

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

                return (
                  <li key={annotation.id} className="group">
                    <div
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors ${
                        isSelected ? "bg-accent" : "hover-elevate"
                      } ${!visible ? "opacity-50" : ""}`}
                    >
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
