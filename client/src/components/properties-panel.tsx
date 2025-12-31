import { useState, useRef } from "react";
import { X, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import type { AnnotationStore } from "@/lib/annotation-store";
import type { AnnotationPoint, TextNote, Shape } from "@shared/schema";

interface PropertiesPanelProps {
  store: AnnotationStore;
}

export function PropertiesPanel({ store }: PropertiesPanelProps) {
  const { selectedAnnotation, updateAnnotation, deleteAnnotation, setSelectedAnnotationId } = store;
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (!selectedAnnotation) {
    return (
      <aside className="w-72 border-l bg-card p-4 flex-shrink-0 overflow-y-auto">
        <h2 className="text-base font-semibold mb-4">Properties</h2>
        <p className="text-sm text-muted-foreground">
          Select an annotation to edit its properties
        </p>
      </aside>
    );
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedAnnotation.type === "point") {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateAnnotation(selectedAnnotation.id, {
          attachedImageUrl: event.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
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
          data-testid="input-point-number"
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
            data-testid="input-point-color"
          />
          <Input
            value={point.color}
            onChange={(e) => updateAnnotation(point.id, { color: e.target.value })}
            className="flex-1 font-mono text-sm"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Attached Image
        </Label>
        {point.attachedImageUrl ? (
          <div className="space-y-2">
            <div className="relative rounded-md overflow-hidden border">
              <img
                src={point.attachedImageUrl}
                alt="Attached"
                className="w-full h-32 object-cover"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => updateAnnotation(point.id, { attachedImageUrl: undefined })}
              data-testid="button-remove-attached-image"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Image
            </Button>
          </div>
        ) : (
          <div
            onClick={() => imageInputRef.current?.click()}
            className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover-elevate transition-colors"
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click to upload image
            </p>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              data-testid="input-attach-image"
            />
          </div>
        )}
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
          data-testid="textarea-note-content"
        />
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
          data-testid="slider-font-size"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide">
          Width
        </Label>
        <Input
          type="number"
          value={text.width}
          onChange={(e) => updateAnnotation(text.id, { width: parseInt(e.target.value) || 100 })}
          min={50}
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
          Stroke Color
        </Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={shape.strokeColor}
            onChange={(e) => updateAnnotation(shape.id, { strokeColor: e.target.value })}
            className="w-10 h-10 rounded-md border cursor-pointer"
            data-testid="input-shape-stroke-color"
          />
          <Input
            value={shape.strokeColor}
            onChange={(e) => updateAnnotation(shape.id, { strokeColor: e.target.value })}
            className="flex-1 font-mono text-sm"
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
              data-testid="input-shape-fill-color"
            />
            <Input
              value={shape.fillColor || shape.strokeColor}
              onChange={(e) => updateAnnotation(shape.id, { fillColor: e.target.value })}
              className="flex-1 font-mono text-sm"
            />
          </div>
        </div>
      )}
    </>
  );

  return (
    <aside className="w-72 border-l bg-card p-4 flex-shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-base font-semibold capitalize">
          {selectedAnnotation.type} Properties
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedAnnotationId(null)}
          data-testid="button-close-properties"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

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
          data-testid="button-delete-annotation"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
    </aside>
  );
}
