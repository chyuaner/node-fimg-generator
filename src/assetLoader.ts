export interface AssetLoader {
  loadFont(name: string): Promise<ArrayBuffer>;
  loadImage(path: string): Promise<ArrayBuffer>;
  loadText(path: string): Promise<string>;
}


export class CloudflareAssetLoader implements AssetLoader {
  private assetsFetcher: Fetcher | null;

  constructor(assetsFetcher: Fetcher | null = null) {
    this.assetsFetcher = assetsFetcher;
  }

  async loadFont(name: string): Promise<ArrayBuffer> {
    // In Cloudflare Workers with Assets binding, we can fetch from the assets binding
    // Or if public assets are served relative to the worker, we can fetch from current origin
    // For simplicity with 'assets' binding (if configured) or static assets:
    // If 'ASSETS' binding is available, use it. Otherwise, assume public url.
    // However, in a worker, we might not have 'location.origin'.
    
    // Strategy: Try to use binding if provided.
    if (this.assetsFetcher) {
        const response = await this.assetsFetcher.fetch(`http://assets/font/${name}`);
        if (!response.ok) {
            throw new Error(`Failed to load font ${name}: ${response.statusText}`);
        }
        return response.arrayBuffer();
    }
    
    // Fallback or specific logic if needed. 
    // Ideally we should inject the origin or use a known base URL.
    // For now, assuming relative fetch might work if mapped, but standard workers don't support relative fetch without base.
    // We will rely on the caller to provide a valid fetcher or handle this.
    throw new Error("CloudflareAssetLoader requires a Fetcher binding for assets or logic to fetch from URL");
  }

  async loadImage(path: string): Promise<ArrayBuffer> {
     if (this.assetsFetcher) {
        const response = await this.assetsFetcher.fetch(`http://assets/${path}`);
        if (!response.ok) {
            throw new Error(`Failed to load image ${path}: ${response.statusText}`);
        }
        return response.arrayBuffer();
    }
    throw new Error("CloudflareAssetLoader requires a Fetcher binding for assets");
  }

  async loadText(path: string): Promise<string> {
     if (this.assetsFetcher) {
        const response = await this.assetsFetcher.fetch(`http://assets/${path}`);
        if (!response.ok) {
            throw new Error(`Failed to load text ${path}: ${response.statusText}`);
        }
        return response.text();
    }
    throw new Error("CloudflareAssetLoader requires a Fetcher binding for assets");
  }
}

export class NodeAssetLoader implements AssetLoader {
  async loadFont(name: string): Promise<ArrayBuffer> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const filePath = path.join(process.cwd(), 'public', 'font', name);
    const buffer = await fs.readFile(filePath);
    return buffer.buffer as ArrayBuffer;
  }

  async loadImage(relativePath: string): Promise<ArrayBuffer> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const filePath = path.join(process.cwd(), 'public', relativePath);
    const buffer = await fs.readFile(filePath);
    return buffer.buffer as ArrayBuffer;
  }

  async loadText(relativePath: string): Promise<string> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const filePath = path.join(process.cwd(), 'public', relativePath);
    return fs.readFile(filePath, 'utf-8');
  }
}
