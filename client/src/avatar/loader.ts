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
    
    // Debug: Log what we loaded
    if (import.meta.env.DEV) {
      console.log(`📦 Loaded GLB "${id}":`, {
        url,
        hasScene: !!gltf.scene,
        hasAnimations: !!gltf.animations?.length,
        animationCount: gltf.animations?.length || 0,
        animationNames: gltf.animations?.map(a => a.name) || [],
        sceneChildren: obj?.children?.length || 0
      });
      
      // Attach animations to the object so Avatar component can access them
      if (gltf.animations && gltf.animations.length > 0) {
        (obj as any).animations = gltf.animations;
        console.log(`✅ Attached ${gltf.animations.length} animations to ${id}`);
      }
    }
    
    cache.set(id, obj);
    return obj;
  } catch (error) {
    if (import.meta.env.DEV) console.warn(`[avatar] GLB failed to load: ${url}`, error);
    cache.set(id, null);
    return null;
  }
}

export function clearAvatarCache() { cache.clear(); }


