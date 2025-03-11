import * as THREE from 'three';

export class Projectile {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    
    // Default projectile properties
    this.damage = 10;
    this.speed = 30;
    this.radius = 0.05;
    this.color = 0x00aaff;
    this.lifetime = 3.0; // seconds
    this.piercing = false;
    this.explosive = false;
    this.explosionRadius = 0;
    
    // State
    this.active = false;
    this.startTime = 0;
    this.position = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.hits = new Set(); // Track hit objects for piercing projectiles
    
    // Create projectile mesh
    this.createProjectileMesh();
  }
  
  createProjectileMesh() {
    // Create geometry
    const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
    
    // Create material
    this.material = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    
    // Create mesh
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.visible = false;
    
    // Add to scene
    this.scene.add(this.mesh);
    
    // Create trail
    this.createTrail();
  }
  
  createTrail() {
    // Create trail geometry
    const trailGeometry = new THREE.BufferGeometry();
    
    // Create trail points
    const trailPoints = 20;
    const positions = new Float32Array(trailPoints * 3);
    const colors = new Float32Array(trailPoints * 3);
    
    // Initialize positions and colors
    for (let i = 0; i < trailPoints; i++) {
      const i3 = i * 3;
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;
      
      // Fade color along trail
      const alpha = 1 - (i / trailPoints);
      const color = new THREE.Color(this.color);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b * alpha;
    }
    
    // Set attributes
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Create trail material
    const trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    
    // Create trail mesh
    this.trail = new THREE.Line(trailGeometry, trailMaterial);
    this.trail.visible = false;
    
    // Add to scene
    this.scene.add(this.trail);
    
    // Store trail data
    this.trailPositions = positions;
    this.trailColors = colors;
    this.trailPoints = trailPoints;
    this.trailHistory = [];
  }
  
  fire(position, direction, config = {}) {
    // Set projectile properties
    this.position.copy(position);
    this.direction.copy(direction).normalize();
    
    // Apply configuration
    this.damage = config.damage || this.damage;
    this.speed = config.speed || this.speed;
    this.radius = config.radius || this.radius;
    this.color = config.color || this.color;
    this.lifetime = config.lifetime || this.lifetime;
    this.piercing = config.piercing || this.piercing;
    this.explosive = config.explosive || this.explosive;
    this.explosionRadius = config.explosionRadius || this.explosionRadius;
    
    // Update material color
    this.material.color.set(this.color);
    
    // Update mesh scale
    this.mesh.scale.set(this.radius / 0.05, this.radius / 0.05, this.radius / 0.05);
    
    // Reset state
    this.active = true;
    this.startTime = performance.now() / 1000;
    this.hits.clear();
    this.trailHistory = [];
    
    // Show mesh
    this.mesh.visible = true;
    this.trail.visible = true;
    
    // Position mesh
    this.mesh.position.copy(this.position);
    
    // Add glow effect
    this.addGlowEffect();
  }
  
  addGlowEffect() {
    // Create glow sprite
    const spriteMaterial = new THREE.SpriteMaterial({
      map: this.createGlowTexture(),
      color: this.color,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    
    this.glowSprite = new THREE.Sprite(spriteMaterial);
    this.glowSprite.scale.set(this.radius * 4, this.radius * 4, 1);
    this.mesh.add(this.glowSprite);
  }
  
  createGlowTexture() {
    // Create a canvas for the glow texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    
    // Create a radial gradient
    const gradient = context.createRadialGradient(
      32, 32, 0,
      32, 32, 32
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    // Draw the gradient
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
  }
  
  update(deltaTime) {
    if (!this.active) return;
    
    // Check lifetime
    const now = performance.now() / 1000;
    if (now - this.startTime > this.lifetime) {
      this.deactivate();
      return;
    }
    
    // Store current position for trail
    this.trailHistory.unshift(this.position.clone());
    if (this.trailHistory.length > this.trailPoints) {
      this.trailHistory.pop();
    }
    
    // Update trail
    this.updateTrail();
    
    // Move projectile
    const moveDistance = this.speed * deltaTime;
    this.position.addScaledVector(this.direction, moveDistance);
    
    // Update mesh position
    this.mesh.position.copy(this.position);
    
    // Check for collisions
    this.checkCollisions();
  }
  
  updateTrail() {
    // Update trail positions
    for (let i = 0; i < this.trailHistory.length; i++) {
      const i3 = i * 3;
      const pos = this.trailHistory[i];
      
      this.trailPositions[i3] = pos.x;
      this.trailPositions[i3 + 1] = pos.y;
      this.trailPositions[i3 + 2] = pos.z;
    }
    
    // Fill remaining positions with last position
    if (this.trailHistory.length > 0) {
      const lastPos = this.trailHistory[this.trailHistory.length - 1];
      
      for (let i = this.trailHistory.length; i < this.trailPoints; i++) {
        const i3 = i * 3;
        this.trailPositions[i3] = lastPos.x;
        this.trailPositions[i3 + 1] = lastPos.y;
        this.trailPositions[i3 + 2] = lastPos.z;
      }
    }
    
    // Update trail geometry
    this.trail.geometry.attributes.position.needsUpdate = true;
  }
  
  checkCollisions() {
    // Raycast from previous position to current position
    const rayDirection = this.direction.clone();
    const rayLength = this.speed / 60; // Assuming 60 FPS
    
    // Create ray
    const rayStart = this.position.clone().sub(rayDirection.clone().multiplyScalar(rayLength));
    
    // Perform raycast
    const hit = this.physics.raycast(
      rayStart,
      rayDirection,
      rayLength * 2,
      (body) => {
        // Skip bodies we've already hit if piercing
        if (this.piercing && this.hits.has(body.id)) {
          return false;
        }
        return true;
      }
    );
    
    if (hit) {
      // Handle hit
      this.onHit(hit);
    }
  }
  
  onHit(hit) {
    // Add to hit list
    this.hits.add(hit.body.id);
    
    // Apply damage to hit object
    if (hit.body.userData && hit.body.userData.takeDamage) {
      hit.body.userData.takeDamage(this.damage);
    }
    
    // Create hit effect
    this.createHitEffect(hit.point, hit.normal);
    
    // Handle explosive projectiles
    if (this.explosive) {
      this.explode(hit.point);
    }
    
    // Deactivate if not piercing
    if (!this.piercing) {
      this.deactivate();
    }
  }
  
  createHitEffect(position, normal) {
    // This would create a visual hit effect
    // For now, just log the hit
    console.log('Projectile hit at', position);
  }
  
  explode(position) {
    // Create explosion effect
    this.createExplosionEffect(position);
    
    // Apply damage to nearby objects
    this.applyExplosionDamage(position);
  }
  
  createExplosionEffect(position) {
    // This would create a visual explosion effect
    // For now, just log the explosion
    console.log('Explosion at', position);
  }
  
  applyExplosionDamage(position) {
    // Find all bodies within explosion radius
    // This would be implemented with physics system
    console.log('Applying explosion damage with radius', this.explosionRadius);
  }
  
  deactivate() {
    this.active = false;
    this.mesh.visible = false;
    this.trail.visible = false;
  }
  
  reset() {
    this.deactivate();
    this.position.set(0, 0, 0);
    this.direction.set(0, 0, 0);
    this.hits.clear();
    this.trailHistory = [];
    
    // Remove glow sprite if it exists
    if (this.glowSprite) {
      this.mesh.remove(this.glowSprite);
      this.glowSprite = null;
    }
  }
} 
