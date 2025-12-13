import type { AssetLoader } from '../assetLoader';

export class VercelAssetLoader implements AssetLoader {
  private origin: string;

  constructor(origin: string) {
    this.origin = origin;
  }

  private getUrl(path: string): string {
    return new URL(path, this.origin).toString();
  }

  async loadFont(name: string): Promise<ArrayBuffer> {
    const url = this.getUrl(`/font/${name}`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load font ${name}: ${response.statusText}`);
    }
    return response.arrayBuffer();
  }

  async loadImage(path: string): Promise<ArrayBuffer> {
    const url = this.getUrl(path);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load image ${path}: ${response.statusText}`);
    }
    return response.arrayBuffer();
  }

  async loadText(path: string): Promise<string> {
    const url = this.getUrl(path);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load text ${path}: ${response.statusText}`);
    }
    return response.text();
  }
}
