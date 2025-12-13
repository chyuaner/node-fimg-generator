import type { AssetLoader } from '../assetLoader';

export class VercelAssetLoader implements AssetLoader {
  private origin: string;

  constructor(origin: string) {
    this.origin = origin;
  }

  private getUrl(path: string): string {
    // In Vercel Edge Runtime (Next.js), we use new URL(..., import.meta.url) to access bundled assets.
    // This allows the bundler to include the files and access them locally without network fetch.
    return new URL(path, import.meta.url).toString();
  }

  async loadFont(name: string): Promise<ArrayBuffer> {
    // Webpack needs static analysis. We map known fonts explicitly.
    let url: URL;
    
    // Explicitly map fonts to ensure they are bundled.
    // Adjust path: src/core/loaders -> ../../../public/font
    switch (name) {
      case 'NotoSansTC-Medium.ttf':
        url = new URL('../../../public/font/NotoSansTC-Medium.ttf', import.meta.url);
        break;
      case 'Lobster-Regular.ttf':
        url = new URL('../../../public/font/Lobster-Regular.ttf', import.meta.url);
        break;
      default:
        // Try a semi-dynamic approach if the specific font isn't listed, 
        // though this risks Webpack missing it.
        try {
            url = new URL(`../../../public/font/${name}`, import.meta.url);
        } catch (e) {
             throw new Error(`Font ${name} is not statically mapped and dynamic resolution failed.`);
        }
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load font ${name}: ${response.statusText}`);
    }
    return response.arrayBuffer();
  }

  async loadImage(path: string): Promise<ArrayBuffer> {
     if (path.startsWith('http')) {
         const response = await fetch(path);
         if (!response.ok) throw new Error(`Failed to load external image ${path}`);
         return response.arrayBuffer();
     }

     // Use semi-dynamic import for images inside public
     // Webpack can support `../../../public/${path}` if path is simple enough.
     // Remove leading slash for cleaner join
     const cleanPath = path.startsWith('/') ? path.slice(1) : path;
     const url = new URL(`../../../public/${cleanPath}`, import.meta.url);
     
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load image ${path}: ${response.statusText}`);
    }
    return response.arrayBuffer();
  }

  async loadText(path: string): Promise<string> {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const url = new URL(`../../../public/${cleanPath}`, import.meta.url);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load text ${path}: ${response.statusText}`);
    }
    return response.text();
  }
}
