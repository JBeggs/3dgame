import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

const cache = new Map<string, THREE.Object3D | null>();

export async function loadGLTFPart(id: string): Promise<THREE.Object3D | null> {
  if (cache.has(id)) {
    const cached = cache.get(id)!;
    console.log(`📋 Using cached GLB "${id}":`, cached ? 'SUCCESS' : 'NULL');
    return cached;
  }
  const url = `/assets/avatar/${id}.glb`;
  
  console.log(`🔄 Loading GLB "${id}" from ${url}...`);
  
  // Test file access first
  try {
    const response = await fetch(url, { method: 'HEAD' });
    console.log(`📁 File check for ${url}: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      throw new Error(`File not accessible: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error(`❌ File access failed for ${url}:`, error);
    cache.set(id, null);
    return null;
  }
  
  try {
    const loader = new GLTFLoader();
    console.log(`📦 Starting GLTF loading for ${url}...`);
    const gltf = await loader.loadAsync(url);
    const obj = gltf.scene || gltf.scenes?.[0] || null;
    
    // Debug: Log what we loaded
    console.log(`📦 Loaded GLB "${id}":`, {
      url,
      hasScene: !!gltf.scene,
      hasAnimations: !!gltf.animations?.length,
      animationCount: gltf.animations?.length || 0,
      animationNames: gltf.animations?.map(a => a.name) || [],
      sceneChildren: obj?.children?.length || 0,
      rawGLTF: gltf
    });
    
    // Attach animations to the object so Avatar component can access them
    if (gltf.animations && gltf.animations.length > 0) {
      (obj as any).animations = gltf.animations;
      console.log(`✅ Attached ${gltf.animations.length} animations to ${id}`);
    }
    
    if (!obj) {
      console.error(`❌ Failed to extract scene from GLB "${id}". GLTF structure:`, {
        scene: gltf.scene,
        scenes: gltf.scenes,
        sceneCount: gltf.scenes?.length || 0
      });
    }
    
    cache.set(id, obj);
    return obj;
  } catch (error) {
    console.error(`❌ GLB failed to load: ${url}`, {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    });
    cache.set(id, null);
    return null;
  }
}

export function clearAvatarCache() { cache.clear(); }


