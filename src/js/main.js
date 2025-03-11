import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LoadingManager } from './utils/LoadingManager.js';
import { GameScene } from './scenes/GameScene.js';
import { PhysicsWorld } from './physics/world.js';
import { Collisions } from './physics/collisions.js';
import { Player } from './components/player/Player.js';
import { Debug } from './utils/debug.js';
import Stats from 'stats.js';
import { Pane } from 'tweakpane';

class Game {
  constructor() {
    console.log('Game constructor called');
    
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
    this.camera.position.set(0, 1.8, 5);
    
    // Set up physics
    this.physics = new PhysicsWorld();
    this.collisions = new Collisions(this.physics);
    
    // Set up scene
    this.gameScene = new GameScene(this.camera, this.loadingManager, this.physics);
    
    // Set up player
    this.player = new Player(this.gameScene.scene, this.camera, this.physics, this.loadingManager);
    
    // Set up debug
    if (import.meta.env.DEV) {
      this.setupDebug();
    }
    
    // Event listeners
    window.addEventListener('resize', this.onResize.bind(this));
    
    // Hide loading screen and start game immediately
    this.init();
  }
  
  init() {
    console.log('Game init called');
    
    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      console.log('Hiding loading screen');
      loadingScreen.style.display = 'none';
    } else {
      console.error('Loading screen element not found');
    }
    
    // Start game loop
    console.log('Starting game loop');
    this.animate();
  }
  
  setupDebug() {
    // Create debug tools
    this.debug = new Debug(this.gameScene.scene, this.renderer, this.camera, this.physics);
    
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
    
    // Add player controls
    const playerFolder = this.pane.addFolder({
      title: 'Player',
    });
    
    // Add player health and shield controls
    // Create a proxy object with primitive values that Tweakpane can handle
    const playerParams = {
      health: this.player.health,
      energy: this.player.energy,
      moveSpeed: this.player.moveSpeed,
      jumpForce: this.player.jumpForce
    };
    
    playerFolder.addBinding(playerParams, 'health', { min: 0, max: 100 })
      .on('change', (event) => {
        this.player.health = event.value;
      });
      
    playerFolder.addBinding(playerParams, 'energy', { min: 0, max: 200 })
      .on('change', (event) => {
        this.player.energy = event.value;
      });
    
    // Add player movement controls
    playerFolder.addBinding(playerParams, 'moveSpeed', { min: 1, max: 20 })
      .on('change', (event) => {
        this.player.moveSpeed = event.value;
      });
      
    playerFolder.addBinding(playerParams, 'jumpForce', { min: 1, max: 20 })
      .on('change', (event) => {
        this.player.jumpForce = event.value;
      });
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
    if (this.debug) this.debug.update();
    if (this.stats) this.stats.begin();
    
    // Calculate delta time
    this.deltaTime = this.clock.getDelta();
    
    // Update physics
    this.physics.step(this.deltaTime);
    
    // Update player
    this.player.update(this.deltaTime);
    
    // Update game scene
    this.gameScene.update(this.deltaTime);
    
    // Render
    this.renderer.render(this.gameScene.scene, this.camera);
    
    if (this.stats) this.stats.end();
    if (this.debug) this.debug.endFrame();
    
    // Call animate again on the next frame
    requestAnimationFrame(this.animate.bind(this));
  }
}

// Start the game when the DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  // Start the game immediately
  new Game();
}); 
