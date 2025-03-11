import { Enemy } from '../base/Enemy.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { MathUtils } from '../../utils/math.js';

/**
 * Commander enemy type
 * Powerful leader enemy that buffs nearby allies
 */
export class Commander extends Enemy {
  /**
   * Create a new commander enemy
   * @param {THREE.Scene} scene - The scene to add the enemy to
   * @param {Object} physics - The physics world
   * @param {Object} options - Enemy options
   */
  constructor(scene, physics, options = {}) {
    // Set commander-specific default options
    const commanderOptions = Object.assign({
      type: 'commander',
      health: 200,
      maxHealth: 200,
      damage: 30,
      moveSpeed: 2.5, // Slower but more powerful
      turnSpeed: 1.5,
      scale: 1.5,     // Larger
      color: 0xff0000, // Red color
      points: 500,    // Worth more points
      attackRange: 18,
      attackRate: 0.5, // Attacks per second
      detectionRange: 30,
      model: null,
      // Commander-specific properties
      buffRadius: 10,
      buffStrength: 1.25, // 25% buff to allies
      summonCooldown: 15, // Seconds between summons
      summonCount: 3,     // Number of drones to summon
      minionTypes: ['drone'], // Types of minions to summon
    }, options);
    
    // Call parent constructor
    super(scene, physics, commanderOptions);
    
    // Commander-specific properties
    this.lastSummonTime = 0;
    this.minions = new Set();
    this.buffedEnemies = new Set();
    
    // Add summon state to state machine
    this.stateMachine.states.summon = {
      enter: this.enterSummonState.bind(this),
      update: this.updateSummonState.bind(this),
      exit: this.exitSummonState.bind(this)
    };
    
    // Override default mesh with commander-specific mesh
    this.createCommanderMesh();
    
    // Create buff aura
    this.createBuffAura();
  }
  
  /**
   * Create a commander-specific mesh
   */
  createCommanderMesh() {
    // Remove default mesh
    if (this.mesh) {
      this.scene.remove(this.mesh);
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(material => material.dispose());
        } else {
          this.mesh.material.dispose();
        }
      }
    }
    
    // Create commander group
    this.mesh = new THREE.Group();
    
    // Create body geometry
    const bodyGeometry = new THREE.DodecahedronGeometry(0.8, 1);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.options.color,
      roughness: 0.3,
      metalness: 0.7,
      emissive: new THREE.Color(this.options.color).multiplyScalar(0.3)
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = 1.0;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.mesh.add(bodyMesh);
    
    // Create crown/spikes
    const spikeCount = 5;
    for (let i = 0; i < spikeCount; i++) {
      const spikeGeometry = new THREE.ConeGeometry(0.15, 0.5, 4);
      const spikeMaterial = new THREE.MeshStandardMaterial({
        color: this.options.color,
        roughness: 0.3,
        metalness: 0.8,
        emissive: new THREE.Color(this.options.color).multiplyScalar(0.5)
      });
      const spikeMesh = new THREE.Mesh(spikeGeometry, spikeMaterial);
      
      // Position in a circle on top of the body
      const angle = (i / spikeCount) * Math.PI * 2;
      const radius = 0.4;
      spikeMesh.position.set(
        Math.cos(angle) * radius,
        1.8,
        Math.sin(angle) * radius
      );
      
      // Rotate to point outward
      spikeMesh.rotation.x = Math.PI / 2;
      spikeMesh.rotation.z = -angle;
      
      this.mesh.add(spikeMesh);
    }
    
    // Create hovering platform
    const platformGeometry = new THREE.CylinderGeometry(0.9, 1.1, 0.2, 16);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.5,
      metalness: 0.8,
      emissive: new THREE.Color(this.options.color).multiplyScalar(0.1)
    });
    const platformMesh = new THREE.Mesh(platformGeometry, platformMaterial);
    platformMesh.position.y = 0.1;
    platformMesh.castShadow = true;
    platformMesh.receiveShadow = true;
    this.mesh.add(platformMesh);
    
    // Create energy core
    const coreGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: this.options.color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    this.coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    this.coreMesh.position.y = 1.0;
    this.mesh.add(this.coreMesh);
    
    // Add core light
    this.coreLight = new THREE.PointLight(this.options.color, 1, 5);
    this.coreLight.position.copy(this.coreMesh.position);
    this.mesh.add(this.coreLight);
    
    // Scale the entire mesh
    this.mesh.scale.multiplyScalar(this.options.scale);
    
    // Add to scene
    this.scene.add(this.mesh);
    
    // Store reference to enemy in userData
    this.mesh.userData.isEnemy = true;
    this.mesh.userData.enemyInstance = this;
    
    // Create health bar
    this.createHealthBar();
  }
  
  /**
   * Create buff aura
   */
  createBuffAura() {
    // Create aura geometry
    const auraGeometry = new THREE.RingGeometry(
      this.options.buffRadius - 0.2,
      this.options.buffRadius,
      32
    );
    
    // Create aura material
    this.auraMaterial = new THREE.MeshBasicMaterial({
      color: this.options.color,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    // Create aura mesh
    this.auraMesh = new THREE.Mesh(auraGeometry, this.auraMaterial);
    this.auraMesh.rotation.x = Math.PI / 2; // Lay flat
    this.auraMesh.position.y = 0.1;
    
    // Add to scene
    this.scene.add(this.auraMesh);
  }
  
  /**
   * Update the commander
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (!this.isActive || !this.isAlive) return;
    
    // Update core
    this.updateCore(deltaTime);
    
    // Update buff aura
    this.updateBuffAura();
    
    // Check if should summon minions
    this.checkSummonMinions();
    
    // Call parent update
    super.update(deltaTime);
  }
  
  /**
   * Update core animation
   * @param {number} deltaTime - Time since last update
   */
  updateCore(deltaTime) {
    if (!this.coreMesh) return;
    
    // Pulse the core
    const pulseScale = 0.8 + 0.2 * Math.sin(performance.now() / 300);
    this.coreMesh.scale.set(pulseScale, pulseScale, pulseScale);
    
    // Pulse the light intensity
    if (this.coreLight) {
      this.coreLight.intensity = 0.8 + 0.4 * Math.sin(performance.now() / 300);
    }
  }
  
  /**
   * Update buff aura
   */
  updateBuffAura() {
    if (!this.auraMesh) return;
    
    // Update position to follow commander
    this.auraMesh.position.x = this.position.x;
    this.auraMesh.position.z = this.position.z;
    
    // Pulse opacity
    this.auraMaterial.opacity = 0.1 + 0.1 * Math.sin(performance.now() / 1000);
    
    // Apply buff to nearby enemies
    this.applyBuffToNearbyEnemies();
  }
  
  /**
   * Apply buff to nearby enemies
   */
  applyBuffToNearbyEnemies() {
    // Clear previously buffed enemies
    this.buffedEnemies.clear();
    
    // Find all enemies in the scene
    this.scene.traverse(object => {
      if (object.userData && object.userData.isEnemy && object !== this.mesh) {
        const enemy = object.userData.enemyInstance;
        
        if (enemy && enemy.isActive && enemy.isAlive) {
          // Check if in buff range
          const distance = this.position.distanceTo(enemy.position);
          
          if (distance <= this.options.buffRadius) {
            // Apply buff
            if (!enemy.isBuffed) {
              enemy.isBuffed = true;
              enemy.originalDamage = enemy.options.damage;
              enemy.options.damage *= this.options.buffStrength;
              
              // Visual indicator for buffed enemy
              this.createBuffEffect(enemy);
            }
            
            // Add to buffed set
            this.buffedEnemies.add(enemy);
          } else if (enemy.isBuffed) {
            // Remove buff if out of range
            enemy.isBuffed = false;
            enemy.options.damage = enemy.originalDamage;
          }
        }
      }
    });
  }
  
  /**
   * Create visual effect for buffed enemy
   * @param {Enemy} enemy - The enemy to buff
   */
  createBuffEffect(enemy) {
    // Create buff indicator
    const indicatorGeometry = new THREE.RingGeometry(0.6, 0.7, 16);
    const indicatorMaterial = new THREE.MeshBasicMaterial({
      color: this.options.color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    const indicatorMesh = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicatorMesh.rotation.x = Math.PI / 2; // Lay flat
    indicatorMesh.position.y = 0.1;
    
    // Add to enemy
    enemy.mesh.add(indicatorMesh);
    enemy.buffIndicator = indicatorMesh;
    
    // Animate indicator
    const animate = () => {
      // Check if enemy is still buffed
      if (!enemy.isBuffed || !enemy.isActive || !enemy.isAlive) {
        // Remove indicator
        if (enemy.mesh && enemy.buffIndicator) {
          enemy.mesh.remove(enemy.buffIndicator);
          indicatorGeometry.dispose();
          indicatorMaterial.dispose();
          enemy.buffIndicator = null;
        }
        return;
      }
      
      // Rotate indicator
      indicatorMesh.rotation.z += 0.02;
      
      // Pulse opacity
      indicatorMaterial.opacity = 0.3 + 0.2 * Math.sin(performance.now() / 500);
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
  }
  
  /**
   * Check if should summon minions
   */
  checkSummonMinions() {
    if (!this.isActive || !this.isAlive) return;
    
    // Check if can summon
    const currentTime = performance.now() / 1000;
    if (currentTime - this.lastSummonTime < this.options.summonCooldown) return;
    
    // Check if health is low or random chance
    const healthPercent = this.health / this.options.maxHealth;
    if (healthPercent < 0.5 || Math.random() < 0.01) {
      // Change to summon state
      this.changeState('summon');
      this.lastSummonTime = currentTime;
    }
  }
  
  /**
   * Override attack method to implement commander-specific attack
   * @param {number} currentTime - Current time
   * @returns {boolean} True if attack was performed
   */
  attackTarget(currentTime) {
    if (!this.target || !this.isActive || !this.isAlive) return false;
    
    // Check if can attack
    const timeSinceLastAttack = currentTime - this.lastAttackTime;
    if (timeSinceLastAttack < 1 / this.options.attackRate) return false;
    
    // Check if target is in range
    const distanceToTarget = this.position.distanceTo(this.target.position);
    if (distanceToTarget > this.options.attackRange) return false;
    
    // Perform attack
    this.lastAttackTime = currentTime;
    
    // Create energy beam
    this.createEnergyBeam();
    
    return true;
  }
  
  /**
   * Create energy beam attack
   */
  createEnergyBeam() {
    if (!this.target) return;
    
    // Calculate direction to target
    const direction = new THREE.Vector3()
      .subVectors(this.target.position, this.position)
      .normalize();
    
    // Create beam source position
    const sourcePosition = new THREE.Vector3();
    this.coreMesh.getWorldPosition(sourcePosition);
    
    // Create beam end position
    const targetPosition = this.target.position.clone();
    
    // Create beam geometry
    const beamGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
    beamGeometry.rotateX(Math.PI / 2); // Align with z-axis
    
    // Create beam material
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: this.options.color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    // Create beam mesh
    const beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
    
    // Position and scale beam
    const distance = sourcePosition.distanceTo(targetPosition);
    beamMesh.scale.set(1, 1, distance);
    beamMesh.position.copy(sourcePosition);
    beamMesh.position.add(direction.clone().multiplyScalar(distance / 2));
    
    // Look at target
    beamMesh.lookAt(targetPosition);
    
    // Add to scene
    this.scene.add(beamMesh);
    
    // Create impact effect
    this.createBeamImpact(targetPosition);
    
    // Animate beam
    let time = 0;
    const duration = 0.5;
    
    const animate = () => {
      time += 0.016; // Assuming 60fps
      
      // Pulse beam
      const pulseScale = 1 + 0.5 * Math.sin(time * 20);
      beamMesh.scale.x = pulseScale;
      beamMesh.scale.y = pulseScale;
      
      // Fade out
      beamMaterial.opacity = Math.max(0, 0.8 * (1 - time / duration));
      
      // Check if animation is done
      if (time >= duration) {
        // Remove beam
        this.scene.remove(beamMesh);
        beamGeometry.dispose();
        beamMaterial.dispose();
        return;
      }
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
  }
  
  /**
   * Create beam impact effect
   * @param {THREE.Vector3} position - Impact position
   */
  createBeamImpact(position) {
    // Create impact geometry
    const impactGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    
    // Create impact material
    const impactMaterial = new THREE.MeshBasicMaterial({
      color: this.options.color,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });
    
    // Create impact mesh
    const impactMesh = new THREE.Mesh(impactGeometry, impactMaterial);
    impactMesh.position.copy(position);
    
    // Add to scene
    this.scene.add(impactMesh);
    
    // Add impact light
    const impactLight = new THREE.PointLight(this.options.color, 2, 8);
    impactLight.position.copy(position);
    this.scene.add(impactLight);
    
    // Animate impact
    let time = 0;
    const duration = 0.5;
    
    const animate = () => {
      time += 0.016; // Assuming 60fps
      
      // Expand and fade
      const scale = 1 + time * 4;
      impactMesh.scale.set(scale, scale, scale);
      
      // Fade out
      impactMaterial.opacity = Math.max(0, 1 - time / duration);
      
      // Fade light
      impactLight.intensity = Math.max(0, 2 - time / duration * 4);
      
      // Check if animation is done
      if (time >= duration) {
        // Remove impact
        this.scene.remove(impactMesh);
        this.scene.remove(impactLight);
        impactGeometry.dispose();
        impactMaterial.dispose();
        return;
      }
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
  }
  
  // Summon state
  enterSummonState() {
    // Stop movement
    this.body.velocity.set(0, 0, 0);
    
    // Set timer for summon duration
    this.summonTimer = 2.0;
    this.summonPhase = 'charge';
    this.chargeTime = 1.0;
    
    // Create summon effect
    this.createSummonEffect();
  }
  
  updateSummonState(deltaTime) {
    // Update timer
    this.summonTimer -= deltaTime;
    
    // Update based on phase
    if (this.summonPhase === 'charge') {
      this.chargeTime -= deltaTime;
      
      // Check if charge is complete
      if (this.chargeTime <= 0) {
        this.summonPhase = 'release';
        
        // Summon minions
        this.summonMinions();
      }
    }
    
    // Check if summon is complete
    if (this.summonTimer <= 0) {
      // Return to appropriate state
      if (this.target) {
        const distanceToTarget = this.position.distanceTo(this.target.position);
        if (distanceToTarget <= this.options.attackRange) {
          this.changeState('attack');
        } else {
          this.changeState('chase');
        }
      } else {
        this.changeState('idle');
      }
    }
  }
  
  exitSummonState() {
    // Nothing to do
  }
  
  /**
   * Create summon effect
   */
  createSummonEffect() {
    // Create summon geometry
    const summonGeometry = new THREE.CircleGeometry(3, 32);
    
    // Create summon material
    const summonMaterial = new THREE.MeshBasicMaterial({
      color: this.options.color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    // Create summon mesh
    this.summonMesh = new THREE.Mesh(summonGeometry, summonMaterial);
    this.summonMesh.rotation.x = Math.PI / 2; // Lay flat
    this.summonMesh.position.copy(this.position);
    this.summonMesh.position.y = 0.1;
    
    // Add to scene
    this.scene.add(this.summonMesh);
    
    // Animate summon
    const animate = () => {
      // Check if still in summon phase
      if (this.summonPhase !== 'charge' || !this.isActive || !this.isAlive) {
        // Remove summon effect
        this.scene.remove(this.summonMesh);
        summonGeometry.dispose();
        summonMaterial.dispose();
        this.summonMesh = null;
        return;
      }
      
      // Calculate progress
      const progress = 1 - (this.chargeTime / 1.0);
      
      // Pulse opacity
      summonMaterial.opacity = 0.2 + 0.3 * Math.sin(performance.now() / 200);
      
      // Rotate
      this.summonMesh.rotation.z += 0.02;
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
  }
  
  /**
   * Summon minions
   */
  summonMinions() {
    // TODO: Implement actual minion summoning
    // For now, just log the summon
    console.log(`Commander summons ${this.options.summonCount} minions!`);
    
    // Create summon flash
    this.createSummonFlash();
  }
  
  /**
   * Create summon flash effect
   */
  createSummonFlash() {
    // Create flash geometry
    const flashGeometry = new THREE.CircleGeometry(5, 32);
    
    // Create flash material
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: this.options.color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    
    // Create flash mesh
    const flashMesh = new THREE.Mesh(flashGeometry, flashMaterial);
    flashMesh.rotation.x = Math.PI / 2; // Lay flat
    flashMesh.position.copy(this.position);
    flashMesh.position.y = 0.1;
    
    // Add to scene
    this.scene.add(flashMesh);
    
    // Add flash light
    const flashLight = new THREE.PointLight(this.options.color, 5, 15);
    flashLight.position.copy(this.position);
    flashLight.position.y += 1;
    this.scene.add(flashLight);
    
    // Animate flash
    let time = 0;
    const duration = 0.5;
    
    const animate = () => {
      time += 0.016; // Assuming 60fps
      
      // Expand
      const scale = 1 + time * 4;
      flashMesh.scale.set(scale, scale, scale);
      
      // Fade out
      flashMaterial.opacity = Math.max(0, 0.8 - time / duration * 2);
      
      // Fade light
      flashLight.intensity = Math.max(0, 5 - time / duration * 10);
      
      // Check if animation is done
      if (time >= duration) {
        // Remove flash
        this.scene.remove(flashMesh);
        this.scene.remove(flashLight);
        flashGeometry.dispose();
        flashMaterial.dispose();
        return;
      }
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
  }
  
  /**
   * Clean up the commander
   */
  dispose() {
    // Remove buff aura
    if (this.auraMesh) {
      this.scene.remove(this.auraMesh);
      if (this.auraMesh.geometry) this.auraMesh.geometry.dispose();
      if (this.auraMaterial) this.auraMaterial.dispose();
    }
    
    // Remove summon effect
    if (this.summonMesh) {
      this.scene.remove(this.summonMesh);
      if (this.summonMesh.geometry) this.summonMesh.geometry.dispose();
      if (this.summonMesh.material) this.summonMesh.material.dispose();
    }
    
    // Call parent dispose
    super.dispose();
  }
} 