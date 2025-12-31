import { 
  Upload, 
  MousePointer2, 
  Circle as CircleIcon, 
  Type, 
  Square, 
  Minus, 
  MoveRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ToolType, AnnotationStore } from "@/lib/annotation-store";
import { ThemeToggle } from "./theme-toggle";

interface ToolbarProps {
  store: AnnotationStore;
  onUpload: () => void;
}

const tools: { id: ToolType; icon: typeof MousePointer2; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select (V)" },
  { id: "point", icon: CircleIcon, label: "Add Point (P)" },
  { id: "text", icon: Type, label: "Add Text (T)" },
  { id: "rectangle", icon: Square, label: "Rectangle (R)" },
  { id: "circle", icon: CircleIcon, label: "Circle (C)" },
  { id: "line", icon: Minus, label: "Line (L)" },
  { id: "arrow", icon: MoveRight, label: "Arrow (A)" },
];

export function Toolbar({ store, onUpload }: ToolbarProps) {
  const { selectedTool, setSelectedTool, project, setZoom, clearProject } = store;

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 gap-4 z-30 flex-shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onUpload}
              data-testid="button-upload"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upload image or PDF</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-1">
          {tools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={selectedTool === tool.id ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setSelectedTool(tool.id)}
                  className={selectedTool === tool.id ? "bg-accent" : ""}
                  data-testid={`button-tool-${tool.id}`}
                >
                  <tool.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tool.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(project.zoom - 0.1)}
                data-testid="button-zoom-out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>
          
          <span className="text-sm font-mono min-w-[4rem] text-center" data-testid="text-zoom-level">
            {Math.round(project.zoom * 100)}%
          </span>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(project.zoom + 0.1)}
                data-testid="button-zoom-in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoom(1)}
                data-testid="button-zoom-fit"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fit to Screen</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearProject}
              data-testid="button-clear"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear All</TooltipContent>
        </Tooltip>

        <ThemeToggle />
      </div>
    </header>
  );
}
