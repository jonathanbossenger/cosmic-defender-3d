import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Arena } from './arena.js';
import { Player } from '../player/Player.js';
import { InputManager } from '../player/InputManager.js';
import { HUD } from '../player/HUD.js';

export class GameScene {
  constructor(camera, loadingManager, physics, renderer) {
    this.camera = camera;
    this.loadingManager = loadingManager;
    this.physics = physics;
    this.renderer = renderer;
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.01);
    
    // Game objects
    this.player = null;
    this.arena = null;
    this.inputManager = null;
    this.hud = null;
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the game scene
   */
  init() {
    // Add lights
    this.setupLights();
    
    // Add environment
    this.setupEnvironment();
    
    // Add objects
    this.setupObjects();
    
    // Create arena if physics is provided
    if (this.physics) {
      this.arena = new Arena(this.scene, this.loadingManager, this.physics);
      
      // Store arena reference in scene for other objects to access
      this.scene.userData.arena = this.arena;
      
      // Initialize arena
      this.arena.init();
    }
    
    // Create player
    this.createPlayer();
    
    // Create input manager
    this.createInputManager();
  }
  
  /**
   * Create player
   */
  createPlayer() {
    // Create player
    this.player = new Player(this.scene, this.physics);
    
    // Set initial position
    this.player.mesh.position.set(0, 2, 0);
    this.player.body.position.copy(this.player.mesh.position);
    
    // Create HUD
    this.hud = new HUD(this.renderer.domElement.parentElement);
    
    // Override player's takeDamage method to update HUD
    const originalTakeDamage = this.player.takeDamage.bind(this.player);
    this.player.takeDamage = (amount) => {
      originalTakeDamage(amount);
      
      // Update HUD
      if (this.hud) {
        this.hud.updateHealth(this.player.health, this.player.maxHealth);
        this.hud.showDamageIndicator();
      }
    };
    
    // Initial HUD update
    this.hud.updateHealth(this.player.health, this.player.maxHealth);
  }
  
  /**
   * Create input manager
   */
  createInputManager() {
    // Create input manager
    this.inputManager = new InputManager(this.renderer.domElement);
    
    // Set up input callbacks
    this.inputManager.setKeyDownCallback((key) => {
      if (this.player) {
        this.player.handleKeyInput(key, true);
      }
    });
    
    this.inputManager.setKeyUpCallback((key) => {
      if (this.player) {
        this.player.handleKeyInput(key, false);
      }
    });
    
    this.inputManager.setMouseMoveCallback((deltaX, deltaY) => {
      if (this.player) {
        this.player.handleMouseMove(deltaX, deltaY);
      }
    });
    
    this.inputManager.setMouseDownCallback((button) => {
      if (this.player) {
        this.player.handleMouseButton(button, true);
      }
    });
    
    this.inputManager.setMouseUpCallback((button) => {
      if (this.player) {
        this.player.handleMouseButton(button, false);
      }
    });
  }
  
  setupLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.position.set(10, 20, 10);
    this.sunLight.castShadow = true;
    
    // Configure shadow properties
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 50;
    this.sunLight.shadow.camera.left = -20;
    this.sunLight.shadow.camera.right = 20;
    this.sunLight.shadow.camera.top = 20;
    this.sunLight.shadow.camera.bottom = -20;
    
    this.scene.add(this.sunLight);
    
    // Helper for debugging
    // const helper = new THREE.CameraHelper(this.sunLight.shadow.camera);
    // this.scene.add(helper);
  }
  
  setupEnvironment() {
    // Sky
    this.sky = new Sky();
    this.sky.scale.setScalar(1000);
    this.scene.add(this.sky);
    
    const skyUniforms = this.sky.material.uniforms;
    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;
    
    // Sun position
    const phi = THREE.MathUtils.degToRad(90 - 45); // Sun elevation
    const theta = THREE.MathUtils.degToRad(180); // Sun azimuth
    
    const sunPosition = new THREE.Vector3();
    sunPosition.setFromSphericalCoords(1, phi, theta);
    
    skyUniforms['sunPosition'].value.copy(sunPosition);
    
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 32, 32);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Water
    const waterGeometry = new THREE.PlaneGeometry(100, 100);
    
    // Use the TextureLoader from our custom LoadingManager
    const textureLoader = this.loadingManager.createTextureLoader();
    const waterNormals = textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg',
      function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }
    );
    
    this.water = new Water(waterGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: waterNormals,
      sunDirection: new THREE.Vector3(sunPosition.x, sunPosition.y, sunPosition.z),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: this.scene.fog !== undefined,
    });
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = -5;
    this.scene.add(this.water);
  }
  
  setupObjects() {
    // Create some boxes for the environment
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.5,
      metalness: 0.5,
    });
    
    // Create a grid of boxes
    for (let i = -5; i <= 5; i += 2) {
      for (let j = -5; j <= 5; j += 2) {
        if (i === 0 && j === 0) continue; // Skip center
        
        const height = Math.random() * 3 + 0.5;
        const box = new THREE.Mesh(
          boxGeometry,
          boxMaterial.clone()
        );
        box.position.set(i * 2, height / 2, j * 2);
        box.scale.set(1, height, 1);
        box.castShadow = true;
        box.receiveShadow = true;
        
        // Randomize color
        box.material.color.setHSL(Math.random(), 0.7, 0.5);
        
        this.scene.add(box);
      }
    }
    
    // Add a target sphere
    const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0.3,
      metalness: 0.7,
    });
    this.targetSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.targetSphere.position.set(0, 1, -10);
    this.targetSphere.castShadow = true;
    this.scene.add(this.targetSphere);
  }
  
  /**
   * Update the game scene
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Update arena
    if (this.arena) {
      this.arena.update(deltaTime);
    }
    
    // Update player
    if (this.player) {
      this.player.update(deltaTime, this.camera);
      
      // Update HUD
      if (this.hud) {
        this.hud.updateHealth(this.player.health, this.player.maxHealth);
      }
    }
    
    // Update water if it exists
    if (this.water) {
      this.water.material.uniforms['time'].value += deltaTime;
    }
    
    // Animate target sphere
    this.targetSphere.position.y = 1 + Math.sin(Date.now() * 0.001) * 0.5;
    this.targetSphere.rotation.y += deltaTime;
  }
  
  /**
   * Dispose of scene resources
   */
  dispose() {
    // Dispose of arena
    if (this.arena) {
      this.arena.dispose();
    }
    
    // Dispose of player
    if (this.player) {
      this.player.dispose();
    }
    
    // Dispose of input manager
    if (this.inputManager) {
      this.inputManager.dispose();
    }
    
    // Dispose of HUD
    if (this.hud) {
      this.hud.dispose();
    }
    
    // Dispose of water
    if (this.water) {
      this.water.material.dispose();
      this.water.geometry.dispose();
    }
    
    // Dispose of skybox
    if (this.sky) {
      this.sky.material.dispose();
      this.sky.geometry.dispose();
    }
    
    // Clear scene
    while (this.scene.children.length > 0) {
      const object = this.scene.children[0];
      this.scene.remove(object);
      
      if (object.geometry) {
        object.geometry.dispose();
      }
      
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    }
  }
} 
