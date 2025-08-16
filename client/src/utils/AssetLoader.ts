import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

export class AssetLoader {
  private static instance: AssetLoader | null = null;
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private ktx2Loader: KTX2Loader;
  private cache = new Map<string, Promise<any>>();
  private compressionSupport: {
    ktx2: boolean;
    draco: boolean;
    meshopt: boolean;
  } = {
    ktx2: false,
    draco: false,
    meshopt: false
  };

  constructor(renderer: THREE.WebGLRenderer) {
    // Set up GLTF loader with all compression support
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.ktx2Loader = new KTX2Loader();
    
    this.initializeLoaders(renderer);
  }

  static getInstance(renderer?: THREE.WebGLRenderer): AssetLoader {
    if (!AssetLoader.instance) {
      if (!renderer) {
        throw new Error('AssetLoader requires a renderer for first initialization');
      }
      AssetLoader.instance = new AssetLoader(renderer);
    }
    return AssetLoader.instance;
  }

  private async initializeLoaders(renderer: THREE.WebGLRenderer) {
    console.log('🔧 Initializing asset loaders with compression support...');
    
    try {
      // Initialize KTX2 loader
      this.ktx2Loader.setTranscoderPath('/assets/libs/basis/');
      this.ktx2Loader.detectSupport(renderer);
      this.compressionSupport.ktx2 = true;
      console.log('✅ KTX2 texture compression support enabled');
    } catch (error) {
      console.warn('⚠️ KTX2 support not available, falling back to traditional textures');
    }

    try {
      // Initialize Draco loader
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('/assets/libs/draco/');
      this.gltfLoader.setDRACOLoader(dracoLoader);
      this.compressionSupport.draco = true;
      console.log('✅ Draco mesh compression support enabled');
    } catch (error) {
      console.warn('⚠️ Draco support not available');
    }

    try {
      // Initialize Meshopt decoder
      this.gltfLoader.setMeshoptDecoder(MeshoptDecoder);
      this.compressionSupport.meshopt = true;
      console.log('✅ Meshopt optimization support enabled');
    } catch (error) {
      console.warn('⚠️ Meshopt support not available');
    }

    console.log('🚀 Asset loader initialized with compression support:', this.compressionSupport);
  }

  /**
   * Load a texture with automatic format detection (KTX2 vs regular)
   */
  async loadTexture(path: string): Promise<THREE.Texture> {
    const cacheKey = `texture:${path}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const promise = this.loadTextureInternal(path);
    this.cache.set(cacheKey, promise);
    
    return promise;
  }

  private async loadTextureInternal(path: string): Promise<THREE.Texture> {
    // Try to load KTX2 compressed version first
    if (this.compressionSupport.ktx2) {
      const ktx2Path = path.replace(/\.(png|jpg|jpeg|webp)$/i, '.ktx2');
      
      try {
        const texture = await this.loadKTX2Texture(ktx2Path);
        console.log(`✅ Loaded compressed texture: ${ktx2Path}`);
        return texture;
      } catch (error) {
        console.log(`⚠️ KTX2 texture not found, falling back to regular: ${path}`);
      }
    }

    // Fallback to regular texture
    return this.loadRegularTexture(path);
  }

  private loadKTX2Texture(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.ktx2Loader.load(
        path,
        (texture) => {
          texture.generateMipmaps = false; // KTX2 includes mipmaps
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  private loadRegularTexture(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        path,
        (texture) => {
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  /**
   * Load a GLTF/GLB model with automatic compression support
   */
  async loadModel(path: string): Promise<any> {
    const cacheKey = `model:${path}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const promise = this.loadModelInternal(path);
    this.cache.set(cacheKey, promise);
    
    return promise;
  }

  private async loadModelInternal(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      console.log(`🔄 Loading model: ${path}`);
      
      this.gltfLoader.load(
        path,
        (gltf) => {
          console.log(`✅ Model loaded successfully: ${path}`);
          
          // Log compression info
          if (gltf.userData?.compression) {
            console.log(`📦 Compression used:`, gltf.userData.compression);
          }
          
          resolve(gltf);
        },
        (progress) => {
          if (progress.lengthComputable) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            console.log(`📁 Loading ${path}: ${percent}%`);
          }
        },
        (error) => {
          console.error(`❌ Failed to load model: ${path}`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Preload multiple assets in parallel
   */
  async preloadAssets(assets: { type: 'texture' | 'model', path: string }[]): Promise<void> {
    console.log(`⚡ Preloading ${assets.length} assets...`);
    
    const startTime = performance.now();
    const promises = assets.map(async (asset) => {
      try {
        if (asset.type === 'texture') {
          await this.loadTexture(asset.path);
        } else if (asset.type === 'model') {
          await this.loadModel(asset.path);
        }
      } catch (error) {
        console.error(`Failed to preload ${asset.type}: ${asset.path}`, error);
      }
    });

    await Promise.all(promises);
    
    const loadTime = performance.now() - startTime;
    console.log(`✅ Preloaded ${assets.length} assets in ${loadTime.toFixed(0)}ms`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    let totalSize = 0;
    const typeCount = { texture: 0, model: 0 };
    
    for (const [key] of this.cache) {
      const type = key.split(':')[0] as 'texture' | 'model';
      typeCount[type]++;
    }

    return {
      totalCached: this.cache.size,
      textures: typeCount.texture,
      models: typeCount.model,
      compressionSupport: this.compressionSupport
    };
  }

  /**
   * Clear cache to free memory
   */
  clearCache() {
    console.log('🧹 Clearing asset cache...');
    this.cache.clear();
  }

  /**
   * Get optimal asset path (compressed vs original)
   */
  getOptimalAssetPath(originalPath: string): string {
    // If we have compression support, prefer compressed formats
    if (originalPath.match(/\.(png|jpg|jpeg|webp)$/i) && this.compressionSupport.ktx2) {
      return originalPath.replace(/\.(png|jpg|jpeg|webp)$/i, '.ktx2');
    }
    
    if (originalPath.match(/\.gltf$/i)) {
      return originalPath.replace(/\.gltf$/i, '.glb');
    }
    
    return originalPath;
  }
}

// Utility functions for easy use
export async function loadTexture(path: string, renderer: THREE.WebGLRenderer): Promise<THREE.Texture> {
  const loader = AssetLoader.getInstance(renderer);
  return loader.loadTexture(path);
}

export async function loadModel(path: string, renderer: THREE.WebGLRenderer): Promise<any> {
  const loader = AssetLoader.getInstance(renderer);
  return loader.loadModel(path);
}

export function getAssetLoader(renderer?: THREE.WebGLRenderer): AssetLoader {
  return AssetLoader.getInstance(renderer);
}
