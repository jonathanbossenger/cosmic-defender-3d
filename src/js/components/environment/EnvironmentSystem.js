import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * EnvironmentSystem - Manages environmental features in the arena
 */
export class EnvironmentSystem {
  /**
   * Create a new environment system
   * @param {THREE.Scene} scene - The scene to add environment features to
   * @param {Object} physics - The physics world
   * @param {Object} options - Environment system options
   */
  constructor(scene, physics, options = {}) {
    this.scene = scene;
    this.physics = physics;
    
    // Default options
    this.options = Object.assign({
      platformSize: 60,
      platformHeight: 2,
      boundaryHeight: 15,
      hazardCount: 4,
      hazardDamage: 10,
      ambientParticleCount: 100,
      fogDensity: 0.01,
      fogColor: 0x112233,
    }, options);
    
    // Environment elements
    this.boundary = null;
    this.boundaryWalls = [];
    this.hazardZones = [];
    this.ambientParticles = null;
    this.fogEffect = null;
    
    // Visual effects
    this.effects = {
      particles: [],
      lights: [],
      meshes: []
    };
    
    // Materials
    this.materials = {
      boundary: null,
      hazard: null,
      particle: null
    };
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the environment system
   */
  init() {
    // Create materials
    this.createMaterials();
    
    // Create boundary
    this.createBoundary();
    
    // Create hazard zones
    this.createHazardZones();
    
    // Create ambient particles
    this.createAmbientParticles();
    
    // Create fog effect
    this.createFogEffect();
  }
  
  /**
   * Create materials for environment elements
   */
  createMaterials() {
    // Boundary material
    this.materials.boundary = new THREE.MeshStandardMaterial({
      color: 0x3366cc,
      transparent: true,
      opacity: 0.3,
      emissive: 0x1133aa,
      emissiveIntensity: 0.5,
      side: THREE.DoubleSide,
    });
    
    // Hazard material
    this.materials.hazard = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.5,
      emissive: 0xff0000,
      emissiveIntensity: 0.7,
    });
    
    // Particle material
    this.materials.particle = new THREE.PointsMaterial({
      color: 0xaaccff,
      size: 0.1,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
  }
  
  /**
   * Create boundary walls around the arena
   */
  createBoundary() {
    const { platformSize, boundaryHeight, platformHeight } = this.options;
    
    // Create boundary group
    this.boundary = new THREE.Group();
    this.scene.add(this.boundary);
    
    // Wall dimensions
    const wallWidth = platformSize * 1.2;
    const wallHeight = boundaryHeight;
    const wallDepth = 0.2;
    const wallY = platformHeight + (boundaryHeight / 2);
    const wallDistance = platformSize / 2 * 1.1;
    
    // Create four walls
    const wallPositions = [
      { x: 0, z: wallDistance, rotation: 0 },
      { x: wallDistance, z: 0, rotation: Math.PI / 2 },
      { x: 0, z: -wallDistance, rotation: Math.PI },
      { x: -wallDistance, z: 0, rotation: -Math.PI / 2 }
    ];
    
    wallPositions.forEach((pos, index) => {
      // Create wall geometry
      const geometry = new THREE.PlaneGeometry(wallWidth, wallHeight);
      
      // Create wall mesh
      const wall = new THREE.Mesh(geometry, this.materials.boundary);
      wall.position.set(pos.x, wallY, pos.z);
      wall.rotation.y = pos.rotation;
      
      // Add glow effect
      const glowIntensity = 0.5;
      const glowSize = 0.1;
      
      // Create edge glow
      const edgeGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(wallWidth + glowSize, wallHeight + glowSize),
        new THREE.MeshBasicMaterial({
          color: 0x66aaff,
          transparent: true,
          opacity: glowIntensity,
          side: THREE.DoubleSide,
        })
      );
      
      edgeGlow.position.copy(wall.position);
      edgeGlow.rotation.copy(wall.rotation);
      edgeGlow.position.z += (index % 2 === 0) ? 0.01 : 0;
      edgeGlow.position.x += (index % 2 === 1) ? 0.01 : 0;
      
      // Add to boundary group
      this.boundary.add(wall);
      this.boundary.add(edgeGlow);
      this.boundaryWalls.push(wall);
      
      // Add to effects
      this.effects.meshes.push(edgeGlow);
      
      // Create physics body for wall
      const shape = new CANNON.Plane();
      const body = new CANNON.Body({
        mass: 0, // Static body
        position: new CANNON.Vec3(pos.x, wallY, pos.z),
        material: this.physics.world.defaultMaterial,
      });
      
      // Set rotation
      const quaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, pos.rotation, 0)
      );
      body.quaternion.set(
        quaternion.x,
        quaternion.y,
        quaternion.z,
        quaternion.w
      );
      
      // Add shape to body
      body.addShape(shape);
      
      // Add to physics world
      this.physics.world.addBody(body);
    });
    
    // Add top boundary (ceiling)
    const ceilingY = platformHeight + boundaryHeight;
    const ceilingGeometry = new THREE.PlaneGeometry(wallWidth, wallWidth);
    const ceiling = new THREE.Mesh(ceilingGeometry, this.materials.boundary);
    ceiling.position.set(0, ceilingY, 0);
    ceiling.rotation.x = Math.PI / 2;
    
    // Add to boundary group
    this.boundary.add(ceiling);
    
    // Create physics body for ceiling
    const ceilingShape = new CANNON.Plane();
    const ceilingBody = new CANNON.Body({
      mass: 0, // Static body
      position: new CANNON.Vec3(0, ceilingY, 0),
      material: this.physics.world.defaultMaterial,
    });
    
    // Set rotation (facing down)
    ceilingBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    
    // Add shape to body
    ceilingBody.addShape(ceilingShape);
    
    // Add to physics world
    this.physics.world.addBody(ceilingBody);
  }
  
  /**
   * Create hazard zones in the arena
   */
  createHazardZones() {
    const { platformSize, platformHeight, hazardCount } = this.options;
    
    // Calculate positions for hazard zones
    const positions = this.calculateHazardPositions(hazardCount, platformSize);
    
    // Create hazard zones
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      
      // Create hazard geometry
      const radius = 3 + Math.random() * 2; // Random radius between 3-5
      const geometry = new THREE.CircleGeometry(radius, 32);
      
      // Create hazard mesh
      const hazard = new THREE.Mesh(geometry, this.materials.hazard);
      hazard.position.set(position.x, platformHeight + 0.01, position.z);
      hazard.rotation.x = -Math.PI / 2; // Rotate to lay flat
      
      // Add user data for identification
      hazard.userData.type = 'hazard';
      hazard.userData.damage = this.options.hazardDamage;
      hazard.userData.radius = radius;
      
      // Add to scene
      this.scene.add(hazard);
      this.hazardZones.push(hazard);
      
      // Add hazard effect light
      const light = new THREE.PointLight(0xff3300, 1, radius * 2);
      light.position.set(position.x, platformHeight + 0.5, position.z);
      light.intensity = 0.5;
      this.scene.add(light);
      
      // Add to effects
      this.effects.lights.push(light);
      
      // Create hazard particles
      const particleCount = Math.floor(radius * 10);
      const particleGeometry = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);
      
      for (let j = 0; j < particleCount; j++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        
        particlePositions[j * 3] = position.x + Math.cos(angle) * r;
        particlePositions[j * 3 + 1] = platformHeight + 0.1 + Math.random() * 0.5;
        particlePositions[j * 3 + 2] = position.z + Math.sin(angle) * r;
      }
      
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      
      const particleMaterial = new THREE.PointsMaterial({
        color: 0xff5500,
        size: 0.2,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      });
      
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      this.scene.add(particles);
      
      // Add to effects
      this.effects.particles.push({
        points: particles,
        basePositions: particlePositions.slice(),
        radius: radius,
        centerX: position.x,
        centerZ: position.z,
      });
    }
  }
  
  /**
   * Calculate positions for hazard zones
   * @param {number} count - Number of hazard zones
   * @param {number} platformSize - Size of the platform
   * @returns {Array} - Array of positions
   */
  calculateHazardPositions(count, platformSize) {
    const positions = [];
    const radius = (platformSize / 2) * 0.8; // 80% of platform radius
    const angleStep = (Math.PI * 2) / count;
    
    // Create hazards in a circle
    for (let i = 0; i < count; i++) {
      const angle = angleStep * i;
      
      // Add some randomness to the position
      const distance = radius * (0.5 + Math.random() * 0.3); // 50-80% of radius
      
      // Calculate position
      const x = Math.sin(angle) * distance;
      const z = Math.cos(angle) * distance;
      
      // Add position
      positions.push({ x, z });
    }
    
    return positions;
  }
  
  /**
   * Create ambient particles in the arena
   */
  createAmbientParticles() {
    const { platformSize, platformHeight, ambientParticleCount } = this.options;
    
    // Create particle geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(ambientParticleCount * 3);
    const velocities = new Float32Array(ambientParticleCount * 3);
    
    // Generate random positions within the arena
    for (let i = 0; i < ambientParticleCount; i++) {
      const radius = platformSize / 2;
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      
      positions[i * 3] = Math.sin(angle) * distance;
      positions[i * 3 + 1] = platformHeight + Math.random() * 10;
      positions[i * 3 + 2] = Math.cos(angle) * distance;
      
      // Random velocities
      velocities[i * 3] = (Math.random() - 0.5) * 0.05;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create particles
    this.ambientParticles = new THREE.Points(geometry, this.materials.particle);
    this.scene.add(this.ambientParticles);
    
    // Store velocities for animation
    this.ambientParticles.userData.velocities = velocities;
    this.ambientParticles.userData.initialPositions = positions.slice();
  }
  
  /**
   * Create fog effect in the arena
   */
  createFogEffect() {
    const { fogDensity, fogColor } = this.options;
    
    // Create fog
    this.fogEffect = new THREE.FogExp2(fogColor, fogDensity);
    
    // Apply to scene
    this.scene.fog = this.fogEffect;
  }
  
  /**
   * Check if a position is within a hazard zone
   * @param {THREE.Vector3} position - Position to check
   * @returns {Object|null} - Hazard data if in hazard, null otherwise
   */
  isInHazardZone(position) {
    for (const hazard of this.hazardZones) {
      const dx = position.x - hazard.position.x;
      const dz = position.z - hazard.position.z;
      const distanceSquared = dx * dx + dz * dz;
      
      if (distanceSquared < hazard.userData.radius * hazard.userData.radius) {
        return {
          damage: hazard.userData.damage,
          position: hazard.position,
          radius: hazard.userData.radius
        };
      }
    }
    
    return null;
  }
  
  /**
   * Check if a position is outside the boundary
   * @param {THREE.Vector3} position - Position to check
   * @returns {boolean} - Whether position is outside boundary
   */
  isOutsideBoundary(position) {
    const { platformSize } = this.options;
    const boundarySize = platformSize * 1.1 / 2; // Half the boundary size
    
    return (
      Math.abs(position.x) > boundarySize ||
      Math.abs(position.z) > boundarySize ||
      position.y > this.options.platformHeight + this.options.boundaryHeight
    );
  }
  
  /**
   * Create a boundary breach effect at a position
   * @param {THREE.Vector3} position - Position of the breach
   */
  createBoundaryBreachEffect(position) {
    // Create flash effect
    const light = new THREE.PointLight(0x3366ff, 2, 10);
    light.position.copy(position);
    this.scene.add(light);
    
    // Create particles
    const particleCount = 20;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = position.x;
      particlePositions[i * 3 + 1] = position.y;
      particlePositions[i * 3 + 2] = position.z;
      
      // Random velocities outward
      particleVelocities[i * 3] = (Math.random() - 0.5) * 0.5;
      particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x66aaff,
      size: 0.3,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(particles);
    
    // Animate and remove after a short time
    let lifetime = 1.0; // 1 second
    
    const animate = (deltaTime) => {
      // Update light
      light.intensity -= deltaTime * 2;
      
      // Update particles
      const positions = particles.geometry.attributes.position.array;
      
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += particleVelocities[i * 3];
        positions[i * 3 + 1] += particleVelocities[i * 3 + 1];
        positions[i * 3 + 2] += particleVelocities[i * 3 + 2];
      }
      
      particles.geometry.attributes.position.needsUpdate = true;
      
      // Update material
      particleMaterial.opacity -= deltaTime;
      
      // Update lifetime
      lifetime -= deltaTime;
      
      // Remove if expired
      if (lifetime <= 0) {
        this.scene.remove(light);
        this.scene.remove(particles);
        
        // Remove from update list
        const index = this.effects.tempEffects.indexOf(animate);
        if (index !== -1) {
          this.effects.tempEffects.splice(index, 1);
        }
        
        // Dispose of resources
        particleGeometry.dispose();
        particleMaterial.dispose();
      }
    };
    
    // Add to temporary effects
    if (!this.effects.tempEffects) {
      this.effects.tempEffects = [];
    }
    
    this.effects.tempEffects.push(animate);
  }
  
  /**
   * Create a hazard damage effect at a position
   * @param {THREE.Vector3} position - Position of the damage
   */
  createHazardDamageEffect(position) {
    // Create flash effect
    const light = new THREE.PointLight(0xff3300, 2, 5);
    light.position.copy(position);
    this.scene.add(light);
    
    // Create particles
    const particleCount = 10;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = position.x;
      particlePositions[i * 3 + 1] = position.y;
      particlePositions[i * 3 + 2] = position.z;
      
      // Random velocities upward
      particleVelocities[i * 3] = (Math.random() - 0.5) * 0.3;
      particleVelocities[i * 3 + 1] = Math.random() * 0.5;
      particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xff5500,
      size: 0.2,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(particles);
    
    // Animate and remove after a short time
    let lifetime = 0.5; // 0.5 seconds
    
    const animate = (deltaTime) => {
      // Update light
      light.intensity -= deltaTime * 4;
      
      // Update particles
      const positions = particles.geometry.attributes.position.array;
      
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += particleVelocities[i * 3];
        positions[i * 3 + 1] += particleVelocities[i * 3 + 1];
        positions[i * 3 + 2] += particleVelocities[i * 3 + 2];
      }
      
      particles.geometry.attributes.position.needsUpdate = true;
      
      // Update material
      particleMaterial.opacity -= deltaTime * 2;
      
      // Update lifetime
      lifetime -= deltaTime;
      
      // Remove if expired
      if (lifetime <= 0) {
        this.scene.remove(light);
        this.scene.remove(particles);
        
        // Remove from update list
        const index = this.effects.tempEffects.indexOf(animate);
        if (index !== -1) {
          this.effects.tempEffects.splice(index, 1);
        }
        
        // Dispose of resources
        particleGeometry.dispose();
        particleMaterial.dispose();
      }
    };
    
    // Add to temporary effects
    if (!this.effects.tempEffects) {
      this.effects.tempEffects = [];
    }
    
    this.effects.tempEffects.push(animate);
  }
  
  /**
   * Update the environment system
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Update boundary effects
    this.updateBoundaryEffects(deltaTime);
    
    // Update hazard effects
    this.updateHazardEffects(deltaTime);
    
    // Update ambient particles
    this.updateAmbientParticles(deltaTime);
    
    // Update temporary effects
    if (this.effects.tempEffects) {
      for (let i = this.effects.tempEffects.length - 1; i >= 0; i--) {
        this.effects.tempEffects[i](deltaTime);
      }
    }
  }
  
  /**
   * Update boundary effects
   * @param {number} deltaTime - Time since last update
   */
  updateBoundaryEffects(deltaTime) {
    // Pulse the boundary walls
    for (const mesh of this.effects.meshes) {
      mesh.material.opacity = 0.3 + Math.sin(performance.now() * 0.001) * 0.2;
    }
  }
  
  /**
   * Update hazard effects
   * @param {number} deltaTime - Time since last update
   */
  updateHazardEffects(deltaTime) {
    // Update hazard particles
    for (const particleEffect of this.effects.particles) {
      const positions = particleEffect.points.geometry.attributes.position.array;
      const basePositions = particleEffect.basePositions;
      
      for (let i = 0; i < positions.length / 3; i++) {
        // Get base position
        const baseX = basePositions[i * 3];
        const baseY = basePositions[i * 3 + 1];
        const baseZ = basePositions[i * 3 + 2];
        
        // Add some movement
        positions[i * 3] = baseX + Math.sin(performance.now() * 0.001 + i * 0.1) * 0.1;
        positions[i * 3 + 1] = baseY + Math.sin(performance.now() * 0.002 + i * 0.1) * 0.2;
        positions[i * 3 + 2] = baseZ + Math.cos(performance.now() * 0.001 + i * 0.1) * 0.1;
      }
      
      particleEffect.points.geometry.attributes.position.needsUpdate = true;
    }
    
    // Pulse hazard lights
    for (const light of this.effects.lights) {
      light.intensity = 0.5 + Math.sin(performance.now() * 0.003) * 0.3;
    }
  }
  
  /**
   * Update ambient particles
   * @param {number} deltaTime - Time since last update
   */
  updateAmbientParticles(deltaTime) {
    if (!this.ambientParticles) return;
    
    const positions = this.ambientParticles.geometry.attributes.position.array;
    const velocities = this.ambientParticles.userData.velocities;
    const initialPositions = this.ambientParticles.userData.initialPositions;
    
    for (let i = 0; i < positions.length / 3; i++) {
      // Update position
      positions[i * 3] += velocities[i * 3];
      positions[i * 3 + 1] += velocities[i * 3 + 1];
      positions[i * 3 + 2] += velocities[i * 3 + 2];
      
      // Check if particle is too far from initial position
      const dx = positions[i * 3] - initialPositions[i * 3];
      const dy = positions[i * 3 + 1] - initialPositions[i * 3 + 1];
      const dz = positions[i * 3 + 2] - initialPositions[i * 3 + 2];
      const distanceSquared = dx * dx + dy * dy + dz * dz;
      
      // Reset if too far
      if (distanceSquared > 25) {
        positions[i * 3] = initialPositions[i * 3];
        positions[i * 3 + 1] = initialPositions[i * 3 + 1];
        positions[i * 3 + 2] = initialPositions[i * 3 + 2];
      }
    }
    
    this.ambientParticles.geometry.attributes.position.needsUpdate = true;
    
    // Rotate particles slightly
    this.ambientParticles.rotation.y += deltaTime * 0.05;
  }
  
  /**
   * Dispose of the environment system
   */
  dispose() {
    // Dispose of boundary
    if (this.boundary) {
      this.scene.remove(this.boundary);
      
      // Dispose of child meshes
      this.boundary.traverse(child => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });
    }
    
    // Dispose of hazard zones
    for (const hazard of this.hazardZones) {
      this.scene.remove(hazard);
      if (hazard.geometry) hazard.geometry.dispose();
      if (hazard.material) hazard.material.dispose();
    }
    
    // Dispose of ambient particles
    if (this.ambientParticles) {
      this.scene.remove(this.ambientParticles);
      if (this.ambientParticles.geometry) this.ambientParticles.geometry.dispose();
      if (this.ambientParticles.material) this.ambientParticles.material.dispose();
    }
    
    // Dispose of effect meshes
    for (const mesh of this.effects.meshes) {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    }
    
    // Dispose of effect lights
    for (const light of this.effects.lights) {
      this.scene.remove(light);
    }
    
    // Dispose of effect particles
    for (const particleEffect of this.effects.particles) {
      this.scene.remove(particleEffect.points);
      if (particleEffect.points.geometry) particleEffect.points.geometry.dispose();
      if (particleEffect.points.material) particleEffect.points.material.dispose();
    }
    
    // Clear arrays
    this.boundaryWalls = [];
    this.hazardZones = [];
    this.effects.meshes = [];
    this.effects.lights = [];
    this.effects.particles = [];
    
    // Remove fog
    this.scene.fog = null;
    this.fogEffect = null;
  }
} 