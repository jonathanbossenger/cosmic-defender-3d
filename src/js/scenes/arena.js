import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { MathUtils } from 'three';
import { CoverSystem } from '../components/environment/CoverSystem.js';
import { EnvironmentSystem } from '../components/environment/EnvironmentSystem.js';

/**
 * Arena - Creates and manages the game arena
 */
export class Arena {
  constructor(scene, loadingManager, physics) {
    this.scene = scene;
    this.loadingManager = loadingManager;
    this.physics = physics;
    
    // Arena properties
    this.size = 100; // Size of the arena (width and length)
    this.platformHeight = 2; // Height of the central platform
    this.platformSize = 60; // Size of the central platform
    
    // Arena elements
    this.platform = null;
    this.floor = null;
    this.edges = [];
    this.shield = null;
    this.shieldEffect = null;
    
    // Cover system
    this.coverSystem = null;
    
    // Environment system
    this.environmentSystem = null;
    
    // Materials
    this.materials = {
      platform: null,
      edge: null,
      floor: null,
      shield: null
    };
    
    // Shield properties
    this.shieldActive = false;
    this.shieldOpacity = 0.2;
    this.shieldPulseSpeed = 0.5;
    this.shieldColor = new THREE.Color(0x00aaff);
    
    // Lighting
    this.lights = {
      ambient: null,
      directional: null,
      point: [],
      spot: []
    };
    
    // Environment
    this.skybox = null;
    this.fog = null;
    
    // Animation properties
    this.time = 0;
    this.edgePulseTime = 0;
  }
  
  /**
   * Initialize the arena
   */
  init() {
    // Create materials
    this.createMaterials();
    
    // Create platform
    this.createPlatform();
    this.addPlatformDetails();
    this.addDirectionalMarkers();
    
    // Create floor
    this.createFloor();
    this.addFloorDetails();
    
    // Create edges
    this.createEdges();
    
    // Create shield
    this.createShield();
    this.createShieldEffect();
    
    // Create cover system
    this.createCoverSystem();
    
    // Create environment system
    this.createEnvironmentSystem();
    
    // Create lighting
    this.createLighting();
    this.addPointLights();
    
    // Create environment
    this.createEnvironment();
    
    console.log('Arena initialized');
  }
  
  /**
   * Create materials for arena elements
   */
  createMaterials() {
    // Platform material
    this.materials.platform = new THREE.MeshStandardMaterial({
      color: 0x333344,
      roughness: 0.7,
      metalness: 0.2
    });
    
    // Edge material
    this.materials.edge = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      roughness: 0.4,
      metalness: 0.6,
      emissive: 0x0055aa,
      emissiveIntensity: 0.5
    });
    
    // Floor material
    this.materials.floor = new THREE.MeshStandardMaterial({
      color: 0x222233,
      roughness: 0.8,
      metalness: 0.1
    });
    
    // Shield material
    this.materials.shield = new THREE.MeshStandardMaterial({
      color: this.shieldColor,
      transparent: true,
      opacity: this.shieldOpacity,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      roughness: 0.2,
      metalness: 0.8
    });
  }
  
  /**
   * Create the central platform
   */
  createPlatform() {
    // Create platform geometry
    const geometry = new THREE.BoxGeometry(
      this.platformSize, 
      this.platformHeight, 
      this.platformSize
    );
    
    // Create platform mesh
    this.platform = new THREE.Mesh(geometry, this.materials.platform);
    this.platform.position.y = -this.platformHeight / 2;
    this.platform.receiveShadow = true;
    this.platform.castShadow = true;
    
    // Add platform to scene
    this.scene.add(this.platform);
    
    // Add platform to physics world
    if (this.physics) {
      const platformBody = this.physics.addBox(
        this.platform.position,
        { width: this.platformSize, height: this.platformHeight, depth: this.platformSize },
        { mass: 0, restitution: 0.3 }
      );
      this.platform.userData.physicsBody = platformBody;
    }
    
    // Add platform details
    this.addPlatformDetails();
  }
  
  /**
   * Add details to the central platform
   */
  addPlatformDetails() {
    // Add grid pattern to platform top
    const gridSize = this.platformSize;
    const gridDivisions = 20;
    const gridGeometry = new THREE.PlaneGeometry(gridSize, gridSize, gridDivisions, gridDivisions);
    const gridMaterial = new THREE.MeshStandardMaterial({
      color: 0x444455,
      roughness: 0.7,
      metalness: 0.3,
      wireframe: false
    });
    
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = 0.01; // Slightly above platform to avoid z-fighting
    this.scene.add(grid);
    
    // Add center circle
    const centerRadius = 10;
    const centerGeometry = new THREE.CircleGeometry(centerRadius, 32);
    const centerMaterial = new THREE.MeshStandardMaterial({
      color: 0x555566,
      roughness: 0.6,
      metalness: 0.4
    });
    
    const centerCircle = new THREE.Mesh(centerGeometry, centerMaterial);
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.y = 0.02; // Slightly above grid
    this.scene.add(centerCircle);
    
    // Add inner circle
    const innerRadius = 5;
    const innerGeometry = new THREE.RingGeometry(innerRadius - 0.5, innerRadius, 32);
    const innerMaterial = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      roughness: 0.4,
      metalness: 0.6,
      emissive: 0x0055aa,
      emissiveIntensity: 0.5
    });
    
    const innerCircle = new THREE.Mesh(innerGeometry, innerMaterial);
    innerCircle.rotation.x = -Math.PI / 2;
    innerCircle.position.y = 0.03; // Slightly above center circle
    this.scene.add(innerCircle);
    
    // Add directional markers
    this.addDirectionalMarkers();
  }
  
  /**
   * Add directional markers to the platform
   */
  addDirectionalMarkers() {
    const markerSize = 2;
    const markerDistance = this.platformSize / 2 - 5;
    
    // Create marker geometry and material
    const markerGeometry = new THREE.PlaneGeometry(markerSize, markerSize * 3);
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      roughness: 0.4,
      metalness: 0.6,
      emissive: 0x0055aa,
      emissiveIntensity: 0.5
    });
    
    // Create markers for each direction
    const directions = [
      { angle: 0, name: 'north' },
      { angle: Math.PI / 2, name: 'east' },
      { angle: Math.PI, name: 'south' },
      { angle: -Math.PI / 2, name: 'west' }
    ];
    
    directions.forEach(dir => {
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.rotation.x = -Math.PI / 2;
      marker.rotation.z = dir.angle;
      
      marker.position.x = Math.sin(dir.angle) * markerDistance;
      marker.position.z = Math.cos(dir.angle) * markerDistance;
      marker.position.y = 0.03;
      
      marker.userData.direction = dir.name;
      
      this.scene.add(marker);
    });
  }
  
  /**
   * Create the floor surrounding the platform
   */
  createFloor() {
    // Create floor geometry
    const geometry = new THREE.PlaneGeometry(this.size * 3, this.size * 3, 32, 32);
    
    // Create floor mesh
    this.floor = new THREE.Mesh(geometry, this.materials.floor);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -this.platformHeight - 0.1; // Slightly below platform
    this.floor.receiveShadow = true;
    
    // Add floor to scene
    this.scene.add(this.floor);
    
    // Add floor to physics world
    if (this.physics) {
      const floorBody = this.physics.addPlane(
        this.floor.position,
        { normal: new THREE.Vector3(0, 1, 0) },
        { mass: 0, restitution: 0.3 }
      );
      this.floor.userData.physicsBody = floorBody;
    }
    
    // Add floor details
    this.addFloorDetails();
  }
  
  /**
   * Add details to the floor
   */
  addFloorDetails() {
    // Add grid pattern to floor
    const gridSize = this.size * 3;
    const gridDivisions = 60;
    const gridGeometry = new THREE.PlaneGeometry(gridSize, gridSize, gridDivisions, gridDivisions);
    const gridMaterial = new THREE.MeshStandardMaterial({
      color: 0x333344,
      roughness: 0.8,
      metalness: 0.1,
      wireframe: true
    });
    
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = -this.platformHeight - 0.09; // Slightly above floor
    this.scene.add(grid);
  }
  
  /**
   * Create edge markers around the platform
   */
  createEdges() {
    const edgeHeight = 0.5;
    const edgeWidth = 0.5;
    
    // Create edge geometry
    const geometry = new THREE.BoxGeometry(
      this.platformSize + edgeWidth, 
      edgeHeight, 
      edgeWidth
    );
    
    // Create edges for each side of the platform
    for (let i = 0; i < 4; i++) {
      const edge = new THREE.Mesh(geometry, this.materials.edge);
      
      // Position edge
      const angle = (i * Math.PI / 2);
      const halfSize = this.platformSize / 2;
      
      edge.position.x = Math.sin(angle) * halfSize;
      edge.position.z = Math.cos(angle) * halfSize;
      edge.position.y = 0;
      
      edge.rotation.y = angle;
      
      // Add edge to scene
      this.scene.add(edge);
      this.edges.push(edge);
    }
  }
  
  /**
   * Create shield effect around the platform
   */
  createShield() {
    // Create shield geometry (cylinder)
    const geometry = new THREE.CylinderGeometry(
      this.platformSize / 2 + 2, // Top radius
      this.platformSize / 2 + 2, // Bottom radius
      this.platformHeight * 5,   // Height
      32,                        // Segments
      4,                         // Height segments
      true                       // Open-ended
    );
    
    // Create shield mesh
    this.shield = new THREE.Mesh(geometry, this.materials.shield);
    this.shield.position.y = this.platformHeight;
    this.shield.visible = this.shieldActive;
    
    // Add shield to scene
    this.scene.add(this.shield);
    
    // Create shield effect (particles)
    this.createShieldEffect();
  }
  
  /**
   * Create particle effect for the shield
   */
  createShieldEffect() {
    // Create particle geometry
    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    
    // Generate random positions around the shield perimeter
    const radius = this.platformSize / 2 + 2;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * this.platformHeight * 5;
      
      particlePositions[i * 3] = Math.sin(angle) * radius;
      particlePositions[i * 3 + 1] = height + this.platformHeight;
      particlePositions[i * 3 + 2] = Math.cos(angle) * radius;
      
      particleSizes[i] = Math.random() * 0.5 + 0.5;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    
    // Create particle material
    const particleMaterial = new THREE.PointsMaterial({
      color: this.shieldColor,
      size: 0.5,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    
    // Create particle system
    this.shieldEffect = new THREE.Points(particleGeometry, particleMaterial);
    this.shieldEffect.visible = this.shieldActive;
    
    // Add shield effect to scene
    this.scene.add(this.shieldEffect);
  }
  
  /**
   * Create lighting for the arena
   */
  createLighting() {
    // Ambient light
    this.lights.ambient = new THREE.AmbientLight(0x333344, 0.5);
    this.scene.add(this.lights.ambient);
    
    // Directional light (sun)
    this.lights.directional = new THREE.DirectionalLight(0xffffff, 0.8);
    this.lights.directional.position.set(50, 100, 50);
    this.lights.directional.castShadow = true;
    
    // Configure shadow properties
    this.lights.directional.shadow.mapSize.width = 2048;
    this.lights.directional.shadow.mapSize.height = 2048;
    this.lights.directional.shadow.camera.near = 0.5;
    this.lights.directional.shadow.camera.far = 500;
    this.lights.directional.shadow.camera.left = -100;
    this.lights.directional.shadow.camera.right = 100;
    this.lights.directional.shadow.camera.top = 100;
    this.lights.directional.shadow.camera.bottom = -100;
    
    this.scene.add(this.lights.directional);
    
    // Add point lights around the arena
    this.addPointLights();
  }
  
  /**
   * Add point lights around the arena
   */
  addPointLights() {
    const lightColors = [
      0x0077ff, // Blue
      0xff3300, // Red
      0x00ff77, // Green
      0xffaa00  // Orange
    ];
    
    // Create point lights at each corner of the platform
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI / 2) + (Math.PI / 4); // 45 degree offset
      const distance = this.platformSize / 2 + 5;
      
      const light = new THREE.PointLight(lightColors[i], 1, 50, 2);
      light.position.x = Math.sin(angle) * distance;
      light.position.z = Math.cos(angle) * distance;
      light.position.y = 10;
      
      light.castShadow = true;
      light.shadow.mapSize.width = 1024;
      light.shadow.mapSize.height = 1024;
      
      this.scene.add(light);
      this.lights.point.push(light);
    }
  }
  
  /**
   * Create environment elements (skybox, fog, etc.)
   */
  createEnvironment() {
    // Add fog
    this.fog = new THREE.FogExp2(0x000011, 0.005);
    this.scene.fog = this.fog;
    
    // Create skybox
    this.createSkybox();
  }
  
  /**
   * Create skybox for the arena
   */
  createSkybox() {
    // Create skybox geometry
    const size = 1000;
    const geometry = new THREE.BoxGeometry(size, size, size);
    
    // Create skybox materials
    const materialArray = [];
    const baseColor = new THREE.Color(0x000011);
    
    for (let i = 0; i < 6; i++) {
      // Create gradient materials for each face
      const material = new THREE.MeshBasicMaterial({
        side: THREE.BackSide,
        fog: false,
        color: baseColor
      });
      
      materialArray.push(material);
    }
    
    // Create skybox mesh
    this.skybox = new THREE.Mesh(geometry, materialArray);
    this.scene.add(this.skybox);
    
    // Add stars to skybox
    this.addStars();
  }
  
  /**
   * Add stars to the skybox
   */
  addStars() {
    // Create star geometry
    const starCount = 2000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);
    const starColors = new Float32Array(starCount * 3);
    
    // Generate random star positions
    for (let i = 0; i < starCount; i++) {
      const radius = 900; // Slightly inside the skybox
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);
      
      starSizes[i] = Math.random() * 2 + 0.5;
      
      // Random star colors (mostly white/blue with some variation)
      const colorChoice = Math.random();
      if (colorChoice > 0.9) {
        // Red/orange star
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.7 * Math.random();
        starColors[i * 3 + 2] = 0.3 * Math.random();
      } else if (colorChoice > 0.8) {
        // Yellow star
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 1.0;
        starColors[i * 3 + 2] = 0.3 * Math.random();
      } else if (colorChoice > 0.6) {
        // Blue star
        starColors[i * 3] = 0.3 * Math.random();
        starColors[i * 3 + 1] = 0.7 * Math.random();
        starColors[i * 3 + 2] = 1.0;
      } else {
        // White star
        starColors[i * 3] = 0.8 + 0.2 * Math.random();
        starColors[i * 3 + 1] = 0.8 + 0.2 * Math.random();
        starColors[i * 3 + 2] = 0.8 + 0.2 * Math.random();
      }
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    
    // Create star material
    const starMaterial = new THREE.PointsMaterial({
      size: 1,
      transparent: true,
      opacity: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    
    // Create star system
    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);
  }
  
  /**
   * Activate or deactivate the shield
   * @param {boolean} active - Whether the shield should be active
   */
  setShieldActive(active) {
    this.shieldActive = active;
    
    if (this.shield) {
      this.shield.visible = active;
    }
    
    if (this.shieldEffect) {
      this.shieldEffect.visible = active;
    }
  }
  
  /**
   * Update the arena
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Update time
    this.time += deltaTime;
    this.edgePulseTime += deltaTime;
    
    // Update edge pulse effect
    this.updateEdgePulse();
    
    // Update shield effect
    if (this.shieldActive) {
      this.updateShieldEffect(deltaTime);
    }
    
    // Update point lights
    this.updateLights(deltaTime);
    
    // Update cover system
    if (this.coverSystem) {
      this.coverSystem.update(deltaTime);
    }
    
    // Update environment system
    if (this.environmentSystem) {
      this.environmentSystem.update(deltaTime);
    }
  }
  
  /**
   * Update edge pulse effect
   */
  updateEdgePulse() {
    // Pulse the edge emissive intensity
    const pulseIntensity = 0.5 + Math.sin(this.edgePulseTime * 2) * 0.3;
    
    if (this.materials.edge) {
      this.materials.edge.emissiveIntensity = pulseIntensity;
    }
  }
  
  /**
   * Update shield effect
   * @param {number} deltaTime - Time since last update
   */
  updateShieldEffect(deltaTime) {
    if (!this.shield || !this.shieldEffect) return;
    
    // Pulse shield opacity
    const pulseOpacity = this.shieldOpacity + Math.sin(this.time * this.shieldPulseSpeed) * 0.1;
    this.materials.shield.opacity = pulseOpacity;
    
    // Rotate shield effect
    this.shieldEffect.rotation.y += deltaTime * 0.2;
    
    // Update shield effect particles
    const positions = this.shieldEffect.geometry.attributes.position.array;
    const sizes = this.shieldEffect.geometry.attributes.size.array;
    
    for (let i = 0; i < sizes.length; i++) {
      // Pulse particle sizes
      sizes[i] = (Math.sin(this.time * 2 + i) * 0.25 + 0.75) * (Math.random() * 0.5 + 0.5);
      
      // Slowly move particles up and down
      positions[i * 3 + 1] += Math.sin(this.time + i) * 0.02;
      
      // Keep particles within bounds
      if (positions[i * 3 + 1] > this.platformHeight + this.platformHeight * 2.5) {
        positions[i * 3 + 1] = this.platformHeight - this.platformHeight * 2.5;
      } else if (positions[i * 3 + 1] < this.platformHeight - this.platformHeight * 2.5) {
        positions[i * 3 + 1] = this.platformHeight + this.platformHeight * 2.5;
      }
    }
    
    this.shieldEffect.geometry.attributes.position.needsUpdate = true;
    this.shieldEffect.geometry.attributes.size.needsUpdate = true;
  }
  
  /**
   * Update lights
   * @param {number} deltaTime - Time since last update
   */
  updateLights(deltaTime) {
    // Animate point lights
    this.lights.point.forEach((light, index) => {
      // Pulse light intensity
      const pulseIntensity = 0.8 + Math.sin(this.time * 1.5 + index) * 0.2;
      light.intensity = pulseIntensity;
      
      // Slightly move lights
      const angle = (index * Math.PI / 2) + (Math.PI / 4) + Math.sin(this.time * 0.5) * 0.1;
      const distance = this.platformSize / 2 + 5;
      
      light.position.x = Math.sin(angle) * distance;
      light.position.z = Math.cos(angle) * distance;
    });
  }
  
  /**
   * Get the platform size
   * @returns {number} Platform size
   */
  getPlatformSize() {
    return this.platformSize;
  }
  
  /**
   * Get the platform height
   * @returns {number} Platform height
   */
  getPlatformHeight() {
    return this.platformHeight;
  }
  
  /**
   * Check if a position is within the platform boundaries
   * @param {THREE.Vector3} position - Position to check
   * @returns {boolean} Whether the position is within the platform
   */
  isWithinPlatform(position) {
    const halfSize = this.platformSize / 2;
    
    return (
      position.x >= -halfSize &&
      position.x <= halfSize &&
      position.z >= -halfSize &&
      position.z <= halfSize
    );
  }
  
  /**
   * Get a random position on the platform
   * @param {number} margin - Margin from the edge
   * @returns {THREE.Vector3} Random position on the platform
   */
  getRandomPlatformPosition(margin = 5) {
    const halfSize = this.platformSize / 2 - margin;
    
    return new THREE.Vector3(
      MathUtils.randFloat(-halfSize, halfSize),
      0,
      MathUtils.randFloat(-halfSize, halfSize)
    );
  }
  
  /**
   * Create cover system
   */
  createCoverSystem() {
    // Create cover system
    this.coverSystem = new CoverSystem(this.scene, this.physics, {
      barrierCount: 8,
      shieldStationCount: 2,
      ammoStationCount: 2,
      platformSize: this.platformSize,
      platformHeight: this.platformHeight,
      coverMargin: 5,
    });
  }
  
  /**
   * Create environment system
   */
  createEnvironmentSystem() {
    // Create environment system
    this.environmentSystem = new EnvironmentSystem(this.scene, this.physics, {
      platformSize: this.platformSize,
      platformHeight: this.platformHeight,
      boundaryHeight: 15,
      hazardCount: 4,
      hazardDamage: 10,
      ambientParticleCount: 100,
      fogDensity: 0.005,
      fogColor: 0x112233,
    });
  }
  
  /**
   * Check if a position is within a hazard zone
   * @param {THREE.Vector3} position - Position to check
   * @returns {Object|null} - Hazard data if in hazard, null otherwise
   */
  isInHazardZone(position) {
    if (this.environmentSystem) {
      return this.environmentSystem.isInHazardZone(position);
    }
    return null;
  }
  
  /**
   * Check if a position is outside the boundary
   * @param {THREE.Vector3} position - Position to check
   * @returns {boolean} - Whether position is outside boundary
   */
  isOutsideBoundary(position) {
    if (this.environmentSystem) {
      return this.environmentSystem.isOutsideBoundary(position);
    }
    
    // Fallback if environment system not available
    const boundarySize = this.platformSize * 1.1 / 2;
    return (
      Math.abs(position.x) > boundarySize ||
      Math.abs(position.z) > boundarySize ||
      position.y > this.platformHeight + 15
    );
  }
  
  /**
   * Create a boundary breach effect at a position
   * @param {THREE.Vector3} position - Position of the breach
   */
  createBoundaryBreachEffect(position) {
    if (this.environmentSystem) {
      this.environmentSystem.createBoundaryBreachEffect(position);
    }
  }
  
  /**
   * Create a hazard damage effect at a position
   * @param {THREE.Vector3} position - Position of the damage
   */
  createHazardDamageEffect(position) {
    if (this.environmentSystem) {
      this.environmentSystem.createHazardDamageEffect(position);
    }
  }
  
  /**
   * Dispose of arena resources
   */
  dispose() {
    // Dispose of geometries and materials
    if (this.platform && this.platform.geometry) {
      this.platform.geometry.dispose();
    }
    
    if (this.floor && this.floor.geometry) {
      this.floor.geometry.dispose();
    }
    
    for (const edge of this.edges) {
      if (edge.geometry) {
        edge.geometry.dispose();
      }
    }
    
    if (this.shield && this.shield.geometry) {
      this.shield.geometry.dispose();
    }
    
    if (this.shieldEffect && this.shieldEffect.geometry) {
      this.shieldEffect.geometry.dispose();
    }
    
    // Dispose of materials
    for (const key in this.materials) {
      if (this.materials[key]) {
        this.materials[key].dispose();
      }
    }
    
    // Remove from scene
    if (this.platform) this.scene.remove(this.platform);
    if (this.floor) this.scene.remove(this.floor);
    for (const edge of this.edges) {
      if (edge) this.scene.remove(edge);
    }
    if (this.shield) this.scene.remove(this.shield);
    if (this.shieldEffect) this.scene.remove(this.shieldEffect);
    
    // Remove lights
    if (this.lights.ambient) this.scene.remove(this.lights.ambient);
    if (this.lights.directional) this.scene.remove(this.lights.directional);
    this.lights.point.forEach(light => {
      if (light) this.scene.remove(light);
    });
    this.lights.spot.forEach(light => {
      if (light) this.scene.remove(light);
    });
    
    // Remove skybox
    if (this.skybox) this.scene.remove(this.skybox);
    
    // Dispose of cover system
    if (this.coverSystem) {
      this.coverSystem.dispose();
    }
    
    // Dispose of environment system
    if (this.environmentSystem) {
      this.environmentSystem.dispose();
    }
  }
}
