import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

const cache = new Map<string, THREE.Object3D | null>();

export async function loadGLTFPart(id: string): Promise<THREE.Object3D | null> {
  if (cache.has(id)) return cache.get(id)!;
  const url = `/assets/avatar/${id}.glb`;
  try {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    const obj = gltf.scene || gltf.scenes?.[0] || null;
    cache.set(id, obj);
    return obj;
  } catch {
    if (import.meta.env.DEV) console.warn(`[avatar] GLB not found or failed to load: ${url}`);
    cache.set(id, null);
    return null;
  }
}

export function clearAvatarCache() { cache.clear(); }


