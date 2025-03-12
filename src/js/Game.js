import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GameScene } from './scenes/GameScene.js';
import { PhysicsHelper } from './physics/PhysicsHelper.js';
import { Logger } from './utils/Logger.js';

export class Game {
  constructor(container, loadingManager) {
    this.container = container;
    this.loadingManager = loadingManager;
    
    // Game state
    this.isRunning = false;
    this.lastTime = 0;
    
    // Create logger
    this.logger = new Logger();
    this.logger.addCommonErrorHandlers();
    
    // Make game instance globally available for error handling
    window.game = this;
    
    // Initialize
    this.init();
  }
  
  /**
   * Handle errors during initialization
   * @param {Error} error - Error object
   */
  handleInitError(error) {
    this.logger.logError('INIT_ERROR', {
      message: error.message,
      stack: error.stack
    });
    
    // Don't attempt to recover physics automatically anymore
    console.error('Game initialization failed:', error);
  }
  
  /**
   * Initialize physics system
   */
  initializePhysics() {
    try {
      if (this.physics && this.physics.world) {
        console.warn('Physics already initialized, skipping...');
        return true;
      }

      // Create physics world
      const world = new CANNON.World();
      const defaultMaterial = new CANNON.Material('default');
      
      // Configure physics
      world.gravity.set(0, -9.82, 0);
      world.broadphase = new CANNON.NaiveBroadphase();
      world.solver.iterations = 10;
      
      // Create default contact material
      const defaultContactMaterial = new CANNON.ContactMaterial(
        defaultMaterial,
        defaultMaterial,
        {
          friction: 0.3,
          restitution: 0.2,
          contactEquationStiffness: 1e6,
          contactEquationRelaxation: 3,
        }
      );
      world.addContactMaterial(defaultContactMaterial);
      
      // Create physics helper
      this.physics = {
        world: world,
        defaultMaterial: defaultMaterial,
        helper: new PhysicsHelper(world, defaultMaterial)
      };
      
      return true;
    } catch (error) {
      console.error('Failed to initialize physics:', error);
      this.physics = null;
      return false;
    }
  }
  
  init() {
    try {
      // Create renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.container.appendChild(this.renderer.domElement);
      
      // Create camera
      this.camera = new THREE.PerspectiveCamera(
        75, // FOV
        window.innerWidth / window.innerHeight, // Aspect ratio
        0.1, // Near plane
        1000 // Far plane
      );
      
      // Initialize physics
      if (!this.initializePhysics()) {
        throw new Error('Failed to initialize physics system');
      }
      
      // Create game scene
      this.scene = new GameScene(
        this.camera,
        this.loadingManager,
        this.physics,
        this.renderer
      );
      
      // Handle window resize
      window.addEventListener('resize', this.handleResize.bind(this));
      
      // Start game loop
      this.start();
    } catch (error) {
      this.handleInitError(error);
    }
  }
  
  handleResize() {
    // Update camera
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    
    // Update renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate();
  }
  
  stop() {
    this.isRunning = false;
  }
  
  animate() {
    if (!this.isRunning) return;
    
    // Request next frame
    requestAnimationFrame(this.animate.bind(this));
    
    // Calculate delta time
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;
    
    // Update physics
    this.physics.world.step(1 / 60, deltaTime, 3);
    
    // Update scene
    if (this.scene) {
      this.scene.update(deltaTime);
    }
    
    // Render
    this.renderer.render(this.scene.scene, this.camera);
  }
  
  dispose() {
    // Stop game loop
    this.stop();
    
    // Dispose of scene
    if (this.scene) {
      this.scene.dispose();
    }
    
    // Dispose of renderer
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);
  }
} 