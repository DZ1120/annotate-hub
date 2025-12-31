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
  Trash2,
  MapPin,
  ImageIcon,
  Download,
  FileUp,
  Settings
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import type { ToolType, AnnotationStore } from "@/lib/annotation-store";
import { ThemeToggle } from "./theme-toggle";

interface ToolbarProps {
  store: AnnotationStore;
  onUpload: () => void;
  onChangeBackground: () => void;
  onExport: () => void;
  onImport: () => void;
}

const tools: { id: ToolType; icon: typeof MousePointer2; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select (V)" },
  { id: "point", icon: MapPin, label: "Add Point (P)" },
  { id: "text", icon: Type, label: "Add Text (T)" },
  { id: "rectangle", icon: Square, label: "Rectangle (R)" },
  { id: "circle", icon: CircleIcon, label: "Circle (C)" },
  { id: "line", icon: Minus, label: "Line (L)" },
  { id: "arrow", icon: MoveRight, label: "Arrow (A)" },
];

export function Toolbar({ store, onUpload, onChangeBackground, onExport, onImport }: ToolbarProps) {
  const { selectedTool, setSelectedTool, project, setZoom, clearProject, setDefaultPointSettings } = store;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const defaultSettings = project.defaultPointSettings || { size: 32, color: "#3b82f6" };

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 gap-4 z-30 flex-shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        {!project.backgroundImage ? (
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
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onChangeBackground}
                data-testid="button-change-background"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Change Image
              </Button>
            </TooltipTrigger>
            <TooltipContent>Change background image</TooltipContent>
          </Tooltip>
        )}

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

        <Separator orientation="vertical" className="h-6" />

        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="button-point-defaults">
              <Settings className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Default Point Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide">
                  Default Size: {defaultSettings.size}px
                </Label>
                <Slider
                  value={[defaultSettings.size]}
                  onValueChange={([value]) => setDefaultPointSettings({ size: value })}
                  min={16}
                  max={64}
                  step={2}
                  data-testid="slider-default-point-size"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide">
                  Default Color
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={defaultSettings.color}
                    onChange={(e) => setDefaultPointSettings({ color: e.target.value })}
                    className="w-10 h-10 rounded-md border cursor-pointer"
                    data-testid="input-default-point-color"
                  />
                  <Input
                    value={defaultSettings.color}
                    onChange={(e) => setDefaultPointSettings({ color: e.target.value })}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                New points will use these settings. You can still edit individual points after placing them.
              </p>
            </div>
          </DialogContent>
        </Dialog>
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
              onClick={onImport}
              data-testid="button-import"
            >
              <FileUp className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import Project</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onExport}
              disabled={!project.backgroundImage}
              data-testid="button-export"
            >
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export as HTML</TooltipContent>
        </Tooltip>

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
