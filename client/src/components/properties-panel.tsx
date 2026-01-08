import { useRef } from "react";
import { X, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AnnotationStore } from "@/lib/annotation-store";
import type { AnnotationPoint, TextNote, Shape } from "@shared/schema";
import { compressImages } from "@/lib/image-utils";

interface PropertiesPanelProps {
  store: AnnotationStore;
}

export function PropertiesPanel({ store }: PropertiesPanelProps) {
  const { selectedAnnotation, updateAnnotation, deleteAnnotation, setSelectedAnnotationId, isLocked } = store;
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (!selectedAnnotation) {
    return (
      <aside className="w-64 border-l border-border/60 bg-card/95 backdrop-blur-sm p-3 flex-shrink-0 overflow-y-auto">
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Properties</h2>
        <p className="text-xs text-muted-foreground">
          Select an annotation to edit its properties
        </p>
      </aside>
    );
  }

  const locked = isLocked(selectedAnnotation.id);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || selectedAnnotation.type !== "point") return;

    try {
      // Compress all images before storing
      console.log(`Compressing ${files.length} image(s)...`);
      const compressedImageUrls = await compressImages(Array.from(files));

      // Get current images again to ensure we have fresh state
      const currentPoint = store.project.annotations.find(a => a.id === selectedAnnotation.id) as AnnotationPoint | undefined;
      if (currentPoint) {
        const currentImages = currentPoint.attachedImageUrls || (currentPoint.attachedImageUrl ? [currentPoint.attachedImageUrl] : []);
        updateAnnotation(selectedAnnotation.id, {
          attachedImageUrls: [...currentImages, ...compressedImageUrls],
          attachedImageUrl: undefined, // Clear legacy field
        });
      }
    } catch (error) {
      console.error('Failed to compress images:', error);
      alert('Failed to upload images. Please try again.');
    }

    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    if (selectedAnnotation.type !== "point") return;
    const point = selectedAnnotation as AnnotationPoint;
    const images = point.attachedImageUrls || (point.attachedImageUrl ? [point.attachedImageUrl] : []);
    const newImages = images.filter((_, i) => i !== index);
    updateAnnotation(point.id, {
      attachedImageUrls: newImages.length > 0 ? newImages : undefined,
      attachedImageUrl: undefined,
    });
  };

  const renderPointProperties = (point: AnnotationPoint) => (
    <>
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Point Number
        </Label>
        <Input
          type="number"
          value={point.number}
          onChange={(e) => updateAnnotation(point.id, { number: parseInt(e.target.value) || 1 })}
          min={1}
          disabled={locked}
          data-testid="input-point-number"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Label
        </Label>
        <Input
          value={point.label || ""}
          onChange={(e) => updateAnnotation(point.id, { label: e.target.value || undefined })}
          placeholder="Optional label..."
          disabled={locked}
          data-testid="input-point-label"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Size: {point.size}px
        </Label>
        <Slider
          value={[point.size]}
          onValueChange={([value]) => updateAnnotation(point.id, { size: value })}
          min={16}
          max={64}
          step={2}
          disabled={locked}
          data-testid="slider-point-size"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Color
        </Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={point.color}
            onChange={(e) => updateAnnotation(point.id, { color: e.target.value })}
            className="w-10 h-10 rounded-md border cursor-pointer"
            disabled={locked}
            data-testid="input-point-color"
          />
          <Input
            value={point.color}
            onChange={(e) => updateAnnotation(point.id, { color: e.target.value })}
            className="flex-1 font-mono text-sm"
            disabled={locked}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Attached Images
        </Label>

        {/* Display existing images */}
        {(() => {
          const images = point.attachedImageUrls || (point.attachedImageUrl ? [point.attachedImageUrl] : []);
          return images.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {images.map((url, index) => (
                  <div key={index} className="relative group rounded-md overflow-hidden border">
                    <img
                      src={url}
                      alt={`Attached ${index + 1}`}
                      className="w-full h-20 object-cover"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      disabled={locked}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600 disabled:opacity-50"
                    >
                      ×
                    </button>
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-xs">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => !locked && imageInputRef.current?.click()}
                disabled={locked}
              >
                <Upload className="h-4 w-4 mr-2" />
                Add More Images
              </Button>
            </div>
          ) : (
            <div
              onClick={() => !locked && imageInputRef.current?.click()}
              className={`border-2 border-dashed rounded-md p-6 text-center ${locked ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-accent/50"} transition-colors`}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload images<br />(Multiple allowed)
              </p>
            </div>
          );
        })()}

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
          disabled={locked}
          data-testid="input-attach-image"
        />
      </div>
    </>
  );

  const renderTextProperties = (text: TextNote) => (
    <>
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Content
        </Label>
        <Textarea
          value={text.content}
          onChange={(e) => updateAnnotation(text.id, { content: e.target.value })}
          placeholder="Enter text..."
          className="min-h-[100px] resize-none"
          disabled={locked}
          data-testid="textarea-note-content"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Text Color
        </Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={text.textColor || "#000000"}
            onChange={(e) => updateAnnotation(text.id, { textColor: e.target.value })}
            className="w-10 h-10 rounded-md border cursor-pointer"
            disabled={locked}
            data-testid="input-text-color"
          />
          <Input
            value={text.textColor || "#000000"}
            onChange={(e) => updateAnnotation(text.id, { textColor: e.target.value })}
            className="flex-1 font-mono text-sm"
            disabled={locked}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Font Size: {text.fontSize}px
        </Label>
        <Slider
          value={[text.fontSize]}
          onValueChange={([value]) => updateAnnotation(text.id, { fontSize: value })}
          min={10}
          max={32}
          step={1}
          disabled={locked}
          data-testid="slider-font-size"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Font Weight
        </Label>
        <Select
          value={text.fontWeight || "normal"}
          onValueChange={(value) => updateAnnotation(text.id, { fontWeight: value as "normal" | "bold" })}
          disabled={locked}
        >
          <SelectTrigger data-testid="select-font-weight">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="bold">Bold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Background Color
        </Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={text.backgroundColor || "#ffffff"}
            onChange={(e) => updateAnnotation(text.id, { backgroundColor: e.target.value })}
            className="w-10 h-10 rounded-md border cursor-pointer"
            disabled={locked}
            data-testid="input-bg-color"
          />
          <Input
            value={text.backgroundColor || "#ffffff"}
            onChange={(e) => updateAnnotation(text.id, { backgroundColor: e.target.value })}
            className="flex-1 font-mono text-sm"
            disabled={locked}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Background Opacity: {Math.round((text.backgroundOpacity ?? 1) * 100)}%
        </Label>
        <Slider
          value={[(text.backgroundOpacity ?? 1) * 100]}
          onValueChange={([value]) => updateAnnotation(text.id, { backgroundOpacity: value / 100 })}
          min={0}
          max={100}
          step={5}
          disabled={locked}
          data-testid="slider-bg-opacity"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Border Color
        </Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={text.borderColor || "#e5e7eb"}
            onChange={(e) => updateAnnotation(text.id, { borderColor: e.target.value })}
            className="w-10 h-10 rounded-md border cursor-pointer"
            disabled={locked}
            data-testid="input-border-color"
          />
          <Input
            value={text.borderColor || "#e5e7eb"}
            onChange={(e) => updateAnnotation(text.id, { borderColor: e.target.value })}
            className="flex-1 font-mono text-sm"
            disabled={locked}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Border Width: {text.borderWidth ?? 1}px
        </Label>
        <Slider
          value={[text.borderWidth ?? 1]}
          onValueChange={([value]) => updateAnnotation(text.id, { borderWidth: value })}
          min={0}
          max={4}
          step={1}
          disabled={locked}
          data-testid="slider-border-width"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Width
        </Label>
        <Input
          type="number"
          value={text.width}
          onChange={(e) => updateAnnotation(text.id, { width: parseInt(e.target.value) || 100 })}
          min={50}
          disabled={locked}
          data-testid="input-text-width"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Height
        </Label>
        <Input
          type="number"
          value={text.height}
          onChange={(e) => updateAnnotation(text.id, { height: parseInt(e.target.value) || 50 })}
          min={30}
          disabled={locked}
          data-testid="input-text-height"
        />
      </div>
    </>
  );

  const renderShapeProperties = (shape: Shape) => (
    <>
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Shape Type
        </Label>
        <p className="text-sm capitalize">{shape.shapeType}</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Label
        </Label>
        <Input
          value={shape.label || ""}
          onChange={(e) => updateAnnotation(shape.id, { label: e.target.value || undefined })}
          placeholder="Optional label..."
          disabled={locked}
          data-testid="input-shape-label"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Position X
        </Label>
        <Input
          type="number"
          value={Math.round(shape.x)}
          onChange={(e) => updateAnnotation(shape.id, { x: parseInt(e.target.value) || 0 })}
          disabled={locked}
          data-testid="input-shape-x"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Position Y
        </Label>
        <Input
          type="number"
          value={Math.round(shape.y)}
          onChange={(e) => updateAnnotation(shape.id, { y: parseInt(e.target.value) || 0 })}
          disabled={locked}
          data-testid="input-shape-y"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Width
        </Label>
        <Input
          type="number"
          value={Math.round(shape.width)}
          onChange={(e) => updateAnnotation(shape.id, { width: parseInt(e.target.value) || 10 })}
          min={10}
          disabled={locked}
          data-testid="input-shape-width"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Height
        </Label>
        <Input
          type="number"
          value={Math.round(shape.height)}
          onChange={(e) => updateAnnotation(shape.id, { height: parseInt(e.target.value) || 10 })}
          min={10}
          disabled={locked}
          data-testid="input-shape-height"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Stroke Color
        </Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={shape.strokeColor}
            onChange={(e) => updateAnnotation(shape.id, { strokeColor: e.target.value })}
            className="w-10 h-10 rounded-md border cursor-pointer"
            disabled={locked}
            data-testid="input-shape-stroke-color"
          />
          <Input
            value={shape.strokeColor}
            onChange={(e) => updateAnnotation(shape.id, { strokeColor: e.target.value })}
            className="flex-1 font-mono text-sm"
            disabled={locked}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Stroke Width: {shape.strokeWidth}px
        </Label>
        <Slider
          value={[shape.strokeWidth]}
          onValueChange={([value]) => updateAnnotation(shape.id, { strokeWidth: value })}
          min={1}
          max={8}
          step={1}
          disabled={locked}
          data-testid="slider-stroke-width"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Fill Opacity: {Math.round(shape.fillOpacity * 100)}%
        </Label>
        <Slider
          value={[shape.fillOpacity * 100]}
          onValueChange={([value]) => updateAnnotation(shape.id, { fillOpacity: value / 100 })}
          min={0}
          max={100}
          step={5}
          disabled={locked}
          data-testid="slider-fill-opacity"
        />
      </div>

      {shape.fillOpacity > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide">
            Fill Color
          </Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={shape.fillColor || shape.strokeColor}
              onChange={(e) => updateAnnotation(shape.id, { fillColor: e.target.value })}
              className="w-10 h-10 rounded-md border cursor-pointer"
              disabled={locked}
              data-testid="input-shape-fill-color"
            />
            <Input
              value={shape.fillColor || shape.strokeColor}
              onChange={(e) => updateAnnotation(shape.id, { fillColor: e.target.value })}
              className="flex-1 font-mono text-sm"
              disabled={locked}
            />
          </div>
        </div>
      )}
    </>
  );

  return (
    <aside className="w-64 border-l border-border/60 bg-card/95 backdrop-blur-sm p-3 flex-shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {selectedAnnotation.type}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setSelectedAnnotationId(null)}
          data-testid="button-close-properties"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {locked && (
        <div className="mb-3 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
          Locked. Unlock to edit.
        </div>
      )}

      <div className="space-y-4">
        {selectedAnnotation.type === "point" && renderPointProperties(selectedAnnotation)}
        {selectedAnnotation.type === "text" && renderTextProperties(selectedAnnotation)}
        {selectedAnnotation.type === "shape" && renderShapeProperties(selectedAnnotation)}

        <Separator />

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => deleteAnnotation(selectedAnnotation.id)}
          disabled={locked}
          data-testid="button-delete-annotation"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
    </aside>
  );
}
