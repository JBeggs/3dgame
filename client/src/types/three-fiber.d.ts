import 'react';
import '@react-three/fiber';

// Global JSX augmentation so R3F tags like <group>, <mesh>, etc. are accepted
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Ensure compatibility with the automatic JSX runtime
declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
