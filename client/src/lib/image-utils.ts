/**
 * Image compression utilities for optimizing file sizes
 */

export interface CompressImageOptions {
    quality?: number; // 0.0 to 1.0, default 0.7
    maxWidth?: number; // Maximum width in pixels, default 1920
    maxHeight?: number; // Maximum height in pixels, default 1920
    mimeType?: string; // Output MIME type, default 'image/jpeg'
}

/**
 * Compress an image file to reduce file size while maintaining acceptable quality
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise resolving to compressed image data URL
 */
export async function compressImage(
    file: File,
    options: CompressImageOptions = {}
): Promise<string> {
    const {
        quality = 0.7,
        maxWidth = 1920,
        maxHeight = 1920,
        mimeType = 'image/jpeg'
    } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onerror = () => reject(new Error('Failed to read file'));

        reader.onload = (event) => {
            const img = new Image();

            img.onerror = () => reject(new Error('Failed to load image'));

            img.onload = () => {
                try {
                    // Calculate new dimensions while maintaining aspect ratio
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth || height > maxHeight) {
                        const aspectRatio = width / height;

                        if (width > height) {
                            width = maxWidth;
                            height = width / aspectRatio;
                        } else {
                            height = maxHeight;
                            width = height * aspectRatio;
                        }
                    }

                    // Create canvas and draw resized image
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'));
                        return;
                    }

                    // Use high-quality image rendering
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    // Draw the image
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to compressed data URL
                    const compressedDataUrl = canvas.toDataURL(mimeType, quality);

                    // Log compression results
                    const originalSize = file.size;
                    const compressedSize = Math.round((compressedDataUrl.length * 3) / 4); // Approximate base64 size
                    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

                    console.log(`Image compressed: ${file.name}`);
                    console.log(`  Original: ${(originalSize / 1024).toFixed(1)}KB (${img.width}x${img.height})`);
                    console.log(`  Compressed: ${(compressedSize / 1024).toFixed(1)}KB (${Math.round(width)}x${Math.round(height)})`);
                    console.log(`  Reduction: ${compressionRatio}%`);

                    resolve(compressedDataUrl);
                } catch (error) {
                    reject(error);
                }
            };

            img.src = event.target?.result as string;
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Compress multiple image files concurrently
 * @param files - Array of image files to compress
 * @param options - Compression options
 * @returns Promise resolving to array of compressed image data URLs
 */
export async function compressImages(
    files: File[],
    options: CompressImageOptions = {}
): Promise<string[]> {
    return Promise.all(files.map(file => compressImage(file, options)));
}
