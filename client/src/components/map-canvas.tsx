
import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Map as MapIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AnnotationStore } from "@/lib/annotation-store";
import type { AnnotationPoint } from "@shared/schema";

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Initial Center: NYC
const DEFAULT_CENTER = { lat: 40.7128, lng: -74.0060 };
const DEFAULT_ZOOM = 13;

interface MapCanvasProps {
    store: AnnotationStore;
}

// Component to handle map clicks
function MapClickEvents({ store }: { store: AnnotationStore }) {
    useMapEvents({
        click(e) {
            if (store.selectedTool === "point") {
                const point = store.createPoint(0, 0, e.latlng.lat, e.latlng.lng);
                store.addAnnotation(point);
            } else {
                store.setSelectedAnnotationId(null);
            }
        },
    });

    return null;
}

// Component to sync map view with store
function MapViewSync({ store }: { store: AnnotationStore }) {
    const map = useMap();
    const movingRef = useRef(false);

    // Sync from Map to Store
    useMapEvents({
        moveend: () => {
            if (!movingRef.current) {
                store.setMapSettings(map.getCenter(), map.getZoom());
            }
        }
    });

    // Sync from Store to Map (Initial load or programmatic change)
    useEffect(() => {
        if (store.project.mapCenter && store.project.mapZoom) {
            const currentCenter = map.getCenter();
            const currentZoom = map.getZoom();

            // Only fly if significantly different to avoid jitter
            if (currentCenter.distanceTo(store.project.mapCenter) > 10 || currentZoom !== store.project.mapZoom) {
                movingRef.current = true;
                map.flyTo(store.project.mapCenter, store.project.mapZoom, {
                    duration: 1.5
                });
                map.once('moveend', () => { movingRef.current = false; });
            }
        }
    }, [store.project.id]); // Only reset on project load

    return null;
}

export function MapCanvas({ store }: MapCanvasProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const mapRef = useRef<L.Map>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                const newCenter = { lat: parseFloat(lat), lng: parseFloat(lon) };
                const newZoom = 15;

                store.setMapSettings(newCenter, newZoom);

                // Directly fly to new location if map instance is available
                if (mapRef.current) {
                    mapRef.current.flyTo(newCenter, newZoom);
                }
            }
        } catch (error) {
            console.error("Geocoding failed:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const mapPoints = store.project.annotations.filter(a => a.type === "point" && a.lat !== undefined && a.lng !== undefined) as AnnotationPoint[];

    // Determine cursor based on selected tool
    const cursorStyle = store.selectedTool === "point" ? "crosshair" : "grab";

    return (
        <div className="relative w-full h-full bg-slate-100" style={{ cursor: cursorStyle }}>
            {/* Search Control */}
            <div className="absolute top-4 left-4 right-16 z-[1000] max-w-md shadow-lg">
                <form onSubmit={handleSearch} className="flex gap-2 bg-card p-2 rounded-lg border">
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search address (e.g., Times Square, NYC)..."
                        className="flex-1 h-9 bg-background"
                    />
                    <Button type="submit" size="sm" disabled={isSearching}>
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                </form>
            </div>

            <MapContainer
                center={store.project.mapCenter || DEFAULT_CENTER}
                zoom={store.project.mapZoom || DEFAULT_ZOOM}
                className="w-full h-full"
                zoomControl={false}
                ref={mapRef}
                style={{ cursor: cursorStyle }}
            >
                <ZoomControl position="bottomright" />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickEvents store={store} />
                <MapViewSync store={store} />

                {mapPoints.map(point => (
                    <Marker
                        key={point.id}
                        position={[point.lat!, point.lng!]}
                        eventHandlers={{
                            click: (e) => {
                                store.setSelectedAnnotationId(point.id);
                                // Prevent map click event (which would deselect)
                                e.originalEvent.stopPropagation();
                            }
                        }}
                        opacity={store.isVisible(point.id) ? 1 : 0.5}
                    >
                        <Popup>
                            <div className="text-sm font-medium">Point {point.number}</div>
                            {point.label && <div className="text-xs text-muted-foreground">{point.label}</div>}
                            {point.attachedImageUrls && point.attachedImageUrls.length > 0 && (
                                <div className="mt-2 flex gap-1 overflow-x-auto max-w-[200px] scrollbar-hide">
                                    {point.attachedImageUrls.map((url, i) => (
                                        <img key={i} src={url} className="h-10 w-10 object-cover rounded border" />
                                    ))}
                                </div>
                            )}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Instructions Overlay */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-card/90 backdrop-blur px-3 py-1.5 rounded-md border text-xs text-muted-foreground shadow-sm pointer-events-none">
                {store.selectedTool === "point" ? (
                    <span className="flex items-center gap-2"><MapIcon className="h-3 w-3" /> Click map to place point</span>
                ) : (
                    <span>⚠️ Map mode only supports <b>Point</b> markers. Select Point Tool to add.</span>
                )}
            </div>
        </div>
    );
}
