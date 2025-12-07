export interface AssetLoader {
  loadFont(name: string): Promise<ArrayBuffer>;
  loadImage(path: string): Promise<ArrayBuffer>;
}
