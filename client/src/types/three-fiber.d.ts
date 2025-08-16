import { extend } from '@react-three/fiber';

// This ensures that React Three Fiber JSX components are recognized by TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Basic Three.js objects
      group: any;
      mesh: any;
      instancedMesh: any;
      primitive: any;
      
      // Geometries
      boxGeometry: any;
      sphereGeometry: any;
      planeGeometry: any;
      cylinderGeometry: any;
      torusGeometry: any;
      circleGeometry: any;
      
      // Materials
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      meshPhongMaterial: any;
      
      // Lights
      ambientLight: any;
      directionalLight: any;
      pointLight: any;
      spotLight: any;
      
      // Helpers
      gridHelper: any;
      axesHelper: any;
      
      // Canvas and misc
      color: any;
    }
  }
}
