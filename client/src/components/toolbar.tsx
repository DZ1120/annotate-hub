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
  Settings,
  Move,
  RotateCcw,
  Info
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
  const { selectedTool, setSelectedTool, project, setZoom, clearProject, setDefaultPointSettings, isEditingBackground, toggleEditingBackground, updateBackgroundSettings } = store;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const defaultSettings = project.defaultPointSettings || { size: 32, color: "#3b82f6" };
  const bgSettings = project.backgroundSettings || { rotation: 0, scale: 1, offsetX: 0, offsetY: 0 };

  return (
    <header className="h-12 border-b border-border/60 bg-card/95 backdrop-blur-sm flex items-center justify-between px-3 gap-3 z-30 flex-shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-1">
          <img
            src={import.meta.env.MODE === "production" ? "/annotate-hub/logo.png" : "/logo.png"}
            alt="AnnotateHub"
            className="h-8 w-8 rounded-full object-cover shadow-sm"
          />
          <span className="text-sm font-semibold tracking-tight hidden sm:inline">AnnotateHub</span>
        </div>

        <Separator orientation="vertical" className="h-6" />

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
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onChangeBackground}
                  data-testid="button-change-background"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Change
                </Button>
              </TooltipTrigger>
              <TooltipContent>Change background image</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isEditingBackground ? "default" : "outline"}
                  size="sm"
                  onClick={toggleEditingBackground}
                  data-testid="button-edit-background"
                >
                  <Move className="h-4 w-4 mr-2" />
                  {isEditingBackground ? "Done" : "Edit BG"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isEditingBackground ? "Exit background editing mode" : "Edit background: move, rotate, scale"}
              </TooltipContent>
            </Tooltip>

            {isEditingBackground && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateBackgroundSettings({ rotation: bgSettings.rotation - 90 })}
                      data-testid="button-rotate-left"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rotate Left 90°</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Background scale controls */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateBackgroundSettings({ scale: Math.max(0.1, bgSettings.scale - 0.1) })}
                      data-testid="button-bg-scale-down"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Shrink Background</TooltipContent>
                </Tooltip>

                <span className="text-xs font-mono min-w-[3rem] text-center text-muted-foreground">
                  {Math.round(bgSettings.scale * 100)}%
                </span>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => updateBackgroundSettings({ scale: Math.min(5, bgSettings.scale + 0.1) })}
                      data-testid="button-bg-scale-up"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Enlarge Background</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6 mx-1" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateBackgroundSettings({ rotation: 0, scale: 1, offsetX: 0, offsetY: 0 })}
                      data-testid="button-reset-background"
                    >
                      Reset
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset background to original</TooltipContent>
                </Tooltip>
              </>
            )}
          </>
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

        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>

        <Tooltip>
          <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-about">
                  <Info className="h-4 w-4" />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>About AnnotateHub</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Features</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A powerful image annotation tool for adding interactive points, text notes, and geometric shapes to images and PDFs.
                    Supports multi-layer management, custom styling, image attachments, and HTML export for easy sharing.
                  </p>
                </div>

                <Separator />

                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">Developed by:</span> Yihang Zhu
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Version:</span> 1.1.0
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">GitHub:</span>{" "}
                    <a href="https://github.com/DZ1120/annotate-hub" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                      View Source
                    </a>
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <TooltipContent>About</TooltipContent>
        </Tooltip>
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
                onClick={() => {
                  // Use the centerBackground function if available
                  if ((store as any).centerBackground) {
                    (store as any).centerBackground();
                  } else {
                    setZoom(1);
                  }
                }}
                data-testid="button-zoom-fit"
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Center Background</TooltipContent>
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
