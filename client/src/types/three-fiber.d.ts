import '@react-three/fiber';

declare module '@react-three/fiber' {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any; // Allow any Three.js component
    }
  }
}
