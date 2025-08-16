import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Particle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

interface ParticleEffect {
  id: string;
  position: THREE.Vector3;
  type: 'impact' | 'death' | 'blood' | 'sparks';
  timestamp: number;
}

class ParticleManager {
  private particles: Map<number, Particle> = new Map();
  private effects: ParticleEffect[] = [];
  private nextId = 1;
  private subscribers = new Set<() => void>();

  createEffect(position: THREE.Vector3, type: ParticleEffect['type']) {
    const effect: ParticleEffect = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      position: position.clone(),
      type,
      timestamp: Date.now()
    };

    this.effects.push(effect);
    this.emit();

    // Clean up old effects
    this.effects = this.effects.filter(e => Date.now() - e.timestamp < 5000);
  }

  getEffects(): ParticleEffect[] {
    return [...this.effects];
  }

  subscribe(callback: () => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private emit() {
    this.subscribers.forEach(callback => callback());
  }
}

const particleManager = new ParticleManager();

export function getParticleManager() {
  return particleManager;
}

export function ParticleSystem() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [effects, setEffects] = React.useState<ParticleEffect[]>([]);
  const particles = useRef<Map<number, Particle>>(new Map());
  const nextParticleId = useRef(1);

  // Subscribe to particle effects
  useEffect(() => {
    return particleManager.subscribe(() => {
      setEffects(particleManager.getEffects());
    });
  }, []);

  // Create particles for new effects
  useEffect(() => {
    effects.forEach(effect => {
      createParticlesForEffect(effect);
    });
  }, [effects]);

  const createParticlesForEffect = (effect: ParticleEffect) => {
    const count = getParticleCountForType(effect.type);
    const config = getParticleConfigForType(effect.type);

    for (let i = 0; i < count; i++) {
      const particle: Particle = {
        id: nextParticleId.current++,
        position: effect.position.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * config.spread,
            (Math.random() - 0.5) * config.spread,
            (Math.random() - 0.5) * config.spread
          )
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * config.velocityRange,
          Math.random() * config.velocityRange,
          (Math.random() - 0.5) * config.velocityRange
        ),
        life: config.life + Math.random() * config.lifeVariation,
        maxLife: config.life,
        size: config.size + Math.random() * config.sizeVariation,
        color: config.color.clone()
      };

      particles.current.set(particle.id, particle);
    }
  };

  const getParticleCountForType = (type: ParticleEffect['type']) => {
    switch (type) {
      case 'impact': return 8;
      case 'death': return 15;
      case 'blood': return 12;
      case 'sparks': return 6;
      default: return 5;
    }
  };

  const getParticleConfigForType = (type: ParticleEffect['type']) => {
    switch (type) {
      case 'impact':
        return {
          spread: 0.3,
          velocityRange: 3,
          life: 0.8,
          lifeVariation: 0.4,
          size: 0.08,
          sizeVariation: 0.04,
          color: new THREE.Color('#ff6b35')
        };
      case 'death':
        return {
          spread: 0.5,
          velocityRange: 4,
          life: 1.5,
          lifeVariation: 0.8,
          size: 0.1,
          sizeVariation: 0.06,
          color: new THREE.Color('#8b0000')
        };
      case 'blood':
        return {
          spread: 0.2,
          velocityRange: 2,
          life: 1.0,
          lifeVariation: 0.5,
          size: 0.06,
          sizeVariation: 0.03,
          color: new THREE.Color('#cc0000')
        };
      case 'sparks':
        return {
          spread: 0.4,
          velocityRange: 5,
          life: 0.6,
          lifeVariation: 0.3,
          size: 0.04,
          sizeVariation: 0.02,
          color: new THREE.Color('#ffcc00')
        };
      default:
        return {
          spread: 0.3,
          velocityRange: 2,
          life: 1.0,
          lifeVariation: 0.5,
          size: 0.08,
          sizeVariation: 0.04,
          color: new THREE.Color('#ffffff')
        };
    }
  };

  // Update particles each frame
  useFrame((_, deltaTime) => {
    const particleArray = Array.from(particles.current.values());
    const livingParticles = particleArray.filter(p => p.life > 0);

    // Update particle physics
    livingParticles.forEach(particle => {
      // Apply gravity
      particle.velocity.y -= 9.8 * deltaTime;

      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

      // Decrease life
      particle.life -= deltaTime;

      // Fade color based on life
      const alpha = Math.max(0, particle.life / particle.maxLife);
      particle.color.multiplyScalar(0.98); // Fade over time
    });

    // Remove dead particles
    particles.current.forEach((particle, id) => {
      if (particle.life <= 0) {
        particles.current.delete(id);
      }
    });

    // Update instanced mesh if we have particles
    if (meshRef.current && livingParticles.length > 0) {
      const maxInstances = 200; // Maximum instances to prevent performance issues
      const particlesToRender = livingParticles.slice(0, maxInstances);
      
      meshRef.current.count = particlesToRender.length;

      const tempObject = new THREE.Object3D();
      
      particlesToRender.forEach((particle, i) => {
        tempObject.position.copy(particle.position);
        tempObject.scale.setScalar(particle.size * (particle.life / particle.maxLife));
        tempObject.updateMatrix();
        
        meshRef.current!.setMatrixAt(i, tempObject.matrix);
        meshRef.current!.setColorAt(i, particle.color);
      });

      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    } else if (meshRef.current) {
      meshRef.current.count = 0;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 200]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial 
        transparent 
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
