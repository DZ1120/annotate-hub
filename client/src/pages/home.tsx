import { useRef, useCallback } from "react";
import { useAnnotationStore } from "@/lib/annotation-store";
import { Toolbar } from "@/components/toolbar";
import { LayersPanel } from "@/components/layers-panel";
import { PropertiesPanel } from "@/components/properties-panel";
import { AnnotationCanvas } from "@/components/annotation-canvas";

export default function Home() {
  const store = useAnnotationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      <Toolbar store={store} onUpload={triggerUpload} />
      
      <div className="flex-1 flex overflow-hidden">
        <LayersPanel store={store} />
        <AnnotationCanvas store={store} onUploadClick={triggerUpload} />
        {store.selectedAnnotation && <PropertiesPanel store={store} />}
      </div>
    </div>
  );
}
