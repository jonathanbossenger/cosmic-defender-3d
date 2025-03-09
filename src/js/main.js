import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FPSControls } from './controls/FPSControls.js';
import { LoadingManager } from './utils/LoadingManager.js';
import { GameScene } from './scenes/GameScene.js';
import { Physics } from './physics/Physics.js';
import Stats from 'stats.js';
import { Pane } from 'tweakpane';

class Game {
  constructor() {
    // Initialize properties
    this.canvas = document.createElement('canvas');
    document.body.appendChild(this.canvas);
    
    this.loadingManager = new LoadingManager();
    this.clock = new THREE.Clock();
    this.deltaTime = 0;
    
    // Set up renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Set up camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 5);
    
    // Set up scene
    this.gameScene = new GameScene(this.camera, this.loadingManager);
    
    // Set up physics
    this.physics = new Physics();
    
    // Set up controls
    this.controls = new FPSControls(this.camera, this.canvas, this.physics);
    
    // Set up debug
    if (import.meta.env.DEV) {
      this.setupDebug();
    }
    
    // Event listeners
    window.addEventListener('resize', this.onResize.bind(this));
    
    // Start loading assets
    this.loadingManager.onLoad = this.init.bind(this);
    this.loadingManager.startLoading();
  }
  
  init() {
    // Hide loading screen
    document.getElementById('loading-screen').style.display = 'none';
    
    // Start game loop
    this.animate();
  }
  
  setupDebug() {
    // Stats
    this.stats = new Stats();
    this.stats.showPanel(0);
    document.body.appendChild(this.stats.dom);
    
    // Debug panel
    this.pane = new Pane();
    
    // Add camera position controls
    const cameraFolder = this.pane.addFolder({
      title: 'Camera',
    });
    
    // Add inputs for camera position
    cameraFolder.addBinding(this.camera.position, 'x', { min: -10, max: 10 });
    cameraFolder.addBinding(this.camera.position, 'y', { min: -10, max: 10 });
    cameraFolder.addBinding(this.camera.position, 'z', { min: -10, max: 10 });
  }
  
  onResize() {
    // Update sizes
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Update camera
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    // Update renderer
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
  
  animate() {
    if (this.stats) this.stats.begin();
    
    // Calculate delta time
    this.deltaTime = this.clock.getDelta();
    
    // Update physics
    this.physics.update(this.deltaTime);
    
    // Update controls
    this.controls.update(this.deltaTime);
    
    // Update game scene
    this.gameScene.update(this.deltaTime);
    
    // Render
    this.renderer.render(this.gameScene.scene, this.camera);
    
    if (this.stats) this.stats.end();
    
    // Call animate again on the next frame
    requestAnimationFrame(this.animate.bind(this));
  }
}

// Start the game when the DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  new Game();
}); 
