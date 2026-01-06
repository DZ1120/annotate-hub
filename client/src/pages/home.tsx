import { useRef, useCallback, useState, useEffect } from "react";
import { useAnnotationStore } from "@/lib/annotation-store";
import { Toolbar } from "@/components/toolbar";
import { LayersPanel } from "@/components/layers-panel";
import { PropertiesPanel } from "@/components/properties-panel";
import { AnnotationCanvas } from "@/components/annotation-canvas";
import { useToast } from "@/hooks/use-toast";
import type { Project, Annotation, AnnotationPoint } from "@shared/schema";
import { PdfPageSelector } from "@/components/pdf-page-selector";
import { MapCanvas } from "@/components/map-canvas";
import { Map as MapIcon, Image as ImageIcon } from "lucide-react";

export default function Home() {
  const store = useAnnotationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Resizable left panel state
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    const saved = localStorage.getItem("leftPanelWidth");
    return saved ? parseInt(saved, 10) : 220;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeRef.current) return;

      const delta = e.clientX - resizeRef.current.startX;
      const newWidth = Math.min(400, Math.max(160, resizeRef.current.startWidth + delta));
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        resizeRef.current = null;
        localStorage.setItem("leftPanelWidth", leftPanelWidth.toString());
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, leftPanelWidth]);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = { startX: e.clientX, startWidth: leftPanelWidth };
  }, [leftPanelWidth]);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfSelectorOpen, setPdfSelectorOpen] = useState(false);

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
      setPdfFile(file);
      setPdfSelectorOpen(true);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [store]);

  const handlePdfPageSelect = useCallback((imageDataUrl: string) => {
    store.setBackgroundImage(imageDataUrl);
    setPdfFile(null);
  }, [store]);

  const triggerUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleExport = useCallback(() => {
    const { project } = store;

    // Detect current theme
    const isDark = document.documentElement.classList.contains("dark");
    const themeClass = isDark ? "dark" : "";

    // Build annotations data for JavaScript
    // Map Mode Export
    if (project.mode === 'map') {
      const mapPoints = project.annotations.filter(a => a.type === 'point' && a.lat !== undefined && a.lng !== undefined);
      const pointsJson = JSON.stringify(mapPoints, null, 2);

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name} - Map View</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin=""/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""><\/script>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #map { height: 100vh; width: 100%; }
    .custom-popup .leaflet-popup-content-wrapper { border-radius: 8px; }
    
    /* Image Popup Overlay - Same as Canvas Mode */
    .overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7);
      z-index: 2000;
      align-items: center;
      justify-content: center;
      padding: 40px;
      box-sizing: border-box;
    }
    .overlay.active { display: flex; }
    .popup {
      position: relative;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
      overflow: hidden;
      max-width: calc(100vw - 80px);
      max-height: calc(100vh - 80px);
    }
    .popup-img { 
      display: block;
      max-width: calc(100vw - 80px);
      max-height: calc(100vh - 80px);
      object-fit: contain;
    }
    .close-btn {
      position: absolute; top: 12px; right: 12px;
      width: 32px; height: 32px; border-radius: 50%;
      background: rgba(0,0,0,0.6); color: white; border: none;
      font-size: 20px; font-weight: 300; cursor: pointer; z-index: 10;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    .close-btn:hover { background: rgba(0,0,0,0.8); }
    .img-counter {
      position: absolute; top: 12px; left: 12px;
      padding: 4px 12px; border-radius: 16px;
      background: rgba(0,0,0,0.6); color: white;
      font-size: 13px; z-index: 10;
    }
    .nav-btn {
      position: absolute; top: 50%; transform: translateY(-50%);
      width: 40px; height: 40px; border-radius: 50%;
      background: rgba(0,0,0,0.6); color: white; border: none;
      font-size: 24px; font-weight: 300; cursor: pointer; z-index: 10;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    .nav-btn:hover { background: rgba(0,0,0,0.8); }
    .nav-btn.prev { left: 12px; }
    .nav-btn.next { right: 12px; }
    
    /* Marker popup image thumbnails */
    .thumb-gallery { display: flex; gap: 5px; margin-top: 8px; overflow-x: auto; max-width: 200px; }
    .thumb-img { height: 50px; width: 50px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 2px solid transparent; transition: border-color 0.2s; }
    .thumb-img:hover { border-color: #3b82f6; }
  </style>
</head>
<body>
  <div id="map"></div>
  
  <!-- Image Popup Overlay -->
  <div class="overlay" id="overlay" onclick="closePopup()">
    <div class="popup" id="popup" onclick="event.stopPropagation()">
      <button class="close-btn" onclick="closePopup()">×</button>
      <div class="img-counter" id="imgCounter" style="display:none;">1 / 1</div>
      <button class="nav-btn prev" id="prevBtn" onclick="event.stopPropagation(); prevImage()" style="display:none;">‹</button>
      <button class="nav-btn next" id="nextBtn" onclick="event.stopPropagation(); nextImage()" style="display:none;">›</button>
      <img id="popupImg" class="popup-img" />
    </div>
  </div>

  <script>
    var map = L.map('map').setView([${project.mapCenter?.lat || 40.7128}, ${project.mapCenter?.lng || -74.0060}], ${project.mapZoom || 13});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var points = ${pointsJson};
    var currentImageUrls = [];
    var currentImageIndex = 0;

    // Image popup functions
    function showImages(imageUrls) {
      if (!imageUrls || imageUrls.length === 0) return;
      currentImageUrls = imageUrls;
      currentImageIndex = 0;
      updateImagePopup();
      document.getElementById('overlay').classList.add('active');
    }

    function updateImagePopup() {
      var img = document.getElementById('popupImg');
      var counter = document.getElementById('imgCounter');
      var prevBtn = document.getElementById('prevBtn');
      var nextBtn = document.getElementById('nextBtn');
      
      img.src = currentImageUrls[currentImageIndex];
      img.onerror = function() { this.src = 'https://placehold.co/400x300?text=Image+Load+Error'; };
      
      var hasMultiple = currentImageUrls.length > 1;
      counter.style.display = hasMultiple ? 'block' : 'none';
      counter.innerText = (currentImageIndex + 1) + ' / ' + currentImageUrls.length;
      prevBtn.style.display = hasMultiple ? 'flex' : 'none';
      nextBtn.style.display = hasMultiple ? 'flex' : 'none';
    }

    function prevImage() {
      currentImageIndex = (currentImageIndex - 1 + currentImageUrls.length) % currentImageUrls.length;
      updateImagePopup();
    }

    function nextImage() {
      currentImageIndex = (currentImageIndex + 1) % currentImageUrls.length;
      updateImagePopup();
    }

    function closePopup() { 
      document.getElementById('overlay').classList.remove('active');
      currentImageUrls = [];
      currentImageIndex = 0;
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) { 
      if(e.key === 'Escape') closePopup();
      if(currentImageUrls.length > 1) {
        if(e.key === 'ArrowLeft') prevImage();
        if(e.key === 'ArrowRight') nextImage();
      }
    });

    // Create markers with popups
    points.forEach(function(p) {
      if (p.lat && p.lng) {
        var marker = L.marker([p.lat, p.lng]).addTo(map);
        var popupContent = "<b>Point " + p.number + "</b>";
        if (p.label) popupContent += "<br>" + p.label;
        
        if (p.attachedImageUrls && p.attachedImageUrls.length > 0) {
          var urlsJson = JSON.stringify(p.attachedImageUrls).replace(/'/g, "\\\\'");
          popupContent += "<div class='thumb-gallery'>";
          p.attachedImageUrls.forEach(function(url, i) {
            popupContent += "<img src='" + url + "' class='thumb-img' onclick='showImages(" + urlsJson + ")' />";
          });
          popupContent += "</div>";
        }
        marker.bindPopup(popupContent, { maxWidth: 250 });
      }
    });

    // Fit bounds to show all points
    if (points.length > 0) {
       var group = new L.featureGroup(points.map(function(p) { return L.marker([p.lat, p.lng]); }));
       map.fitBounds(group.getBounds().pad(0.1));
    }
  <\/script>
  
  <!-- Project Data for Re-import -->
  <script type="application/json" id="project-data">
    ${JSON.stringify(project, null, 2)}
  <\/script>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}-map-export.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Map Exported", description: "Saved as HTML file." });
      return;
    }

    const annotationsData = project.annotations.map((a, i) => {
      const base: Record<string, any> = {
        id: String(a.id),
        type: a.type,
        visible: true,
        selected: false,
        index: i,
        label: (a as any).label || ""
      };

      if (a.type === "point") {
        const p = a as AnnotationPoint;
        const images = p.attachedImageUrls || (p.attachedImageUrl ? [p.attachedImageUrl] : []);
        return {
          ...base,
          x: p.x,
          y: p.y,
          size: p.size,
          color: p.color,
          number: p.number,
          hasImage: images.length > 0,
          imageUrls: images
        };
      } else if (a.type === "text") {
        const t = a as import("@shared/schema").TextNote;
        return {
          ...base,
          x: t.x,
          y: t.y,
          width: t.width,
          height: t.height,
          content: t.content || "",
          fontSize: t.fontSize,
          fontWeight: t.fontWeight || "normal",
          textColor: t.textColor || "#000000",
          backgroundColor: t.backgroundColor || "#ffffff",
          backgroundOpacity: t.backgroundOpacity ?? 1,
          borderWidth: t.borderWidth || 1,
          borderColor: t.borderColor || "#e5e7eb"
        };
      } else if (a.type === "shape") {
        const s = a as import("@shared/schema").Shape;
        return {
          ...base,
          x: s.x,
          y: s.y,
          width: s.width,
          height: s.height,
          shapeType: s.shapeType,
          strokeColor: s.strokeColor,
          strokeWidth: s.strokeWidth,
          fillColor: s.fillColor,
          fillOpacity: s.fillOpacity
        };
      }
      return base;
    });

    // Escape special characters for embedding JSON safely in a template string
    const annotationsJson = JSON.stringify(annotationsData)
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\${/g, '\\${');

    const htmlContent = `<!DOCTYPE html>
<html lang="en" class="${themeClass}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name.replace(/"/g, '&quot;')}</title>
  <style>
    :root {
      --background: hsl(0, 0%, 96%);
      --foreground: hsl(0, 0%, 13%);
      --border: hsl(0, 0%, 89%);
      --card: hsl(0, 0%, 100%);
      --card-foreground: hsl(0, 0%, 13%);
      --sidebar: hsl(0, 0%, 98%);
      --sidebar-foreground: hsl(0, 0%, 20%);
      --sidebar-border: hsl(0, 0%, 91%);
      --primary: hsl(211, 100%, 50%);
      --primary-foreground: hsl(0, 0%, 100%);
      --muted: hsl(0, 0%, 93%);
      --muted-foreground: hsl(0, 0%, 45%);
      --accent: hsl(211, 60%, 95%);
      --accent-foreground: hsl(211, 100%, 45%);
    }
    
    .dark {
      --background: hsl(0, 0%, 7%);
      --foreground: hsl(0, 0%, 93%);
      --border: hsl(0, 0%, 18%);
      --card: hsl(0, 0%, 11%);
      --card-foreground: hsl(0, 0%, 93%);
      --sidebar: hsl(0, 0%, 11%);
      --sidebar-foreground: hsl(0, 0%, 80%);
      --sidebar-border: hsl(0, 0%, 18%);
      --primary: hsl(211, 100%, 55%);
      --primary-foreground: hsl(0, 0%, 100%);
      --muted: hsl(0, 0%, 15%);
      --muted-foreground: hsl(0, 0%, 55%);
      --accent: hsl(211, 50%, 15%);
      --accent-foreground: hsl(211, 100%, 65%);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: var(--background); 
      color: var(--foreground);
      min-height: 100vh; 
      display: flex;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Left Sidebar - Resizable */
    .layers-panel {
      width: 220px;
      min-width: 150px;
      max-width: 500px;
      background: rgba(var(--card), 0.95);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      height: 100vh;
      z-index: 100;
      backdrop-filter: blur(4px);
      position: relative;
      flex-shrink: 0;
    }
    
    /* Resize handle */
    .resize-handle {
      position: absolute;
      top: 0;
      right: 0;
      width: 4px;
      height: 100%;
      cursor: col-resize;
      z-index: 10;
      transition: background-color 0.2s;
    }
    .resize-handle:hover {
      background: var(--primary);
      opacity: 0.5;
    }
    .resize-handle.resizing {
      background: var(--primary);
      opacity: 1;
    }
    .resize-handle-indicator {
      position: absolute;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      width: 4px;
      height: 48px;
      border-radius: 2px;
      transition: all 0.2s;
      background: transparent;
    }
    .resize-handle:hover .resize-handle-indicator,
    .resize-handle.resizing .resize-handle-indicator {
      background: var(--primary);
      opacity: 0.7;
    }
    
    .panel-header {
      padding: 10px;
      border-bottom: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .panel-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted-foreground);
    }
    
    .anno-count {
      background: var(--muted);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 10px;
      color: var(--muted-foreground);
    }

    /* Multi-select toggle and actions area */
    .header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 28px;
    }
    
    /* Button styles mimicking shadcn/ui */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      line-height: 1;
      cursor: pointer;
      transition: all 0.15s;
      border: none;
      background: transparent;
      color: var(--foreground);
      padding: 0 12px;
      height: 28px;
    }
    .btn:hover { background: var(--muted); }
    .btn.active { background: var(--muted); color: var(--foreground); }
    .btn-icon { padding: 0; width: 28px; height: 28px; }
    
    .btn svg { width: 14px; height: 14px; }
    .btn span { margin-left: 6px; }

    /* Layers List */
    .layers-list { 
      flex: 1; 
      overflow-y: auto; 
      padding: 8px;
    }
    .layers-list::-webkit-scrollbar { width: 6px; }
    .layers-list::-webkit-scrollbar-track { background: transparent; }
    .layers-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    
    .layer-item {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 8px;
      border-radius: 6px;
      margin-bottom: 2px;
      transition: all 0.15s;
      position: relative;
    }
    .layer-item:hover { background: var(--muted); }
    .layer-item.selected { background: var(--accent); }
    .layer-item.hidden { opacity: 0.5; }
    
    /* Multi-select styling */
    .layer-item.multi-selected {
      background: rgba(59, 130, 246, 0.2); 
      box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.5);
    }
    
    /* Layer content wrapper */
    .layer-content {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }
    
    /* Icons */
    .layer-icon { width: 16px; height: 16px; flex-shrink: 0; color: var(--foreground); }
    .grip-icon { width: 16px; height: 16px; color: var(--muted-foreground); cursor: grab; }
    
    /* Label */
    .layer-label { 
      flex: 1; 
      font-size: 14px; 
      white-space: nowrap; 
      overflow: hidden; 
      text-overflow: ellipsis; 
    }
    
    /* Hover Actions */
    .layer-actions {
      display: flex;
      align-items: center;
      gap: 2px;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .layer-item:hover .layer-actions { opacity: 1; }
    
    .action-btn {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      cursor: pointer;
      color: var(--foreground);
      background: transparent;
      border: none;
    }
    .action-btn:hover { background: var(--muted); }
    .action-btn svg { width: 12px; height: 12px; }
    
    /* Checkbox */
    .checkbox {
      width: 16px; height: 16px;
      border: 1px solid var(--border);
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--card);
    }
    .checkbox.checked { background: var(--primary); border-color: var(--primary); color: white; }
    .checkbox svg { width: 12px; height: 12px; stroke-width: 3; }
    
    /* Main Canvas Area - Match annotation-canvas.tsx */
    .main-area {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: var(--background);
      background-image: 
        linear-gradient(var(--border) 1px, transparent 1px),
        linear-gradient(90deg, var(--border) 1px, transparent 1px);
      background-size: 20px 20px;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }
    
    /* Background image positioned with transform */
    .bg-container {
      position: absolute;
      left: 0;
      top: 0;
      transform-origin: 0 0;
    }
    
    .bg-img {
      display: block;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -webkit-user-drag: none;
    }
    
    /* Annotations */
    .anno {
      position: absolute;
      pointer-events: all;
    }
    
    .anno-point {
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.1s;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    
    .anno-point:hover {
      transform: scale(1.1);
      filter: brightness(1.1);
    }
    
    .has-img-indicator {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 12px;
      height: 12px;
      background: #22c55e;
      border-radius: 50%;
      border: 2px solid white;
    }
    
    .anno-text {
      background: white;
      border: 1px solid #e5e7eb;
      padding: 8px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    .anno-shape svg {
      overflow: visible;
    }
    
    /* Popup - Match main app design */
    .overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.3);
      z-index: 2000000;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }
    .overlay.active { display: flex; }
    .popup {
      position: relative;
      background: var(--card);
      border-radius: 8px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      overflow: hidden;
      max-width: calc(100vw - 80px);
      max-height: calc(100vh - 80px);
    }
    .popup-img { 
      display: block;
      max-width: calc(100vw - 80px);
      max-height: calc(100vh - 80px);
      object-fit: contain;
    }
    .close-btn {
      position: absolute; top: 12px; right: 12px;
      width: 32px; height: 32px; border-radius: 50%;
      background: rgba(0,0,0,0.6); color: white; border: none;
      font-size: 20px; font-weight: 300; cursor: pointer; z-index: 10;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    .close-btn:hover { background: rgba(0,0,0,0.8); }
    .img-counter {
      position: absolute; top: 12px; left: 12px;
      padding: 4px 12px; border-radius: 16px;
      background: rgba(0,0,0,0.6); color: white;
      font-size: 13px; z-index: 10;
    }
    .nav-btn {
      position: absolute; top: 50%; transform: translateY(-50%);
      width: 40px; height: 40px; border-radius: 50%;
      background: rgba(0,0,0,0.6); color: white; border: none;
      font-size: 24px; font-weight: 300; cursor: pointer; z-index: 10;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    .nav-btn:hover { background: rgba(0,0,0,0.8); }
    .nav-btn.prev { left: 12px; }
    .nav-btn.next { right: 12px; }
  </style>
</head>
<body>
  <div class="layers-panel">
    <div class="panel-header">
      <div class="header-top">
        <span class="panel-title">LAYERS</span>
        <span class="anno-count" id="totalCount">0</span>
      </div>
      
      <div class="header-actions">
        <!-- Select Toggle -->
         <button class="btn" id="selectToggle" onclick="toggleMultiSelect()">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
           <span id="selectLabel">Select</span>
         </button>
         
         <div id="batchActions" style="display:none; align-items:center; gap:4px; margin-left: 4px;">
            <button class="btn" style="padding: 0 8px;" onclick="toggleSelectAll()" id="selectAllBtn">All</button>
            <span id="selCount" style="font-size:11px; color:var(--muted-foreground); margin-left:4px;">0 selected</span>
            
            <div style="width: 1px; height: 16px; background: var(--border); margin: 0 4px;"></div>

            <button class="btn btn-icon" onclick="batchShow()" title="Show Selected">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="btn btn-icon" onclick="batchHide()" title="Hide Selected">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
         </div>
      </div>
    </div>
    
    <div class="layers-list" id="layersList"></div>
    
    <!-- Resize handle -->
    <div class="resize-handle" id="resizeHandle">
      <div class="resize-handle-indicator"></div>
    </div>
  </div>

  <div class="main-area" id="mainArea">
    <div class="bg-container" id="bgContainer">
      <img src="${project.backgroundImage}" class="bg-img" id="bgImg" draggable="false" />
    </div>
    <div id="annoCont"></div>
  </div>

  <div class="overlay" id="overlay" onclick="closePopup()">
    <div class="popup" id="popup" onclick="event.stopPropagation()">
      <button class="close-btn" onclick="closePopup()">×</button>
      <div class="img-counter" id="imgCounter" style="display:none;">1 / 1</div>
      <button class="nav-btn prev" id="prevBtn" onclick="event.stopPropagation(); prevImage()" style="display:none;">‹</button>
      <button class="nav-btn next" id="nextBtn" onclick="event.stopPropagation(); nextImage()" style="display:none;">›</button>
      <img id="popupImg" class="popup-img" />
    </div>
  </div>

  <script>
    var annotations = ${annotationsJson};
    var bgSettings = {
      rotation: ${project.backgroundSettings?.rotation || 0},
      scale: ${project.backgroundSettings?.scale || 1},
      offsetX: ${project.backgroundSettings?.offsetX || 0},
      offsetY: ${project.backgroundSettings?.offsetY || 0}
    };
    var isMultiSelectMode = false;
    var selectedIds = new Set();
    var currentImageUrls = [];
    var currentImageIndex = 0;
    
    // Zoom and pan state
    var zoom = 1;
    var panX = 0;
    var panY = 0;
    var isPanning = false;
    var lastMouseX = 0;
    var lastMouseY = 0;
    var bgImageSize = { width: 0, height: 0 };
    
    // Resize state
    var isResizing = false;
    var layersPanel = document.querySelector('.layers-panel');
    var resizeHandle = document.getElementById('resizeHandle');
    
    // Resize handlers
    resizeHandle.addEventListener('mousedown', function(e) {
      isResizing = true;
      resizeHandle.classList.add('resizing');
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
      if (isResizing) {
        var newWidth = e.clientX;
        if (newWidth >= 150 && newWidth <= 500) {
          layersPanel.style.width = newWidth + 'px';
        }
      }
    });
    
    document.addEventListener('mouseup', function() {
      if (isResizing) {
        isResizing = false;
        resizeHandle.classList.remove('resizing');
      }
    });
    
    // Initialize on load
    var bgImg = document.getElementById('bgImg');
    var mainArea = document.getElementById('mainArea');
    var bgContainer = document.getElementById('bgContainer');
    
    bgImg.onload = function() {
      bgImageSize.width = bgImg.naturalWidth;
      bgImageSize.height = bgImg.naturalHeight;
      centerBackground();
      render();
    };
    
    // Center background in viewport
    function centerBackground() {
      if (!bgImageSize.width) return;
      
      var container = mainArea.getBoundingClientRect();
      // Use base image dimensions (bgSettings.scale will be applied in transform)
      var imgWidth = bgImageSize.width;
      var imgHeight = bgImageSize.height;
      
      // Calculate zoom to fit background + bgSettings.scale with padding (90% of viewport)
      var effectiveWidth = imgWidth * bgSettings.scale;
      var effectiveHeight = imgHeight * bgSettings.scale;
      var scaleX = (container.width * 0.9) / effectiveWidth;
      var scaleY = (container.height * 0.9) / effectiveHeight;
      var fitZoom = Math.min(scaleX, scaleY, 1);
      
      // Center the image (offset multiplied by zoom to match editor logic)
      var scaledWidth = effectiveWidth * fitZoom;
      var scaledHeight = effectiveHeight * fitZoom;
      panX = (container.width - scaledWidth) / 2 + bgSettings.offsetX * fitZoom;
      panY = (container.height - scaledHeight) / 2 + bgSettings.offsetY * fitZoom;
      zoom = fitZoom;
      
      updateTransform();
    }
    
    // Update background transform
    function updateTransform() {
      // Apply all transformations: translate, scale (including bgSettings.scale), and rotate
      var totalScale = zoom * bgSettings.scale;
      bgContainer.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + totalScale + ') rotate(' + bgSettings.rotation + 'deg)';
      bgContainer.style.transformOrigin = '0 0';
    }
    
    // Wheel zoom
    mainArea.addEventListener('wheel', function(e) {
      e.preventDefault();
      
      var rect = mainArea.getBoundingClientRect();
      var mouseX = e.clientX - rect.left;
      var mouseY = e.clientY - rect.top;
      
      var delta = e.deltaY > 0 ? -0.1 : 0.1;
      var oldZoom = zoom;
      var newZoom = Math.max(0.1, Math.min(5, oldZoom + delta));
      
      // Calculate world point under mouse
      var worldX = (mouseX - panX) / oldZoom;
      var worldY = (mouseY - panY) / oldZoom;
      
      // Keep same world point under mouse
      panX = mouseX - worldX * newZoom;
      panY = mouseY - worldY * newZoom;
      zoom = newZoom;
      
      updateTransform();
      renderCanvas();
    }, { passive: false });
    
    // Pan with middle click or space+drag
    mainArea.addEventListener('mousedown', function(e) {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        isPanning = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        e.preventDefault();
      }
    });
    
    mainArea.addEventListener('mousemove', function(e) {
      if (isPanning) {
        var dx = e.clientX - lastMouseX;
        var dy = e.clientY - lastMouseY;
        panX += dx;
        panY += dy;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        updateTransform();
        renderCanvas();
      }
    });
    
    mainArea.addEventListener('mouseup', function(e) {
      isPanning = false;
    });
    
    mainArea.addEventListener('mouseleave', function(e) {
      isPanning = false;
    });

    // Helper: Icons
    function getIcon(type, shapeType) {
       if (type === 'point') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
       if (type === 'text') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>';
       if (type === 'shape') {
          if (shapeType === 'rectangle') return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>';
          return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
       }
       return '';
    }

    // Helper: Label logic
    function getLabel(a) {
       if (a.type === 'point') return a.label ? ('Point ' + a.number + ' - ' + a.label) : ('Point ' + a.number);
       if (a.type === 'text') return a.label || (a.content ? a.content.substring(0, 20) : 'Text Note');
       var sName = a.shapeType ? (a.shapeType.charAt(0).toUpperCase() + a.shapeType.slice(1)) : 'Shape';
       return a.label || sName;
    }

    function toggleMultiSelect() {
       isMultiSelectMode = !isMultiSelectMode;
       if (!isMultiSelectMode) selectedIds.clear();
       render();
    }
    
    function toggleSelectAll() {
       var allSelected = selectedIds.size === annotations.length && annotations.length > 0;
       if (allSelected) {
         selectedIds.clear();
       } else {
         annotations.forEach(function(a) { selectedIds.add(a.id); });
       }
       render();
    }

    function toggleIdSelect(id) {
       if (selectedIds.has(id)) selectedIds.delete(id);
       else selectedIds.add(id);
       render();
    }
    
    function batchShow() {
       annotations.forEach(function(a) { if (selectedIds.has(a.id)) a.visible = true; });
       render();
    }
    
    function batchHide() {
       annotations.forEach(function(a) { if (selectedIds.has(a.id)) a.visible = false; });
       render();
    }

    function toggleVis(id) {
       var a = annotations.find(function(x) { return x.id == id; });
       if (a) a.visible = !a.visible;
       render();
    }

    function render() {
       // Header updates
       document.getElementById('totalCount').innerText = annotations.length;
       var btn = document.getElementById('selectToggle');
       var label = document.getElementById('selectLabel');
       var batchDiv = document.getElementById('batchActions');
       
       if (isMultiSelectMode) {
          btn.classList.add('active');
          label.innerText = 'Done';
          batchDiv.style.display = 'flex';
          
          var allSelBtn = document.getElementById('selectAllBtn');
          var allSelected = annotations.length > 0 && selectedIds.size === annotations.length;
          allSelBtn.innerText = allSelected ? 'Deselect' : 'All';
          document.getElementById('selCount').innerText = selectedIds.size + ' selected';
       } else {
          btn.classList.remove('active');
          label.innerText = 'Select';
          batchDiv.style.display = 'none';
       }

       // List
       var list = document.getElementById('layersList');
       var html = '';
       
       annotations.forEach(function(a) {
          var activeClass = (isMultiSelectMode && selectedIds.has(a.id)) ? 'multi-selected' : (a.selected ? 'selected' : '');
          var opacityClass = a.visible ? '' : 'hidden';
          
          html += '<div class="layer-item ' + activeClass + ' ' + opacityClass + '" onclick="handleItemClick(\\'' + a.id + '\\', event)">';
          
          if (isMultiSelectMode) {
             var checked = selectedIds.has(a.id) ? 'checked' : '';
             html += '<div class="checkbox ' + checked + '" onclick="event.stopPropagation(); toggleIdSelect(\\'' + a.id + '\\')">' + 
                     (checked ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>' : '') + 
                     '</div>';
          } else {
             html += '<div class="grip-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg></div>';
          }
          
          html += '<div class="layer-content">';
          html += '<div class="layer-icon">' + getIcon(a.type, a.shapeType) + '</div>';
          html += '<span class="layer-label">' + getLabel(a) + '</span>';
          html += '</div>';
          
          html += '<div class="layer-actions">';
          html += '<button class="action-btn" title="' + (a.visible ? 'Hide' : 'Show') + '" onclick="event.stopPropagation(); toggleVis(\\'' + a.id + '\\')">';
          html += a.visible ? 
             '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' : 
             '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
          html += '</button>';
          html += '</div>';
          html += '</div>';
       });
       
       list.innerHTML = html;
       renderCanvas();
    }
    
    function handleItemClick(id, e) {
       if (isMultiSelectMode) {
          toggleIdSelect(id);
       } else {
          annotations.forEach(function(a) { a.selected = (a.id === id); });
          render();
       }
    }
    
    function renderCanvas() {
       var cont = document.getElementById('annoCont');
       var html = '';
       
       for (var j = 0; j < annotations.length; j++) {
        var a = annotations[j];
        if (!a.visible) continue;
        
        // Convert annotation coords to screen coords (accounting for bgSettings offset)
        var worldX = bgSettings.offsetX + a.x;
        var worldY = bgSettings.offsetY + a.y;
        var screenX = worldX * zoom + panX;
        var screenY = worldY * zoom + panY;
        
        if (a.type === 'point') {
          var scaledSize = a.size * zoom;
          html += '<div class="anno anno-point" onclick="showImage(\\'' + a.id + '\\')" style="left:' + screenX + 'px;top:' + screenY + 'px;width:' + scaledSize + 'px;height:' + scaledSize + 'px;background:' + a.color + ';font-size:' + (scaledSize*0.4) + 'px;transform:translate(-50%,-50%)">' +
            a.number +
            (a.hasImage ? '<div class="has-img-indicator"></div>' : '') +
          '</div>';
        } else if (a.type === 'text') {
           var scaledWidth = a.width * zoom;
           var scaledHeight = a.height * zoom;
           var scaledFontSize = a.fontSize * zoom;
           html += '<div class="anno anno-text" style="left:' + screenX + 'px;top:' + screenY + 'px;width:' + scaledWidth + 'px;min-height:' + scaledHeight + 'px;background:' + a.backgroundColor + ';opacity:' + a.backgroundOpacity + ';border:' + a.borderWidth + 'px solid ' + a.borderColor + ';color:' + a.textColor + ';font-size:' + scaledFontSize + 'px;font-weight:' + a.fontWeight + '">' + (a.content || '') + '</div>';
        } else if (a.type === 'shape') {
           var scaledW = a.width * zoom;
           var scaledH = a.height * zoom;
           html += '<div class="anno anno-shape" style="left:' + screenX + 'px;top:' + screenY + 'px;width:' + scaledW + 'px;height:' + scaledH + 'px"><svg width="100%" height="100%">';
           
           if (a.shapeType === 'rectangle') {
             html += '<rect x="' + (a.strokeWidth/2) + '" y="' + (a.strokeWidth/2) + '" width="' + Math.max(0, scaledW - a.strokeWidth) + '" height="' + Math.max(0, scaledH - a.strokeWidth) + '" stroke="' + a.strokeColor + '" stroke-width="' + a.strokeWidth + '" fill="' + (a.fillOpacity > 0 ? (a.fillColor || a.strokeColor) : 'none') + '" fill-opacity="' + a.fillOpacity + '" />';
           } else if (a.shapeType === 'circle') {
             html += '<ellipse cx="' + (scaledW/2) + '" cy="' + (scaledH/2) + '" rx="' + Math.max(0, (scaledW - a.strokeWidth)/2) + '" ry="' + Math.max(0, (scaledH - a.strokeWidth)/2) + '" stroke="' + a.strokeColor + '" stroke-width="' + a.strokeWidth + '" fill="' + (a.fillOpacity > 0 ? (a.fillColor || a.strokeColor) : 'none') + '" fill-opacity="' + a.fillOpacity + '" />';
           }
           
           html += '</svg></div>';
        }
       }
       cont.innerHTML = html;
    }

    function showImage(id) {
      var a = annotations.find(function(x) { return x.id == id; });
      if (a && a.imageUrls && a.imageUrls.length > 0) {
        currentImageUrls = a.imageUrls;
        currentImageIndex = 0;
        updateImagePopup();
        document.getElementById('overlay').classList.add('active');
      }
    }
    
    function updateImagePopup() {
      var img = document.getElementById('popupImg');
      var counter = document.getElementById('imgCounter');
      var prevBtn = document.getElementById('prevBtn');
      var nextBtn = document.getElementById('nextBtn');
      
      img.src = currentImageUrls[currentImageIndex];
      img.onerror = function() { this.src = 'https://placehold.co/400x300?text=Image+Load+Error'; };
      
      var hasMultiple = currentImageUrls.length > 1;
      counter.style.display = hasMultiple ? 'block' : 'none';
      counter.innerText = (currentImageIndex + 1) + ' / ' + currentImageUrls.length;
      prevBtn.style.display = hasMultiple ? 'flex' : 'none';
      nextBtn.style.display = hasMultiple ? 'flex' : 'none';
    }
    
    function prevImage() {
      currentImageIndex = (currentImageIndex - 1 + currentImageUrls.length) % currentImageUrls.length;
      updateImagePopup();
    }
    
    function nextImage() {
      currentImageIndex = (currentImageIndex + 1) % currentImageUrls.length;
      updateImagePopup();
    }
    
    function closePopup() { 
      document.getElementById('overlay').classList.remove('active');
      currentImageUrls = [];
      currentImageIndex = 0;
    }
    
    document.addEventListener('keydown', function(e) { 
      if(e.key === 'Escape') closePopup();
      if(currentImageUrls.length > 1) {
        if(e.key === 'ArrowLeft') prevImage();
        if(e.key === 'ArrowRight') nextImage();
      }
    });
    
    // Initialize if image already loaded
    if (bgImg.complete && bgImg.naturalWidth) {
      bgImageSize.width = bgImg.naturalWidth;
      bgImageSize.height = bgImg.naturalHeight;
      centerBackground();
      render();
    }
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

    toast({ title: "Export successful" });
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

      <div className="flex-1 flex overflow-hidden relative">
        {/* Resizable left panel */}
        <div style={{ width: leftPanelWidth }} className="flex-shrink-0 relative">
          <LayersPanel store={store} width={leftPanelWidth} />
          {/* Resize handle */}
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize group z-10 hover:bg-primary/50 transition-colors"
            onMouseDown={startResize}
          >
            <div className={`absolute top-1/2 -translate-y-1/2 right-0 w-1 h-12 rounded-full transition-all ${isResizing ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/70'}`} />
          </div>
        </div>

        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1100] bg-card rounded-full border shadow-sm p-1 flex items-center gap-1">
          <button
            onClick={() => store.setMode("canvas")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${store.project.mode === "canvas" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
          >
            <ImageIcon className="h-4 w-4" />
            Canvas
          </button>
          <button
            onClick={() => store.setMode("map")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${store.project.mode === "map" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
          >
            <MapIcon className="h-4 w-4" />
            Map
          </button>
        </div>

        {store.project.mode === "map" ? <MapCanvas store={store} /> : <AnnotationCanvas store={store} onUploadClick={triggerUpload} />}

        {/* Properties panel is absolutely positioned to not affect canvas layout */}
        {store.selectedAnnotation && (
          <div className="absolute top-0 right-0 h-full z-[1050]">
            <PropertiesPanel store={store} />
          </div>
        )}
      </div>
      <PdfPageSelector
        file={pdfFile}
        open={pdfSelectorOpen}
        onOpenChange={setPdfSelectorOpen}
        onSelect={handlePdfPageSelect}
      />
    </div>
  );
}
