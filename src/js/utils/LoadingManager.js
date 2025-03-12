import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class LoadingManager {
  constructor() {
    // Create Three.js loading manager
    this.threeManager = new THREE.LoadingManager();
    
    // Store callbacks
    this.onProgressCallback = null;
    this.onLoadCallback = null;
    
    // Set up loading events
    this.threeManager.onStart = (url, itemsLoaded, itemsTotal) => {
      console.log(`Started loading: ${url}`);
    };
    
    this.threeManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      if (typeof this.onProgressCallback === 'function') {
        this.onProgressCallback(url, itemsLoaded, itemsTotal);
      }
    };
    
    this.threeManager.onLoad = () => {
      console.log('All resources loaded');
      if (typeof this.onLoadCallback === 'function') {
        this.onLoadCallback();
      }
    };
    
    this.threeManager.onError = (url) => {
      console.error(`Error loading: ${url}`);
    };
    
    // Loading state
    this.isLoading = false;
    this.totalItems = 0;
    this.loadedItems = 0;
    
    // Create loaders
    this.textureLoader = new THREE.TextureLoader(this.threeManager);
    this.gltfLoader = new GLTFLoader(this.threeManager);
    this.audioLoader = new THREE.AudioLoader(this.threeManager);
    
    // Store loaded resources
    this.resources = {
      textures: new Map(),
      models: new Map(),
      audio: new Map()
    };
  }
  
  // Setter for onProgress callback
  set onProgress(callback) {
    this.onProgressCallback = callback;
  }
  
  // Setter for onLoad callback
  set onLoad(callback) {
    this.onLoadCallback = callback;
  }
  
  // Pass through THREE.LoadingManager methods
  resolveURL(url) {
    return this.threeManager.resolveURL(url);
  }
  
  itemStart(url) {
    return this.threeManager.itemStart(url);
  }
  
  itemEnd(url) {
    return this.threeManager.itemEnd(url);
  }
  
  itemError(url) {
    return this.threeManager.itemError(url);
  }
  
  startLoading() {
    console.log('Starting asset loading...');
    this.isLoading = true;
    
    // Load water normal texture
    this.loadTexture(
      'waterNormals',
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg',
      (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        console.log('Water texture loaded');
      }
    );
  }
  
  loadTexture(name, url, onLoad = null) {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          this.resources.textures.set(name, texture);
          if (onLoad) onLoad(texture);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error(`Error loading texture ${name}:`, error);
          reject(error);
        }
      );
    });
  }
  
  getTexture(name) {
    return this.resources.textures.get(name);
  }
  
  // Helper methods to get loaders
  getTextureLoader() {
    return this.textureLoader;
  }
  
  getGLTFLoader() {
    return this.gltfLoader;
  }
  
  getAudioLoader() {
    return this.audioLoader;
  }
  
  // Get the THREE.LoadingManager instance
  getManager() {
    return this.threeManager;
  }
} 
