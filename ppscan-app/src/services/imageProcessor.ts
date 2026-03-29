export interface Point {
  x: number;
  y: number;
}

export async function preprocessImage(imageData: string): Promise<string> {
  try {
    return await enhanceContrastCanvas(await loadImage(imageData));
  } catch (err) {
    console.error('Preprocessing failed:', err);
    return imageData;
  }
}

export async function detectDocument(imageData: string): Promise<{
  detected: boolean;
  corners?: Point[];
  cropped?: string;
}> {
  try {
    const enhanced = await preprocessImage(imageData);
    return { detected: false, cropped: enhanced };
  } catch (err) {
    console.error('Document detection error:', err);
    return { detected: false };
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function enhanceContrastCanvas(img: HTMLImageElement): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let min = 255, max = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (gray < min) min = gray;
      if (gray > max) max = gray;
    }
    
    const range = max - min;
    const factor = range > 10 ? 255 / range : 1.5;
    
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      
      r = r - min;
      g = g - min;
      b = b - min;
      
      if (range > 10) {
        r = r * factor;
        g = g * factor;
        b = b * factor;
      } else {
        r = r * 1.3;
        g = g * 1.3;
        b = b * 1.3;
      }
      
      r = Math.pow(r / 255, 0.9) * 255;
      g = Math.pow(g / 255, 0.9) * 255;
      b = Math.pow(b / 255, 0.9) * 255;
      
      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }
    
    ctx.putImageData(imageData, 0, 0);
    resolve(canvas.toDataURL('image/jpeg', 0.95));
  });
}
