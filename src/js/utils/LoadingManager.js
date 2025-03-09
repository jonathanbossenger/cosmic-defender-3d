import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class LoadingManager {
  constructor() {
    // Create Three.js loading manager
    this.manager = new THREE.LoadingManager();
    
    // Store the callback
    this.onLoadCallback = null;
    
    // Set up loading events
    this.manager.onStart = (url, itemsLoaded, itemsTotal) => {
      this.handleStart(url, itemsLoaded, itemsTotal);
    };
    
    this.manager.onProgress = (url, itemsLoaded, itemsTotal) => {
      this.handleProgress(url, itemsLoaded, itemsTotal);
    };
    
    this.manager.onLoad = () => {
      this.handleLoad();
    };
    
    this.manager.onError = (url) => {
      this.handleError(url);
    };
    
    // Loading state
    this.isLoading = false;
    this.totalItems = 0;
    this.loadedItems = 0;
    
    // DOM elements
    this.loadingScreen = document.getElementById('loading-screen');
    this.loadingBarFill = document.getElementById('loading-bar-fill');
  }
  
  handleStart(url, itemsLoaded, itemsTotal) {
    this.isLoading = true;
    this.totalItems = itemsTotal;
    this.loadedItems = 0;
    
    console.log(`Started loading: ${url}`);
  }
  
  handleProgress(url, itemsLoaded, itemsTotal) {
    this.loadedItems = itemsLoaded;
    this.totalItems = itemsTotal;
    
    // Update loading bar
    const progress = (itemsLoaded / itemsTotal) * 100;
    if (this.loadingBarFill) {
      this.loadingBarFill.style.width = `${progress}%`;
    }
    
    console.log(`Loading file: ${url}. Loaded ${itemsLoaded}/${itemsTotal} files.`);
  }
  
  handleLoad() {
    this.isLoading = false;
    console.log('Loading complete!');
    
    // Hide loading screen
    if (this.loadingScreen) {
      this.loadingScreen.style.display = 'none';
    }
    
    // Call custom onLoad callback if defined
    if (typeof this.onLoadCallback === 'function') {
      this.onLoadCallback();
    }
  }
  
  handleError(url) {
    console.error(`Error loading: ${url}`);
  }
  
  startLoading() {
    // Show loading screen
    if (this.loadingScreen) {
      this.loadingScreen.style.display = 'flex';
    }
    
    // Simulate loading for testing
    setTimeout(() => {
      this.handleLoad();
    }, 1000);
  }
  
  // Setter for onLoad callback
  set onLoad(callback) {
    this.onLoadCallback = callback;
  }
  
  // Create loaders with this manager
  createTextureLoader() {
    return new THREE.TextureLoader(this.manager);
  }
  
  createGLTFLoader() {
    return new GLTFLoader(this.manager);
  }
  
  createAudioLoader() {
    return new THREE.AudioLoader(this.manager);
  }
} 
