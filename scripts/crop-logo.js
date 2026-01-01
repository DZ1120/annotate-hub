const sharp = require('sharp');
const path = require('path');

async function cropLogo() {
  const inputPath = path.join(__dirname, '..', 'DZ.png');
  const outputPath = path.join(__dirname, '..', 'client', 'public', 'logo.png');
  const faviconPath = path.join(__dirname, '..', 'client', 'public', 'favicon.png');
  
  try {
    // Get image metadata first
    const metadata = await sharp(inputPath).metadata();
    console.log('Original size:', metadata.width, 'x', metadata.height);
    
    // The logo is in the center, approximately 1/3 of the image
    // Let's extract the center portion
    const logoSize = Math.min(metadata.width, metadata.height) / 3;
    const left = Math.floor((metadata.width - logoSize) / 2);
    const top = Math.floor((metadata.height - logoSize) / 2);
    
    // Extract and resize the logo
    await sharp(inputPath)
      .extract({
        left: left,
        top: top,
        width: Math.floor(logoSize),
        height: Math.floor(logoSize)
      })
      .resize(256, 256) // Good size for logo
      .png()
      .toFile(outputPath);
    
    console.log('Logo saved to:', outputPath);
    
    // Create favicon (smaller)
    await sharp(inputPath)
      .extract({
        left: left,
        top: top,
        width: Math.floor(logoSize),
        height: Math.floor(logoSize)
      })
      .resize(64, 64)
      .png()
      .toFile(faviconPath);
    
    console.log('Favicon saved to:', faviconPath);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

cropLogo();

