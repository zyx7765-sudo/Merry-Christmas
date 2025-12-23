export enum TreeState {
  ASSEMBLED = 'ASSEMBLED', // The Tree
  SCATTERED = 'SCATTERED', // Floating particles
  PHOTO_ZOOM = 'PHOTO_ZOOM' // Focusing on one photo
}

export enum HandGesture {
  NONE = 'NONE',
  FIST = 'FIST',      // Assemble
  OPEN = 'OPEN',      // Scatter / Rotate
  PINCH = 'PINCH'     // Select Photo
}

export interface ParticleData {
  scatterPosition: [number, number, number];
  treePosition: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  color: string;
  type: 'sphere' | 'cube' | 'cane';
}

export interface PhotoData {
  id: string;
  url: string;
  texture?: any;
  scatterPosition: [number, number, number];
  treePosition: [number, number, number];
}
