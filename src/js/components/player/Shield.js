import * as THREE from 'three';

export class Shield {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    
    // Shield properties
    this.active = true;
    this.radius = 0.7; // Slightly larger than player
    this.opacity = 0.3;
    this.color = new THREE.Color(0x00aaff);
    this.pulseSpeed = 1.0;
    this.pulseIntensity = 0.2;
    
    // Create shield visual
    this.createShieldMesh();
    
    // Hit effect properties
    this.hitEffects = [];
    this.hitEffectDuration = 0.5; // seconds
  }
  
  createShieldMesh() {
    // Create shield geometry (sphere)
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    
    // Create shield material
    this.material = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: this.opacity,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    // Create shield mesh
    this.mesh = new THREE.Mesh(geometry, this.material);
    
    // Add to scene
    this.scene.add(this.mesh);
    
    // Create inner shield (for double-layer effect)
    const innerGeometry = new THREE.SphereGeometry(this.radius * 0.95, 24, 24);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: this.opacity * 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    this.innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
    this.scene.add(this.innerMesh);
  }
  
  onHit(position, intensity = 1.0) {
    // Create a hit effect at the impact position
    const hitEffect = this.createHitEffect(position, intensity);
    this.hitEffects.push({
      mesh: hitEffect,
      startTime: performance.now() / 1000,
      duration: this.hitEffectDuration,
      intensity: intensity,
    });
    
    // Flash the entire shield
    this.flashShield(intensity);
  }
  
  createHitEffect(position, intensity) {
    // Calculate hit position on shield surface
    const direction = position.clone().sub(this.player.getPosition()).normalize();
    const hitPosition = this.player.getPosition().clone().add(
      direction.multiplyScalar(this.radius)
    );
    
    // Create hit effect geometry
    const geometry = new THREE.CircleGeometry(this.radius * 0.3 * intensity, 16);
    
    // Create hit effect material
    const material = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    // Create hit effect mesh
    const hitMesh = new THREE.Mesh(geometry, material);
    
    // Position and orient the hit effect
    hitMesh.position.copy(hitPosition);
    hitMesh.lookAt(this.player.getPosition());
    
    // Add to scene
    this.scene.add(hitMesh);
    
    return hitMesh;
  }
  
  flashShield(intensity) {
    // Increase shield opacity temporarily
    const baseOpacity = this.opacity;
    const maxOpacity = Math.min(baseOpacity + 0.4 * intensity, 0.9);
    
    this.material.opacity = maxOpacity;
    
    // Fade back to normal
    setTimeout(() => {
      this.material.opacity = baseOpacity;
    }, 100);
  }
  
  updateHitEffects(deltaTime) {
    const now = performance.now() / 1000;
    const expiredEffects = [];
    
    // Update each hit effect
    this.hitEffects.forEach((effect, index) => {
      const elapsed = now - effect.startTime;
      const progress = elapsed / effect.duration;
      
      if (progress >= 1.0) {
        // Effect has expired
        this.scene.remove(effect.mesh);
        expiredEffects.push(index);
      } else {
        // Update effect (fade out and expand)
        effect.mesh.material.opacity = 0.7 * (1.0 - progress);
        effect.mesh.scale.set(
          1.0 + progress,
          1.0 + progress,
          1.0 + progress
        );
      }
    });
    
    // Remove expired effects
    for (let i = expiredEffects.length - 1; i >= 0; i--) {
      this.hitEffects.splice(expiredEffects[i], 1);
    }
  }
  
  updateShieldVisual(deltaTime) {
    // Get current shield level from player
    const shieldData = this.player.getShield();
    
    // Update shield visibility based on shield level
    this.mesh.visible = shieldData.current > 0 && this.active;
    this.innerMesh.visible = shieldData.current > 0 && this.active;
    
    if (!this.mesh.visible) return;
    
    // Update shield position to follow player
    const playerPosition = this.player.getPosition();
    this.mesh.position.copy(playerPosition);
    this.mesh.position.y += this.player.height / 2; // Center on player
    
    this.innerMesh.position.copy(this.mesh.position);
    
    // Pulse effect
    const pulse = Math.sin(performance.now() / 1000 * this.pulseSpeed) * this.pulseIntensity;
    
    // Scale opacity based on shield health
    const healthFactor = shieldData.percentage;
    const baseOpacity = this.opacity * healthFactor;
    
    // Apply pulse to opacity
    this.material.opacity = baseOpacity + pulse * baseOpacity;
    this.innerMesh.material.opacity = baseOpacity * 0.5 + pulse * baseOpacity * 0.5;
    
    // Rotate shield slightly for visual effect
    this.mesh.rotation.y += deltaTime * 0.1;
    this.innerMesh.rotation.y -= deltaTime * 0.05;
  }
  
  setActive(active) {
    this.active = active;
  }
  
  update(deltaTime) {
    // Update shield visual
    this.updateShieldVisual(deltaTime);
    
    // Update hit effects
    this.updateHitEffects(deltaTime);
  }
} 
