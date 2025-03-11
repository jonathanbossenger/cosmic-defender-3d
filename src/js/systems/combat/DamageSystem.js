import * as THREE from 'three';
import { EventEmitter } from '../../utils/EventEmitter.js';

/**
 * DamageSystem - Handles hit detection, damage calculation, and combat effects
 */
export class DamageSystem {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.events = new EventEmitter();
    
    // Raycaster for hit detection
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 1000;
    
    // Critical hit settings
    this.criticalHitChance = 0.1; // 10% chance for critical hit
    this.criticalHitMultiplier = 2.0; // 2x damage for critical hits
    
    // Damage modifiers
    this.globalDamageMultiplier = 1.0;
    this.damageModifiers = {
      player: 1.0,
      drone: 1.0,
      soldier: 1.0,
      elite: 1.0,
      commander: 1.0
    };
    
    // Damage types and resistances
    this.damageTypes = {
      kinetic: 'kinetic',     // Physical projectiles
      energy: 'energy',       // Laser/plasma weapons
      explosive: 'explosive', // Explosions/splash damage
      special: 'special'      // Special abilities
    };
    
    // Default resistances (1.0 = normal damage, <1.0 = resistance, >1.0 = weakness)
    this.defaultResistances = {
      kinetic: 1.0,
      energy: 1.0,
      explosive: 1.0,
      special: 1.0
    };
    
    // Hit effect pool
    this.hitEffects = [];
    this.maxHitEffects = 20;
    
    // Debug settings
    this.debugEnabled = false;
    this.debugHitMarkers = [];
  }
  
  /**
   * Initialize the damage system
   */
  init() {
    // Initialize hit effect pool
    this.initHitEffectPool();
    
    console.log('Damage System initialized');
  }
  
  /**
   * Initialize the hit effect pool
   */
  initHitEffectPool() {
    for (let i = 0; i < this.maxHitEffects; i++) {
      const effect = this.createHitEffect();
      effect.visible = false;
      this.hitEffects.push(effect);
      this.scene.add(effect);
    }
  }
  
  /**
   * Create a hit effect mesh
   * @returns {THREE.Object3D} The hit effect object
   */
  createHitEffect() {
    const group = new THREE.Group();
    
    // Create a simple particle effect
    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8
    });
    
    const particles = new THREE.InstancedMesh(geometry, material, 5);
    
    // Position particles in a small explosion pattern
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 5; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      dummy.scale.set(
        Math.random() * 0.5 + 0.5,
        Math.random() * 0.5 + 0.5,
        Math.random() * 0.5 + 0.5
      );
      dummy.updateMatrix();
      particles.setMatrixAt(i, dummy.matrix);
    }
    
    group.add(particles);
    group.userData = {
      lifetime: 0,
      maxLifetime: 0.5,
      active: false,
      type: 'hitEffect',
      particles: particles
    };
    
    return group;
  }
  
  /**
   * Process a projectile hit
   * @param {Object} projectile - The projectile that hit
   * @param {Object} target - The target that was hit
   * @param {THREE.Vector3} hitPoint - The point of impact
   * @param {THREE.Vector3} hitNormal - The normal at the impact point
   */
  processHit(projectile, target, hitPoint, hitNormal) {
    if (!projectile || !target) return;
    
    // Get damage amount from projectile
    const baseDamage = projectile.damage || 10;
    
    // Get damage type
    const damageType = projectile.damageType || this.damageTypes.kinetic;
    
    // Get source (who fired the projectile)
    const source = projectile.source || 'unknown';
    
    // Calculate final damage
    const damage = this.calculateDamage(baseDamage, damageType, source, target);
    
    // Apply damage to target
    if (target.takeDamage) {
      target.takeDamage(damage.amount, source, {
        isCritical: damage.isCritical,
        type: damageType,
        hitPoint: hitPoint,
        hitNormal: hitNormal
      });
    }
    
    // Show hit effect
    this.showHitEffect(hitPoint, damageType, damage.isCritical);
    
    // Emit hit event
    this.events.emit('hit', {
      projectile: projectile,
      target: target,
      damage: damage.amount,
      isCritical: damage.isCritical,
      type: damageType,
      hitPoint: hitPoint,
      hitNormal: hitNormal
    });
    
    // Debug visualization
    if (this.debugEnabled) {
      this.showDebugHitMarker(hitPoint, damage.amount, damage.isCritical);
    }
  }
  
  /**
   * Calculate damage based on various factors
   * @param {number} baseDamage - Base damage amount
   * @param {string} damageType - Type of damage
   * @param {string} source - Source of the damage
   * @param {Object} target - Target receiving damage
   * @returns {Object} Calculated damage and critical hit info
   */
  calculateDamage(baseDamage, damageType, source, target) {
    // Start with base damage
    let damage = baseDamage;
    
    // Apply global damage multiplier
    damage *= this.globalDamageMultiplier;
    
    // Apply source-specific damage modifier
    if (this.damageModifiers[source]) {
      damage *= this.damageModifiers[source];
    }
    
    // Apply target resistances if available
    const resistances = target.resistances || this.defaultResistances;
    if (resistances[damageType]) {
      damage *= resistances[damageType];
    }
    
    // Check for critical hit
    const isCritical = Math.random() < this.criticalHitChance;
    if (isCritical) {
      damage *= this.criticalHitMultiplier;
    }
    
    // Apply distance falloff if projectile has it
    // TODO: Implement distance-based damage falloff
    
    // Round to nearest integer
    damage = Math.round(damage);
    
    return {
      amount: damage,
      isCritical: isCritical
    };
  }
  
  /**
   * Process an area of effect (AOE) attack
   * @param {THREE.Vector3} center - Center of the AOE
   * @param {number} radius - Radius of the AOE
   * @param {number} damage - Base damage amount
   * @param {string} damageType - Type of damage
   * @param {string} source - Source of the damage
   * @param {Array} excludeTargets - Targets to exclude from damage
   */
  processAreaEffect(center, radius, damage, damageType, source, excludeTargets = []) {
    // Find all objects in radius
    const targets = this.findTargetsInRadius(center, radius);
    
    // Apply damage to each target
    targets.forEach(target => {
      // Skip excluded targets
      if (excludeTargets.includes(target)) return;
      
      // Calculate distance from center
      const distance = center.distanceTo(target.position);
      
      // Calculate falloff based on distance (linear falloff)
      const falloff = 1 - (distance / radius);
      
      // Calculate damage with falloff
      const scaledDamage = damage * Math.max(0.1, falloff);
      
      // Calculate final damage
      const finalDamage = this.calculateDamage(scaledDamage, damageType, source, target);
      
      // Apply damage
      if (target.takeDamage) {
        target.takeDamage(finalDamage.amount, source, {
          isCritical: finalDamage.isCritical,
          type: damageType,
          isAreaEffect: true,
          hitPoint: target.position.clone(),
          center: center,
          radius: radius
        });
      }
    });
    
    // Show AOE effect
    this.showAreaEffect(center, radius, damageType);
    
    // Emit area effect event
    this.events.emit('areaEffect', {
      center: center,
      radius: radius,
      damage: damage,
      type: damageType,
      source: source,
      targets: targets.filter(t => !excludeTargets.includes(t))
    });
  }
  
  /**
   * Find targets within a radius
   * @param {THREE.Vector3} center - Center point
   * @param {number} radius - Search radius
   * @returns {Array} Array of targets in radius
   */
  findTargetsInRadius(center, radius) {
    // This is a simplified implementation
    // In a real game, you would use a spatial partitioning system
    
    const targets = [];
    const radiusSquared = radius * radius;
    
    // Check all objects in the scene
    this.scene.traverse(object => {
      // Skip non-damageable objects
      if (!object.userData || !object.userData.canTakeDamage) return;
      
      // Calculate squared distance (faster than using distanceTo)
      const dx = object.position.x - center.x;
      const dy = object.position.y - center.y;
      const dz = object.position.z - center.z;
      const distanceSquared = dx * dx + dy * dy + dz * dz;
      
      // Check if within radius
      if (distanceSquared <= radiusSquared) {
        targets.push(object);
      }
    });
    
    return targets;
  }
  
  /**
   * Show a hit effect at the specified position
   * @param {THREE.Vector3} position - Position to show the effect
   * @param {string} damageType - Type of damage
   * @param {boolean} isCritical - Whether this was a critical hit
   */
  showHitEffect(position, damageType, isCritical) {
    // Find an available hit effect
    const effect = this.hitEffects.find(e => !e.userData.active);
    if (!effect) return;
    
    // Position the effect
    effect.position.copy(position);
    
    // Set effect properties based on damage type
    const material = effect.userData.particles.material;
    
    switch (damageType) {
      case this.damageTypes.kinetic:
        material.color.set(0xcccccc);
        break;
      case this.damageTypes.energy:
        material.color.set(0x00ffff);
        break;
      case this.damageTypes.explosive:
        material.color.set(0xff6600);
        break;
      case this.damageTypes.special:
        material.color.set(0xff00ff);
        break;
      default:
        material.color.set(0xffff00);
    }
    
    // Make critical hits larger and brighter
    if (isCritical) {
      effect.scale.set(1.5, 1.5, 1.5);
      material.opacity = 1.0;
    } else {
      effect.scale.set(1.0, 1.0, 1.0);
      material.opacity = 0.8;
    }
    
    // Activate the effect
    effect.visible = true;
    effect.userData.active = true;
    effect.userData.lifetime = 0;
  }
  
  /**
   * Show an area effect
   * @param {THREE.Vector3} center - Center of the effect
   * @param {number} radius - Radius of the effect
   * @param {string} damageType - Type of damage
   */
  showAreaEffect(center, radius, damageType) {
    // TODO: Implement area effect visualization
    // This would typically be a more complex effect with
    // expanding rings, particles, etc.
    
    // For now, just show a hit effect at the center
    this.showHitEffect(center, damageType, false);
  }
  
  /**
   * Show a debug hit marker
   * @param {THREE.Vector3} position - Position to show the marker
   * @param {number} damage - Damage amount
   * @param {boolean} isCritical - Whether this was a critical hit
   */
  showDebugHitMarker(position, damage, isCritical) {
    // Create a simple text sprite to show damage
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 64;
    
    // Clear canvas
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text
    context.font = isCritical ? 'bold 48px Arial' : '32px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = isCritical ? '#ff0000' : '#ffffff';
    context.fillText(damage.toString(), canvas.width / 2, canvas.height / 2);
    
    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.position.y += 1; // Offset upward
    sprite.scale.set(2, 1, 1);
    
    // Add to scene
    this.scene.add(sprite);
    
    // Store for cleanup
    this.debugHitMarkers.push({
      sprite: sprite,
      createdAt: Date.now(),
      lifetime: 1000 // 1 second
    });
  }
  
  /**
   * Process a shield impact
   * @param {Object} shield - The shield that was hit
   * @param {number} damage - Damage amount
   * @param {THREE.Vector3} hitPoint - Point of impact
   */
  processShieldImpact(shield, damage, hitPoint) {
    if (!shield) return;
    
    // Apply damage to shield
    const remainingDamage = shield.absorbDamage ? shield.absorbDamage(damage) : damage;
    
    // Show shield impact effect
    this.showShieldImpactEffect(shield, hitPoint, damage);
    
    // Emit shield impact event
    this.events.emit('shieldImpact', {
      shield: shield,
      damage: damage,
      remainingDamage: remainingDamage,
      hitPoint: hitPoint
    });
    
    return remainingDamage;
  }
  
  /**
   * Show shield impact effect
   * @param {Object} shield - The shield that was hit
   * @param {THREE.Vector3} hitPoint - Point of impact
   * @param {number} damage - Damage amount
   */
  showShieldImpactEffect(shield, hitPoint, damage) {
    // TODO: Implement shield impact visualization
    // This would typically be a ripple effect on the shield surface
  }
  
  /**
   * Update the damage system
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Update hit effects
    this.updateHitEffects(deltaTime);
    
    // Update debug hit markers
    if (this.debugEnabled) {
      this.updateDebugHitMarkers();
    }
  }
  
  /**
   * Update hit effects
   * @param {number} deltaTime - Time since last update
   */
  updateHitEffects(deltaTime) {
    this.hitEffects.forEach(effect => {
      if (!effect.userData.active) return;
      
      // Update lifetime
      effect.userData.lifetime += deltaTime;
      
      // Check if effect should be deactivated
      if (effect.userData.lifetime >= effect.userData.maxLifetime) {
        effect.visible = false;
        effect.userData.active = false;
        return;
      }
      
      // Update effect (fade out, scale down, etc.)
      const progress = effect.userData.lifetime / effect.userData.maxLifetime;
      const opacity = 1 - progress;
      
      // Update material opacity
      if (effect.userData.particles && effect.userData.particles.material) {
        effect.userData.particles.material.opacity = opacity;
      }
      
      // Scale down slightly
      const scale = 1 + progress * 0.5;
      effect.scale.set(scale, scale, scale);
    });
  }
  
  /**
   * Update debug hit markers
   */
  updateDebugHitMarkers() {
    const now = Date.now();
    
    // Remove expired markers
    this.debugHitMarkers = this.debugHitMarkers.filter(marker => {
      const age = now - marker.createdAt;
      
      if (age > marker.lifetime) {
        // Remove from scene
        this.scene.remove(marker.sprite);
        
        // Dispose of resources
        if (marker.sprite.material) {
          if (marker.sprite.material.map) {
            marker.sprite.material.map.dispose();
          }
          marker.sprite.material.dispose();
        }
        
        return false;
      }
      
      // Update opacity based on age
      const opacity = 1 - (age / marker.lifetime);
      marker.sprite.material.opacity = opacity;
      
      // Move upward slowly
      marker.sprite.position.y += 0.01;
      
      return true;
    });
  }
  
  /**
   * Set global damage multiplier
   * @param {number} multiplier - New global damage multiplier
   */
  setGlobalDamageMultiplier(multiplier) {
    this.globalDamageMultiplier = multiplier;
  }
  
  /**
   * Set damage modifier for a specific source
   * @param {string} source - Source identifier
   * @param {number} modifier - Damage modifier
   */
  setDamageModifier(source, modifier) {
    this.damageModifiers[source] = modifier;
  }
  
  /**
   * Set critical hit parameters
   * @param {number} chance - Critical hit chance (0-1)
   * @param {number} multiplier - Critical hit damage multiplier
   */
  setCriticalHitParams(chance, multiplier) {
    this.criticalHitChance = chance;
    this.criticalHitMultiplier = multiplier;
  }
  
  /**
   * Enable or disable debug visualization
   * @param {boolean} enabled - Whether debug should be enabled
   */
  setDebugEnabled(enabled) {
    this.debugEnabled = enabled;
    
    // Clear existing debug markers if disabling
    if (!enabled) {
      this.clearDebugMarkers();
    }
  }
  
  /**
   * Clear all debug markers
   */
  clearDebugMarkers() {
    this.debugHitMarkers.forEach(marker => {
      this.scene.remove(marker.sprite);
      
      // Dispose of resources
      if (marker.sprite.material) {
        if (marker.sprite.material.map) {
          marker.sprite.material.map.dispose();
        }
        marker.sprite.material.dispose();
      }
    });
    
    this.debugHitMarkers = [];
  }
  
  /**
   * Dispose of resources
   */
  dispose() {
    // Clean up hit effects
    this.hitEffects.forEach(effect => {
      this.scene.remove(effect);
      
      // Dispose of geometries and materials
      if (effect.userData.particles) {
        effect.userData.particles.geometry.dispose();
        effect.userData.particles.material.dispose();
      }
    });
    
    // Clear arrays
    this.hitEffects = [];
    
    // Clear debug markers
    this.clearDebugMarkers();
  }
} 