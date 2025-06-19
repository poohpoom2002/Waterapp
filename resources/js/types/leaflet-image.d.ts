declare module 'leaflet-image' {
  import { Map } from 'leaflet';
  
  interface LeafletImageOptions {
    canvas?: HTMLCanvasElement;
    width?: number;
    height?: number;
    quality?: number;
  }
  
  function leafletImage(map: Map, options?: LeafletImageOptions): Promise<HTMLCanvasElement>;
  
  export = leafletImage;
} 