
import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
).toString();

interface PdfPageSelectorProps {
    file: File | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (imageDataUrl: string) => void;
}

export function PdfPageSelector({ file, open, onOpenChange, onSelect }: PdfPageSelectorProps) {
    const [pages, setPages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!file || !open) return;

        const loadPdf = async () => {
            setLoading(true);
            setError(null);
            setPages([]);

            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const pageImages: string[] = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 }); // Good quality thumbnail
                    const canvas = document.createElement("canvas");
                    const context = canvas.getContext("2d");
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    if (context) {
                        await page.render({ canvasContext: context, viewport, canvas } as any).promise;
                        pageImages.push(canvas.toDataURL("image/png"));
                    }
                }

                setPages(pageImages);
            } catch (err) {
                console.error("Failed to load PDF:", err);
                setError("Failed to load PDF file. Please ensure it is a valid PDF.");
            } finally {
                setLoading(false);
            }
        };

        loadPdf();
    }, [file, open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Page to Import</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center flex-col gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Rendering PDF pages...</p>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex items-center justify-center text-destructive">
                        {error}
                    </div>
                ) : (
                    <ScrollArea className="flex-1 pr-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                            {pages.map((imgSrc, index) => (
                                <button
                                    key={index}
                                    className="group relative aspect-[3/4] border rounded-lg overflow-hidden hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                                    onClick={() => {
                                        onSelect(imgSrc);
                                        onOpenChange(false);
                                    }}
                                >
                                    <img
                                        src={imgSrc}
                                        alt={`Page ${index + 1}`}
                                        className="w-full h-full object-contain bg-white"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white py-1 text-xs text-center">
                                        Page {index + 1}
                                    </div>
                                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </DialogContent>
        </Dialog>
    );
}
