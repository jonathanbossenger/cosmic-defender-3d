import * as THREE from 'three';
import { EventEmitter } from '../../utils/EventEmitter.js';

/**
 * FeedbackSystem - Handles visual and audio feedback for combat events
 */
export class FeedbackSystem {
  constructor(scene, camera, audioManager) {
    this.scene = scene;
    this.camera = camera;
    this.audioManager = audioManager;
    this.events = new EventEmitter();
    
    // DOM elements for UI feedback
    this.container = null;
    this.hitMarkerContainer = null;
    this.damageNumbersContainer = null;
    this.screenEffectsContainer = null;
    
    // Pools for reusing objects
    this.hitMarkers = [];
    this.damageNumbers = [];
    this.screenEffects = [];
    
    // Settings
    this.hitMarkerDuration = 0.3; // seconds
    this.damageNumberDuration = 1.0; // seconds
    this.screenEffectDuration = 0.5; // seconds
    
    // Active effects
    this.activeHitMarkers = [];
    this.activeDamageNumbers = [];
    this.activeScreenEffects = [];
    
    // 3D effects
    this.impactEffects = [];
    this.maxImpactEffects = 20;
    
    // Screen shake settings
    this.screenShake = {
      active: false,
      intensity: 0,
      duration: 0,
      elapsed: 0,
      originalPosition: new THREE.Vector3()
    };
    
    // Flags
    this.initialized = false;
  }
  
  /**
   * Initialize the feedback system
   */
  init() {
    if (this.initialized) return;
    
    // Create DOM containers
    this.createDOMContainers();
    
    // Initialize effect pools
    this.initHitMarkerPool();
    this.initDamageNumberPool();
    this.initScreenEffectPool();
    this.initImpactEffectPool();
    
    this.initialized = true;
    console.log('Feedback System initialized');
  }
  
  /**
   * Create DOM containers for UI effects
   */
  createDOMContainers() {
    // Main container
    this.container = document.createElement('div');
    this.container.className = 'feedback-container';
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '100';
    document.body.appendChild(this.container);
    
    // Hit marker container
    this.hitMarkerContainer = document.createElement('div');
    this.hitMarkerContainer.className = 'hit-marker-container';
    this.hitMarkerContainer.style.position = 'absolute';
    this.hitMarkerContainer.style.top = '50%';
    this.hitMarkerContainer.style.left = '50%';
    this.hitMarkerContainer.style.transform = 'translate(-50%, -50%)';
    this.container.appendChild(this.hitMarkerContainer);
    
    // Damage numbers container
    this.damageNumbersContainer = document.createElement('div');
    this.damageNumbersContainer.className = 'damage-numbers-container';
    this.damageNumbersContainer.style.position = 'absolute';
    this.damageNumbersContainer.style.top = '0';
    this.damageNumbersContainer.style.left = '0';
    this.damageNumbersContainer.style.width = '100%';
    this.damageNumbersContainer.style.height = '100%';
    this.container.appendChild(this.damageNumbersContainer);
    
    // Screen effects container
    this.screenEffectsContainer = document.createElement('div');
    this.screenEffectsContainer.className = 'screen-effects-container';
    this.screenEffectsContainer.style.position = 'absolute';
    this.screenEffectsContainer.style.top = '0';
    this.screenEffectsContainer.style.left = '0';
    this.screenEffectsContainer.style.width = '100%';
    this.screenEffectsContainer.style.height = '100%';
    this.container.appendChild(this.screenEffectsContainer);
  }
  
  /**
   * Initialize hit marker pool
   */
  initHitMarkerPool() {
    // Create hit marker elements
    for (let i = 0; i < 10; i++) {
      const hitMarker = document.createElement('div');
      hitMarker.className = 'hit-marker';
      hitMarker.style.position = 'absolute';
      hitMarker.style.width = '20px';
      hitMarker.style.height = '20px';
      hitMarker.style.opacity = '0';
      hitMarker.style.transition = 'opacity 0.1s ease-in-out';
      hitMarker.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <line x1="5" y1="5" x2="15" y2="15" stroke="white" stroke-width="2"/>
          <line x1="15" y1="5" x2="5" y2="15" stroke="white" stroke-width="2"/>
        </svg>
      `;
      
      this.hitMarkerContainer.appendChild(hitMarker);
      this.hitMarkers.push(hitMarker);
    }
  }
  
  /**
   * Initialize damage number pool
   */
  initDamageNumberPool() {
    // Create damage number elements
    for (let i = 0; i < 20; i++) {
      const damageNumber = document.createElement('div');
      damageNumber.className = 'damage-number';
      damageNumber.style.position = 'absolute';
      damageNumber.style.fontFamily = 'Arial, sans-serif';
      damageNumber.style.fontWeight = 'bold';
      damageNumber.style.fontSize = '16px';
      damageNumber.style.color = 'white';
      damageNumber.style.textShadow = '1px 1px 2px rgba(0, 0, 0, 0.8)';
      damageNumber.style.opacity = '0';
      damageNumber.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
      damageNumber.style.pointerEvents = 'none';
      
      this.damageNumbersContainer.appendChild(damageNumber);
      this.damageNumbers.push(damageNumber);
    }
  }
  
  /**
   * Initialize screen effect pool
   */
  initScreenEffectPool() {
    // Create screen effect elements
    for (let i = 0; i < 5; i++) {
      const screenEffect = document.createElement('div');
      screenEffect.className = 'screen-effect';
      screenEffect.style.position = 'absolute';
      screenEffect.style.top = '0';
      screenEffect.style.left = '0';
      screenEffect.style.width = '100%';
      screenEffect.style.height = '100%';
      screenEffect.style.opacity = '0';
      screenEffect.style.transition = 'opacity 0.2s ease-in-out';
      screenEffect.style.pointerEvents = 'none';
      
      this.screenEffectsContainer.appendChild(screenEffect);
      this.screenEffects.push(screenEffect);
    }
  }
  
  /**
   * Initialize impact effect pool
   */
  initImpactEffectPool() {
    for (let i = 0; i < this.maxImpactEffects; i++) {
      const effect = this.createImpactEffect();
      effect.visible = false;
      this.impactEffects.push(effect);
      this.scene.add(effect);
    }
  }
  
  /**
   * Create an impact effect mesh
   * @returns {THREE.Object3D} The impact effect object
   */
  createImpactEffect() {
    const group = new THREE.Group();
    
    // Create a simple particle effect
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    
    const particles = new THREE.InstancedMesh(geometry, material, 8);
    
    // Position particles in a small explosion pattern
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 8; i++) {
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
      type: 'impactEffect',
      particles: particles
    };
    
    return group;
  }
  
  /**
   * Show a hit marker
   * @param {boolean} isCritical - Whether this was a critical hit
   */
  showHitMarker(isCritical = false) {
    // Find an available hit marker
    const hitMarker = this.hitMarkers.find(marker => !marker.classList.contains('active'));
    if (!hitMarker) return;
    
    // Set hit marker properties
    hitMarker.classList.add('active');
    hitMarker.style.opacity = '1';
    
    // Set color based on critical hit
    const color = isCritical ? '#ff0000' : '#ffffff';
    const lines = hitMarker.querySelectorAll('line');
    lines.forEach(line => {
      line.setAttribute('stroke', color);
    });
    
    // Scale based on critical hit
    const scale = isCritical ? 1.5 : 1.0;
    hitMarker.style.transform = `scale(${scale})`;
    
    // Play hit marker sound
    if (this.audioManager) {
      this.audioManager.playSound(isCritical ? 'hitCritical' : 'hit');
    }
    
    // Add to active hit markers
    this.activeHitMarkers.push({
      element: hitMarker,
      elapsed: 0,
      duration: this.hitMarkerDuration,
      isCritical: isCritical
    });
  }
  
  /**
   * Show a damage number
   * @param {number} damage - Damage amount
   * @param {THREE.Vector3} worldPosition - World position
   * @param {boolean} isCritical - Whether this was a critical hit
   */
  showDamageNumber(damage, worldPosition, isCritical = false) {
    // Find an available damage number
    const damageNumber = this.damageNumbers.find(number => !number.classList.contains('active'));
    if (!damageNumber) return;
    
    // Convert world position to screen position
    const screenPosition = this.worldToScreen(worldPosition);
    if (!screenPosition) return;
    
    // Set damage number properties
    damageNumber.classList.add('active');
    damageNumber.textContent = damage.toString();
    damageNumber.style.left = `${screenPosition.x}px`;
    damageNumber.style.top = `${screenPosition.y}px`;
    damageNumber.style.opacity = '1';
    
    // Set color and size based on critical hit
    if (isCritical) {
      damageNumber.style.color = '#ff0000';
      damageNumber.style.fontSize = '24px';
    } else {
      damageNumber.style.color = '#ffffff';
      damageNumber.style.fontSize = '16px';
    }
    
    // Add random offset
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 40;
    damageNumber.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    
    // Add to active damage numbers
    this.activeDamageNumbers.push({
      element: damageNumber,
      elapsed: 0,
      duration: this.damageNumberDuration,
      startPosition: { x: screenPosition.x, y: screenPosition.y },
      offsetX: offsetX,
      offsetY: offsetY,
      worldPosition: worldPosition.clone(),
      isCritical: isCritical
    });
  }
  
  /**
   * Show a screen effect
   * @param {string} type - Effect type ('damage', 'heal', 'critical', etc.)
   * @param {number} intensity - Effect intensity (0-1)
   */
  showScreenEffect(type, intensity = 0.5) {
    // Find an available screen effect
    const screenEffect = this.screenEffects.find(effect => !effect.classList.contains('active'));
    if (!screenEffect) return;
    
    // Set screen effect properties
    screenEffect.classList.add('active');
    screenEffect.style.opacity = Math.min(0.8, intensity);
    
    // Set color and style based on type
    switch (type) {
      case 'damage':
        screenEffect.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        screenEffect.style.boxShadow = 'inset 0 0 50px rgba(255, 0, 0, 0.5)';
        break;
      case 'heal':
        screenEffect.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
        screenEffect.style.boxShadow = 'inset 0 0 50px rgba(0, 255, 0, 0.4)';
        break;
      case 'critical':
        screenEffect.style.backgroundColor = 'rgba(255, 0, 0, 0.4)';
        screenEffect.style.boxShadow = 'inset 0 0 100px rgba(255, 0, 0, 0.6)';
        break;
      case 'shield':
        screenEffect.style.backgroundColor = 'rgba(0, 100, 255, 0.2)';
        screenEffect.style.boxShadow = 'inset 0 0 50px rgba(0, 100, 255, 0.4)';
        break;
      default:
        screenEffect.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        screenEffect.style.boxShadow = 'inset 0 0 50px rgba(255, 255, 255, 0.4)';
    }
    
    // Add to active screen effects
    this.activeScreenEffects.push({
      element: screenEffect,
      elapsed: 0,
      duration: this.screenEffectDuration,
      type: type,
      intensity: intensity
    });
    
    // Play screen effect sound
    if (this.audioManager) {
      this.audioManager.playSound(type);
    }
  }
  
  /**
   * Show an impact effect at the specified position
   * @param {THREE.Vector3} position - Position to show the effect
   * @param {string} type - Type of impact ('hit', 'critical', 'shield', etc.)
   */
  showImpactEffect(position, type = 'hit') {
    // Find an available impact effect
    const effect = this.impactEffects.find(e => !e.userData.active);
    if (!effect) return;
    
    // Position the effect
    effect.position.copy(position);
    
    // Set effect properties based on type
    const material = effect.userData.particles.material;
    
    switch (type) {
      case 'hit':
        material.color.set(0xffffff);
        effect.scale.set(1.0, 1.0, 1.0);
        break;
      case 'critical':
        material.color.set(0xff0000);
        effect.scale.set(1.5, 1.5, 1.5);
        break;
      case 'shield':
        material.color.set(0x00aaff);
        effect.scale.set(1.2, 1.2, 1.2);
        break;
      case 'explosive':
        material.color.set(0xff6600);
        effect.scale.set(2.0, 2.0, 2.0);
        break;
      default:
        material.color.set(0xffffff);
        effect.scale.set(1.0, 1.0, 1.0);
    }
    
    // Activate the effect
    effect.visible = true;
    effect.userData.active = true;
    effect.userData.lifetime = 0;
    
    // Play impact sound
    if (this.audioManager) {
      this.audioManager.playSound(`impact_${type}`);
    }
  }
  
  /**
   * Start screen shake effect
   * @param {number} intensity - Shake intensity
   * @param {number} duration - Shake duration in seconds
   */
  startScreenShake(intensity = 0.5, duration = 0.5) {
    // Store original camera position if not already shaking
    if (!this.screenShake.active) {
      this.screenShake.originalPosition.copy(this.camera.position);
    }
    
    // Set screen shake parameters
    this.screenShake.active = true;
    this.screenShake.intensity = intensity;
    this.screenShake.duration = duration;
    this.screenShake.elapsed = 0;
  }
  
  /**
   * Update screen shake effect
   * @param {number} deltaTime - Time since last update
   */
  updateScreenShake(deltaTime) {
    if (!this.screenShake.active) return;
    
    // Update elapsed time
    this.screenShake.elapsed += deltaTime;
    
    // Check if screen shake should end
    if (this.screenShake.elapsed >= this.screenShake.duration) {
      // Reset camera position
      this.camera.position.copy(this.screenShake.originalPosition);
      this.screenShake.active = false;
      return;
    }
    
    // Calculate remaining intensity
    const remainingFactor = 1 - (this.screenShake.elapsed / this.screenShake.duration);
    const currentIntensity = this.screenShake.intensity * remainingFactor;
    
    // Apply random offset to camera
    const offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
    const offsetY = (Math.random() - 0.5) * 2 * currentIntensity;
    const offsetZ = (Math.random() - 0.5) * 2 * currentIntensity * 0.5; // Less Z-axis shake
    
    // Apply offset to camera
    this.camera.position.set(
      this.screenShake.originalPosition.x + offsetX,
      this.screenShake.originalPosition.y + offsetY,
      this.screenShake.originalPosition.z + offsetZ
    );
  }
  
  /**
   * Process a hit event
   * @param {Object} hitData - Data about the hit
   */
  processHit(hitData) {
    const { damage, isCritical, hitPoint, type } = hitData;
    
    // Show hit marker
    this.showHitMarker(isCritical);
    
    // Show damage number
    if (hitPoint && damage > 0) {
      this.showDamageNumber(damage, hitPoint, isCritical);
    }
    
    // Show impact effect
    if (hitPoint) {
      this.showImpactEffect(hitPoint, isCritical ? 'critical' : 'hit');
    }
    
    // Show screen effect for critical hits
    if (isCritical) {
      this.showScreenEffect('critical', 0.3);
      this.startScreenShake(0.2, 0.3);
    }
    
    // Emit hit processed event
    this.events.emit('hitProcessed', hitData);
  }
  
  /**
   * Process a player damage event
   * @param {Object} damageData - Data about the damage
   */
  processPlayerDamage(damageData) {
    const { damage, isCritical, source } = damageData;
    
    // Show screen effect
    this.showScreenEffect('damage', Math.min(damage / 50, 0.8));
    
    // Start screen shake
    const intensity = Math.min(damage / 30, 0.5);
    this.startScreenShake(intensity, 0.4);
    
    // Emit player damage processed event
    this.events.emit('playerDamageProcessed', damageData);
  }
  
  /**
   * Process a player heal event
   * @param {Object} healData - Data about the healing
   */
  processPlayerHeal(healData) {
    const { amount } = healData;
    
    // Show screen effect
    this.showScreenEffect('heal', Math.min(amount / 50, 0.5));
    
    // Emit player heal processed event
    this.events.emit('playerHealProcessed', healData);
  }
  
  /**
   * Convert world position to screen position
   * @param {THREE.Vector3} worldPosition - Position in 3D world
   * @returns {Object|null} Screen position {x, y} or null if behind camera
   */
  worldToScreen(worldPosition) {
    // Create a copy of the position
    const position = worldPosition.clone();
    
    // Project position to screen space
    position.project(this.camera);
    
    // Check if the point is in front of the camera
    if (position.z > 1) return null;
    
    // Convert to screen coordinates
    return {
      x: (position.x * 0.5 + 0.5) * window.innerWidth,
      y: (-position.y * 0.5 + 0.5) * window.innerHeight
    };
  }
  
  /**
   * Update the feedback system
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    // Update hit markers
    this.updateHitMarkers(deltaTime);
    
    // Update damage numbers
    this.updateDamageNumbers(deltaTime);
    
    // Update screen effects
    this.updateScreenEffects(deltaTime);
    
    // Update impact effects
    this.updateImpactEffects(deltaTime);
    
    // Update screen shake
    this.updateScreenShake(deltaTime);
  }
  
  /**
   * Update hit markers
   * @param {number} deltaTime - Time since last update
   */
  updateHitMarkers(deltaTime) {
    // Update active hit markers
    this.activeHitMarkers = this.activeHitMarkers.filter(marker => {
      // Update elapsed time
      marker.elapsed += deltaTime;
      
      // Check if marker should be removed
      if (marker.elapsed >= marker.duration) {
        // Reset marker
        marker.element.style.opacity = '0';
        marker.element.classList.remove('active');
        return false;
      }
      
      // Update marker (fade out)
      const remainingFactor = 1 - (marker.elapsed / marker.duration);
      marker.element.style.opacity = remainingFactor.toString();
      
      return true;
    });
  }
  
  /**
   * Update damage numbers
   * @param {number} deltaTime - Time since last update
   */
  updateDamageNumbers(deltaTime) {
    // Update active damage numbers
    this.activeDamageNumbers = this.activeDamageNumbers.filter(number => {
      // Update elapsed time
      number.elapsed += deltaTime;
      
      // Check if number should be removed
      if (number.elapsed >= number.duration) {
        // Reset number
        number.element.style.opacity = '0';
        number.element.classList.remove('active');
        return false;
      }
      
      // Update number position if it has a world position
      if (number.worldPosition) {
        const screenPosition = this.worldToScreen(number.worldPosition);
        if (screenPosition) {
          number.startPosition = screenPosition;
        }
      }
      
      // Update number (float up and fade out)
      const progress = number.elapsed / number.duration;
      const remainingFactor = 1 - progress;
      
      // Move upward
      const floatOffset = progress * -50; // Move up 50px over lifetime
      
      // Update position and opacity
      number.element.style.left = `${number.startPosition.x}px`;
      number.element.style.top = `${number.startPosition.y}px`;
      number.element.style.transform = `translate(${number.offsetX}px, ${number.offsetY + floatOffset}px)`;
      number.element.style.opacity = remainingFactor.toString();
      
      return true;
    });
  }
  
  /**
   * Update screen effects
   * @param {number} deltaTime - Time since last update
   */
  updateScreenEffects(deltaTime) {
    // Update active screen effects
    this.activeScreenEffects = this.activeScreenEffects.filter(effect => {
      // Update elapsed time
      effect.elapsed += deltaTime;
      
      // Check if effect should be removed
      if (effect.elapsed >= effect.duration) {
        // Reset effect
        effect.element.style.opacity = '0';
        effect.element.classList.remove('active');
        return false;
      }
      
      // Update effect (fade out)
      const remainingFactor = 1 - (effect.elapsed / effect.duration);
      effect.element.style.opacity = (remainingFactor * effect.intensity).toString();
      
      return true;
    });
  }
  
  /**
   * Update impact effects
   * @param {number} deltaTime - Time since last update
   */
  updateImpactEffects(deltaTime) {
    this.impactEffects.forEach(effect => {
      if (!effect.userData.active) return;
      
      // Update lifetime
      effect.userData.lifetime += deltaTime;
      
      // Check if effect should be deactivated
      if (effect.userData.lifetime >= effect.userData.maxLifetime) {
        effect.visible = false;
        effect.userData.active = false;
        return;
      }
      
      // Update effect (fade out, scale up)
      const progress = effect.userData.lifetime / effect.userData.maxLifetime;
      const opacity = 1 - progress;
      
      // Update material opacity
      if (effect.userData.particles && effect.userData.particles.material) {
        effect.userData.particles.material.opacity = opacity;
      }
      
      // Scale up slightly
      const scale = 1 + progress;
      effect.scale.multiplyScalar(1 + deltaTime);
    });
  }
  
  /**
   * Dispose of resources
   */
  dispose() {
    // Remove DOM elements
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Clean up impact effects
    this.impactEffects.forEach(effect => {
      this.scene.remove(effect);
      
      // Dispose of geometries and materials
      if (effect.userData.particles) {
        effect.userData.particles.geometry.dispose();
        effect.userData.particles.material.dispose();
      }
    });
    
    // Clear arrays
    this.hitMarkers = [];
    this.damageNumbers = [];
    this.screenEffects = [];
    this.impactEffects = [];
    
    this.activeHitMarkers = [];
    this.activeDamageNumbers = [];
    this.activeScreenEffects = [];
    
    // Reset flags
    this.initialized = false;
  }
} 