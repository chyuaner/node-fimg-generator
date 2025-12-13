import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AssetLoader } from '../assetLoader';

export class VercelNodeAssetLoader implements AssetLoader {
  private publicDir: string;

  constructor(origin: string) {
    // In Vercel Node.js runtime, assets are typically in process.cwd() + /public
    this.publicDir = join(process.cwd(), 'public');
  }

  private getFilePath(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return join(this.publicDir, cleanPath);
  }

  async loadFont(name: string): Promise<ArrayBuffer> {
    const filePath = this.getFilePath(`font/${name}`);
    try {
      const buffer = await readFile(filePath);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    } catch (e) {
      throw new Error(`Failed to load font ${name} from ${filePath}: ${e}`);
    }
  }

  async loadImage(path: string): Promise<ArrayBuffer> {
    if (path.startsWith('http')) {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to load external image ${path}`);
        return response.arrayBuffer();
    }

    const filePath = this.getFilePath(path);
    try {
      const buffer = await readFile(filePath);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    } catch (e) {
      throw new Error(`Failed to load image ${path} from ${filePath}: ${e}`);
    }
  }

  async loadText(path: string): Promise<string> {
    const filePath = this.getFilePath(path);
    try {
      return await readFile(filePath, 'utf-8');
    } catch (e) {
        throw new Error(`Failed to load text ${path} from ${filePath}: ${e}`);
    }
  }
}
