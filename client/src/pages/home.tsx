import { useRef, useCallback } from "react";
import { useAnnotationStore } from "@/lib/annotation-store";
import { Toolbar } from "@/components/toolbar";
import { LayersPanel } from "@/components/layers-panel";
import { PropertiesPanel } from "@/components/properties-panel";
import { AnnotationCanvas } from "@/components/annotation-canvas";
import { useToast } from "@/hooks/use-toast";
import type { Project, Annotation, AnnotationPoint } from "@shared/schema";

export default function Home() {
  const store = useAnnotationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        store.setBackgroundImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = (event) => {
        store.setBackgroundImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [store]);

  const triggerUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleExport = useCallback(() => {
    const { project } = store;
    
    const generateAnnotationHTML = (annotation: Annotation, index: number) => {
      if (annotation.type === "point") {
        const point = annotation as AnnotationPoint;
        return `
          <div class="annotation point" style="
            position: absolute;
            left: ${point.x}px;
            top: ${point.y}px;
            width: ${point.size}px;
            height: ${point.size}px;
            background-color: ${point.color};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: ${point.size * 0.4}px;
            transform: translate(-50%, -50%);
            cursor: ${point.attachedImageUrl ? 'pointer' : 'default'};
            z-index: ${index + 10};
          "
          ${point.attachedImageUrl ? `onclick="showImage('${point.attachedImageUrl}')"` : ''}
          title="${point.label ? `Point ${point.number} - ${point.label}` : `Point ${point.number}`}"
          >
            ${point.number}
            ${point.attachedImageUrl ? `<span style="position: absolute; top: -4px; right: -4px; width: 12px; height: 12px; background: #22c55e; border-radius: 50%; border: 2px solid white;"></span>` : ''}
          </div>
        `;
      }
      
      if (annotation.type === "text") {
        const bgOpacity = annotation.backgroundOpacity ?? 1;
        return `
          <div class="annotation text-note" style="
            position: absolute;
            left: ${annotation.x}px;
            top: ${annotation.y}px;
            width: ${annotation.width}px;
            min-height: ${annotation.height}px;
            background-color: ${bgOpacity > 0 ? annotation.backgroundColor || '#ffffff' : 'transparent'};
            opacity: ${bgOpacity};
            border: ${annotation.borderWidth || 1}px solid ${annotation.borderColor || '#e5e7eb'};
            border-radius: 6px;
            padding: 8px;
            font-size: ${annotation.fontSize}px;
            font-weight: ${annotation.fontWeight || 'normal'};
            color: ${annotation.textColor || '#000000'};
            white-space: pre-wrap;
            word-wrap: break-word;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            z-index: ${index + 10};
          ">
            ${annotation.content || ''}
          </div>
        `;
      }
      
      if (annotation.type === "shape") {
        const { x, y, width, height, strokeColor, strokeWidth, fillColor, fillOpacity, shapeType } = annotation;
        
        let shapeContent = '';
        if (shapeType === "rectangle") {
          shapeContent = `<rect x="${strokeWidth/2}" y="${strokeWidth/2}" width="${width - strokeWidth}" height="${height - strokeWidth}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="${fillColor || strokeColor}" fill-opacity="${fillOpacity}" />`;
        } else if (shapeType === "circle") {
          shapeContent = `<ellipse cx="${width/2}" cy="${height/2}" rx="${(width - strokeWidth)/2}" ry="${(height - strokeWidth)/2}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="${fillColor || strokeColor}" fill-opacity="${fillOpacity}" />`;
        } else if (shapeType === "line") {
          shapeContent = `<line x1="0" y1="${height}" x2="${width}" y2="0" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;
        } else if (shapeType === "arrow") {
          shapeContent = `
            <line x1="0" y1="${height/2}" x2="${width - 10}" y2="${height/2}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
            <polygon points="${width},${height/2} ${width-12},${height/2 - 6} ${width-12},${height/2 + 6}" fill="${strokeColor}" />
          `;
        }
        
        return `
          <svg class="annotation shape" style="
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: ${width}px;
            height: ${height}px;
            overflow: visible;
            z-index: ${index + 10};
          ">
            ${shapeContent}
          </svg>
        `;
      }
      
      return '';
    };

    const annotationsHTML = project.annotations.map((a, i) => generateAnnotationHTML(a, i)).join('\n');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a1a; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { position: relative; display: inline-block; }
    .background-image { display: block; max-width: 100%; height: auto; }
    .annotation { box-sizing: border-box; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; align-items: center; justify-content: center; }
    .modal.active { display: flex; }
    .modal img { max-width: 90%; max-height: 90%; object-fit: contain; }
    .modal-close { position: absolute; top: 20px; right: 30px; color: white; font-size: 40px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <img src="${project.backgroundImage}" alt="Background" class="background-image" />
    ${annotationsHTML}
  </div>
  
  <div class="modal" id="imageModal" onclick="closeModal()">
    <span class="modal-close">&times;</span>
    <img id="modalImage" src="" alt="Preview" />
  </div>

  <script>
    function showImage(src) {
      document.getElementById('modalImage').src = src;
      document.getElementById('imageModal').classList.add('active');
    }
    function closeModal() {
      document.getElementById('imageModal').classList.remove('active');
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  </script>
  
  <!-- Project Data for Re-import -->
  <script type="application/json" id="project-data">
    ${JSON.stringify(project, null, 2)}
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Your annotated image has been exported as HTML.",
    });
  }, [store, toast]);

  const handleImport = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const projectDataElement = doc.getElementById('project-data');
        
        if (projectDataElement) {
          const projectData = JSON.parse(projectDataElement.textContent || '{}') as Project;
          store.importProject(projectData);
          toast({
            title: "Import successful",
            description: "Project has been imported successfully.",
          });
        } else {
          toast({
            title: "Import failed",
            description: "This file does not contain valid project data.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Failed to parse the imported file.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    if (importInputRef.current) {
      importInputRef.current.value = "";
    }
  }, [store, toast]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileUpload}
        className="hidden"
        data-testid="input-file-upload"
      />
      <input
        ref={importInputRef}
        type="file"
        accept=".html"
        onChange={handleImportFile}
        className="hidden"
        data-testid="input-import"
      />
      
      <Toolbar 
        store={store} 
        onUpload={triggerUpload} 
        onChangeBackground={triggerUpload}
        onExport={handleExport}
        onImport={handleImport}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <LayersPanel store={store} />
        <AnnotationCanvas store={store} onUploadClick={triggerUpload} />
        {store.selectedAnnotation && <PropertiesPanel store={store} />}
      </div>
    </div>
  );
}
