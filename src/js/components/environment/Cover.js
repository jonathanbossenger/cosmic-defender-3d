import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Cover - Creates and manages cover objects in the arena
 */
export class Cover {
  /**
   * Create a new cover object
   * @param {THREE.Scene} scene - The scene to add the cover to
   * @param {Object} physics - The physics world
   * @param {Object} options - Cover options
   */
  constructor(scene, physics, options = {}) {
    this.scene = scene;
    this.physics = physics;
    
    // Default options
    this.options = Object.assign({
      type: 'barrier', // barrier, shield-station, ammo-station
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      width: 3,
      height: 1.5,
      depth: 0.3,
      color: 0x888888,
      health: 100,
      maxHealth: 100,
      destructible: true,
      respawnTime: 30, // seconds
    }, options);
    
    // Cover properties
    this.id = Math.random().toString(36).substr(2, 9);
    this.type = this.options.type;
    this.position = this.options.position.clone();
    this.rotation = this.options.rotation.clone();
    this.width = this.options.width;
    this.height = this.options.height;
    this.depth = this.options.depth;
    this.color = this.options.color;
    this.health = this.options.health;
    this.maxHealth = this.options.maxHealth;
    this.destructible = this.options.destructible;
    this.respawnTime = this.options.respawnTime;
    
    // State
    this.isActive = true;
    this.isDestroyed = false;
    this.respawnTimer = 0;
    this.damageLevel = 0; // 0-3 (none, light, medium, heavy)
    
    // Meshes and bodies
    this.mesh = null;
    this.body = null;
    this.damageMeshes = [];
    this.effectMesh = null;
    
    // Create the cover object
    this.init();
  }
  
  /**
   * Initialize the cover object
   */
  init() {
    switch (this.type) {
      case 'barrier':
        this.createBarrier();
        break;
      case 'shield-station':
        this.createShieldStation();
        break;
      case 'ammo-station':
        this.createAmmoStation();
        break;
      default:
        this.createBarrier();
    }
    
    // Add to scene
    if (this.mesh) {
      this.scene.add(this.mesh);
    }
    
    // Create physics body
    this.createPhysicsBody();
  }
  
  /**
   * Create a defensive barrier
   */
  createBarrier() {
    // Create geometry
    const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.7,
      metalness: 0.3,
    });
    
    // Create mesh
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.mesh.rotation.copy(this.rotation);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Add user data for identification
    this.mesh.userData.id = this.id;
    this.mesh.userData.type = 'cover';
    this.mesh.userData.coverType = this.type;
    this.mesh.userData.health = this.health;
    this.mesh.userData.maxHealth = this.maxHealth;
    this.mesh.userData.destructible = this.destructible;
    
    // Create damage overlays
    this.createDamageOverlays();
  }
  
  /**
   * Create a shield station
   */
  createShieldStation() {
    // Create base
    const baseGeometry = new THREE.BoxGeometry(this.width, this.height / 3, this.width);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.5,
      metalness: 0.7,
    });
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.copy(this.position);
    base.position.y += this.height / 6;
    base.castShadow = true;
    base.receiveShadow = true;
    
    // Create shield generator
    const generatorGeometry = new THREE.CylinderGeometry(0.3, 0.3, this.height, 8);
    const generatorMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.3,
      metalness: 0.8,
    });
    
    const generator = new THREE.Mesh(generatorGeometry, generatorMaterial);
    generator.position.copy(this.position);
    generator.position.y += this.height / 2;
    generator.castShadow = true;
    generator.receiveShadow = true;
    
    // Create shield effect
    const shieldGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const shieldMaterial = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.7,
      emissive: 0x0066aa,
      emissiveIntensity: 0.5,
    });
    
    this.effectMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
    this.effectMesh.position.copy(this.position);
    this.effectMesh.position.y += this.height - 0.2;
    
    // Create group
    this.mesh = new THREE.Group();
    this.mesh.add(base);
    this.mesh.add(generator);
    this.mesh.add(this.effectMesh);
    
    // Add user data for identification
    this.mesh.userData.id = this.id;
    this.mesh.userData.type = 'cover';
    this.mesh.userData.coverType = this.type;
    this.mesh.userData.health = this.health;
    this.mesh.userData.maxHealth = this.maxHealth;
    this.mesh.userData.destructible = this.destructible;
  }
  
  /**
   * Create an ammo station
   */
  createAmmoStation() {
    // Create base
    const baseGeometry = new THREE.BoxGeometry(this.width, this.height / 3, this.width);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.5,
      metalness: 0.7,
    });
    
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.copy(this.position);
    base.position.y += this.height / 6;
    base.castShadow = true;
    base.receiveShadow = true;
    
    // Create ammo container
    const containerGeometry = new THREE.BoxGeometry(this.width * 0.8, this.height * 0.6, this.width * 0.8);
    const containerMaterial = new THREE.MeshStandardMaterial({
      color: 0x884400,
      roughness: 0.6,
      metalness: 0.4,
    });
    
    const container = new THREE.Mesh(containerGeometry, containerMaterial);
    container.position.copy(this.position);
    container.position.y += this.height / 2;
    container.castShadow = true;
    container.receiveShadow = true;
    
    // Create ammo effect
    const effectGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.1);
    const effectMaterial = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.9,
      emissive: 0xff6600,
      emissiveIntensity: 0.5,
    });
    
    // Create multiple ammo indicators
    const ammoGroup = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const ammo = new THREE.Mesh(effectGeometry, effectMaterial);
      ammo.position.copy(this.position);
      ammo.position.y += this.height / 2 + 0.3;
      ammo.position.x += (i - 2) * 0.15;
      ammoGroup.add(ammo);
    }
    
    this.effectMesh = ammoGroup;
    
    // Create group
    this.mesh = new THREE.Group();
    this.mesh.add(base);
    this.mesh.add(container);
    this.mesh.add(this.effectMesh);
    
    // Add user data for identification
    this.mesh.userData.id = this.id;
    this.mesh.userData.type = 'cover';
    this.mesh.userData.coverType = this.type;
    this.mesh.userData.health = this.health;
    this.mesh.userData.maxHealth = this.maxHealth;
    this.mesh.userData.destructible = this.destructible;
  }
  
  /**
   * Create damage overlays for destructible covers
   */
  createDamageOverlays() {
    if (!this.destructible) return;
    
    // Create three levels of damage overlays
    for (let i = 0; i < 3; i++) {
      // Create geometry (slightly larger than the main mesh)
      const geometry = new THREE.BoxGeometry(
        this.width * 1.01,
        this.height * 1.01,
        this.depth * 1.01
      );
      
      // Create material
      const material = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.9,
        metalness: 0.1,
        transparent: true,
        opacity: 0,
        wireframe: i === 2, // Heavy damage is wireframe
      });
      
      // Create mesh
      const damageMesh = new THREE.Mesh(geometry, material);
      damageMesh.position.copy(this.position);
      damageMesh.rotation.copy(this.rotation);
      
      // Add to damage meshes array
      this.damageMeshes.push(damageMesh);
      
      // Add to scene
      this.scene.add(damageMesh);
    }
  }
  
  /**
   * Create physics body for the cover
   */
  createPhysicsBody() {
    // Create box shape
    const shape = new CANNON.Box(new CANNON.Vec3(
      this.width / 2,
      this.height / 2,
      this.depth / 2
    ));
    
    // Create body
    this.body = new CANNON.Body({
      mass: 0, // Static body
      position: new CANNON.Vec3(
        this.position.x,
        this.position.y,
        this.position.z
      ),
      shape: shape,
      material: this.physics.world.defaultMaterial,
    });
    
    // Set rotation
    const quaternion = new THREE.Quaternion().setFromEuler(this.rotation);
    this.body.quaternion.set(
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w
    );
    
    // Add user data
    this.body.userData = {
      id: this.id,
      type: 'cover',
      coverType: this.type,
    };
    
    // Add to physics world
    this.physics.world.addBody(this.body);
  }
  
  /**
   * Take damage
   * @param {number} amount - Amount of damage to take
   * @returns {boolean} - Whether the cover was destroyed
   */
  takeDamage(amount) {
    if (!this.destructible || this.isDestroyed) return false;
    
    // Reduce health
    this.health -= amount;
    
    // Update damage level
    const prevDamageLevel = this.damageLevel;
    this.damageLevel = Math.floor((1 - this.health / this.maxHealth) * 3);
    
    // Clamp damage level
    this.damageLevel = Math.max(0, Math.min(3, this.damageLevel));
    
    // Update damage visuals if damage level changed
    if (prevDamageLevel !== this.damageLevel) {
      this.updateDamageVisuals();
    }
    
    // Check if destroyed
    if (this.health <= 0) {
      this.destroy();
      return true;
    }
    
    return false;
  }
  
  /**
   * Update damage visuals based on current damage level
   */
  updateDamageVisuals() {
    // Update damage meshes
    for (let i = 0; i < this.damageMeshes.length; i++) {
      const damageMesh = this.damageMeshes[i];
      
      // Show damage mesh if damage level is high enough
      if (i < this.damageLevel) {
        damageMesh.material.opacity = 0.3 + (i * 0.2);
      } else {
        damageMesh.material.opacity = 0;
      }
    }
    
    // Update main mesh
    if (this.mesh) {
      // Darken color based on damage
      if (this.mesh.material) {
        const damageRatio = 1 - (this.damageLevel / 3);
        this.mesh.material.color.setRGB(
          this.mesh.material.color.r * damageRatio,
          this.mesh.material.color.g * damageRatio,
          this.mesh.material.color.b * damageRatio
        );
      }
    }
  }
  
  /**
   * Destroy the cover
   */
  destroy() {
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    this.health = 0;
    
    // Hide mesh
    if (this.mesh) {
      this.mesh.visible = false;
    }
    
    // Show all damage meshes
    for (const damageMesh of this.damageMeshes) {
      damageMesh.material.opacity = 0.8;
      damageMesh.material.wireframe = true;
    }
    
    // Disable physics body
    if (this.body) {
      this.body.collisionResponse = false;
    }
    
    // Start respawn timer if needed
    if (this.respawnTime > 0) {
      this.respawnTimer = this.respawnTime;
    }
  }
  
  /**
   * Respawn the cover
   */
  respawn() {
    if (!this.isDestroyed) return;
    
    this.isDestroyed = false;
    this.health = this.maxHealth;
    this.damageLevel = 0;
    
    // Show mesh
    if (this.mesh) {
      this.mesh.visible = true;
    }
    
    // Hide damage meshes
    for (const damageMesh of this.damageMeshes) {
      damageMesh.material.opacity = 0;
      damageMesh.material.wireframe = false;
    }
    
    // Enable physics body
    if (this.body) {
      this.body.collisionResponse = true;
    }
    
    // Reset respawn timer
    this.respawnTimer = 0;
  }
  
  /**
   * Update the cover
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Update respawn timer
    if (this.isDestroyed && this.respawnTime > 0) {
      this.respawnTimer -= deltaTime;
      
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
    }
    
    // Update effect mesh
    if (this.effectMesh) {
      if (this.type === 'shield-station') {
        // Pulse effect
        this.effectMesh.scale.x = 1 + Math.sin(performance.now() * 0.003) * 0.1;
        this.effectMesh.scale.y = 1 + Math.sin(performance.now() * 0.003) * 0.1;
        this.effectMesh.scale.z = 1 + Math.sin(performance.now() * 0.003) * 0.1;
      } else if (this.type === 'ammo-station') {
        // Blink effect
        const children = this.effectMesh.children;
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          child.material.opacity = 0.5 + Math.sin(performance.now() * 0.005 + i * 0.5) * 0.5;
        }
      }
    }
  }
  
  /**
   * Dispose of the cover
   */
  dispose() {
    // Remove from scene
    if (this.mesh) {
      this.scene.remove(this.mesh);
      
      // Dispose of geometries and materials
      if (this.mesh.geometry) {
        this.mesh.geometry.dispose();
      }
      
      if (this.mesh.material) {
        this.mesh.material.dispose();
      }
    }
    
    // Remove damage meshes
    for (const damageMesh of this.damageMeshes) {
      this.scene.remove(damageMesh);
      
      if (damageMesh.geometry) {
        damageMesh.geometry.dispose();
      }
      
      if (damageMesh.material) {
        damageMesh.material.dispose();
      }
    }
    
    // Remove from physics world
    if (this.body) {
      this.physics.world.removeBody(this.body);
    }
  }
} 