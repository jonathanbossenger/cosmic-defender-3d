import { Enemy } from '../base/Enemy.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { MathUtils } from '../../utils/math.js';

/**
 * Elite enemy type
 * Stronger enemy with special abilities
 */
export class Elite extends Enemy {
  /**
   * Create a new elite enemy
   * @param {THREE.Scene} scene - The scene to add the enemy to
   * @param {Object} physics - The physics world
   * @param {Object} options - Enemy options
   */
  constructor(scene, physics, options = {}) {
    // Set elite-specific default options
    const eliteOptions = Object.assign({
      type: 'elite',
      health: 120,
      maxHealth: 120,
      damage: 25,
      moveSpeed: 4.0,
      turnSpeed: 2.5,
      scale: 1.2,
      color: 0xaa00ff, // Purple color
      points: 250,
      attackRange: 15,
      attackRate: 0.8, // Attacks per second
      detectionRange: 25,
      model: null,
      // Elite-specific properties
      shieldStrength: 50,
      maxShieldStrength: 50,
      shieldRechargeRate: 5, // Per second
      shieldRechargeDelay: 3, // Seconds after damage
      specialAttackCooldown: 8, // Seconds
      teleportDistance: 10,
    }, options);
    
    // Call parent constructor
    super(scene, physics, eliteOptions);
    
    // Elite-specific properties
    this.shieldStrength = this.options.shieldStrength;
    this.lastShieldDamageTime = 0;
    this.lastSpecialAttackTime = 0;
    this.isShieldActive = true;
    
    // Add teleport state to state machine
    this.stateMachine.states.teleport = {
      enter: this.enterTeleportState.bind(this),
      update: this.updateTeleportState.bind(this),
      exit: this.exitTeleportState.bind(this)
    };
    
    // Add special attack state to state machine
    this.stateMachine.states.specialAttack = {
      enter: this.enterSpecialAttackState.bind(this),
      update: this.updateSpecialAttackState.bind(this),
      exit: this.exitSpecialAttackState.bind(this)
    };
    
    // Override default mesh with elite-specific mesh
    this.createEliteMesh();
  }
  
  /**
   * Create an elite-specific mesh
   */
  createEliteMesh() {
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
    
    // Create elite group
    this.mesh = new THREE.Group();
    
    // Create body geometry
    const bodyGeometry = new THREE.OctahedronGeometry(0.7, 1);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.options.color,
      roughness: 0.4,
      metalness: 0.6,
      emissive: new THREE.Color(this.options.color).multiplyScalar(0.3)
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = 0.7;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.mesh.add(bodyMesh);
    
    // Create floating elements
    this.floatingElements = [];
    const elementCount = 3;
    for (let i = 0; i < elementCount; i++) {
      const elementGeometry = new THREE.TetrahedronGeometry(0.2, 0);
      const elementMaterial = new THREE.MeshStandardMaterial({
        color: this.options.color,
        roughness: 0.4,
        metalness: 0.8,
        emissive: new THREE.Color(this.options.color).multiplyScalar(0.5)
      });
      const elementMesh = new THREE.Mesh(elementGeometry, elementMaterial);
      
      // Position in a circle around the body
      const angle = (i / elementCount) * Math.PI * 2;
      const radius = 0.8;
      elementMesh.position.set(
        Math.cos(angle) * radius,
        0.7,
        Math.sin(angle) * radius
      );
      
      // Store initial position for animation
      elementMesh.userData.initialPosition = elementMesh.position.clone();
      elementMesh.userData.angle = angle;
      elementMesh.userData.angleSpeed = 1 + Math.random() * 0.5;
      elementMesh.userData.bobHeight = 0.2 + Math.random() * 0.2;
      elementMesh.userData.bobSpeed = 1 + Math.random() * 0.5;
      
      this.mesh.add(elementMesh);
      this.floatingElements.push(elementMesh);
    }
    
    // Create shield mesh
    this.createShieldMesh();
    
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
   * Create shield mesh
   */
  createShieldMesh() {
    // Create shield geometry
    const shieldGeometry = new THREE.SphereGeometry(1, 16, 16);
    
    // Create shield material
    this.shieldMaterial = new THREE.MeshBasicMaterial({
      color: this.options.color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      wireframe: true
    });
    
    // Create shield mesh
    this.shieldMesh = new THREE.Mesh(shieldGeometry, this.shieldMaterial);
    this.shieldMesh.scale.set(1.2, 1.2, 1.2);
    this.shieldMesh.position.y = 0.7;
    this.mesh.add(this.shieldMesh);
  }
  
  /**
   * Update the elite
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (!this.isActive || !this.isAlive) return;
    
    // Update floating elements
    this.updateFloatingElements(deltaTime);
    
    // Update shield
    this.updateShield(deltaTime);
    
    // Check if should use special attack
    this.checkSpecialAttack();
    
    // Call parent update
    super.update(deltaTime);
  }
  
  /**
   * Update floating elements animation
   * @param {number} deltaTime - Time since last update
   */
  updateFloatingElements(deltaTime) {
    const time = performance.now() / 1000;
    
    this.floatingElements.forEach(element => {
      // Rotate around body
      element.userData.angle += element.userData.angleSpeed * deltaTime;
      const radius = 0.8;
      
      // Calculate new position
      const newX = Math.cos(element.userData.angle) * radius;
      const newZ = Math.sin(element.userData.angle) * radius;
      const newY = element.userData.initialPosition.y + 
        Math.sin(time * element.userData.bobSpeed) * element.userData.bobHeight;
      
      // Update position
      element.position.set(newX, newY, newZ);
      
      // Rotate element
      element.rotation.x += deltaTime * 2;
      element.rotation.y += deltaTime * 3;
      element.rotation.z += deltaTime * 1.5;
    });
  }
  
  /**
   * Update shield
   * @param {number} deltaTime - Time since last update
   */
  updateShield(deltaTime) {
    if (!this.shieldMesh) return;
    
    // Update shield visibility based on shield strength
    this.isShieldActive = this.shieldStrength > 0;
    this.shieldMesh.visible = this.isShieldActive;
    
    // Update shield opacity based on shield strength
    if (this.isShieldActive) {
      const shieldPercent = this.shieldStrength / this.options.maxShieldStrength;
      this.shieldMaterial.opacity = 0.2 + shieldPercent * 0.3;
      
      // Pulse effect
      const pulseScale = 1.2 + 0.1 * Math.sin(performance.now() / 300);
      this.shieldMesh.scale.set(pulseScale, pulseScale, pulseScale);
    }
    
    // Recharge shield after delay
    const currentTime = performance.now() / 1000;
    if (currentTime - this.lastShieldDamageTime > this.options.shieldRechargeDelay) {
      this.shieldStrength = Math.min(
        this.options.maxShieldStrength,
        this.shieldStrength + this.options.shieldRechargeRate * deltaTime
      );
    }
  }
  
  /**
   * Check if should use special attack
   */
  checkSpecialAttack() {
    if (!this.target || !this.isActive || !this.isAlive) return;
    
    // Check if can use special attack
    const currentTime = performance.now() / 1000;
    if (currentTime - this.lastSpecialAttackTime < this.options.specialAttackCooldown) return;
    
    // Check if target is in range
    const distanceToTarget = this.position.distanceTo(this.target.position);
    if (distanceToTarget > this.options.attackRange * 1.5) return;
    
    // Check if health is low
    const healthPercent = this.health / this.options.maxHealth;
    if (healthPercent < 0.3 || Math.random() < 0.02) {
      // Use teleport to escape
      this.changeState('teleport');
      this.lastSpecialAttackTime = currentTime;
    } else if (Math.random() < 0.05) {
      // Use special attack
      this.changeState('specialAttack');
      this.lastSpecialAttackTime = currentTime;
    }
  }
  
  /**
   * Override take damage to handle shield
   * @param {number} amount - Amount of damage
   * @param {THREE.Vector3} source - Source of damage
   * @returns {boolean} True if enemy died
   */
  takeDamage(amount, source) {
    if (!this.isActive || !this.isAlive) return false;
    
    // Check if shield is active
    if (this.isShieldActive) {
      // Damage shield first
      this.shieldStrength -= amount;
      this.lastShieldDamageTime = performance.now() / 1000;
      
      // Shield break effect
      if (this.shieldStrength <= 0) {
        this.shieldStrength = 0;
        this.createShieldBreakEffect();
      }
      
      // Shield absorbs all damage
      return false;
    }
    
    // If shield is down, take normal damage
    return super.takeDamage(amount, source);
  }
  
  /**
   * Create shield break effect
   */
  createShieldBreakEffect() {
    // Create particles
    const particleCount = 20;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
      // Create particle geometry
      const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      
      // Create particle material
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: this.options.color,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      
      // Create particle mesh
      const particleMesh = new THREE.Mesh(particleGeometry, particleMaterial);
      
      // Position at shield
      const position = MathUtils.randomPointOnSphere(1.2);
      particleMesh.position.copy(position).add(this.position);
      particleMesh.position.y += 0.7 * this.options.scale;
      
      // Add to scene
      this.scene.add(particleMesh);
      
      // Store velocity
      particleMesh.userData.velocity = position.normalize().multiplyScalar(5);
      
      // Store in array
      particles.push(particleMesh);
    }
    
    // Animate particles
    let time = 0;
    const animate = () => {
      time += 0.016; // Assuming 60fps
      
      particles.forEach(particle => {
        // Move particle
        particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.016));
        
        // Apply gravity
        particle.userData.velocity.y -= 9.8 * 0.016;
        
        // Fade out
        particle.material.opacity = Math.max(0, 0.8 - time);
        
        // Scale down
        particle.scale.multiplyScalar(0.98);
      });
      
      // Check if animation is done
      if (time > 1) {
        // Remove particles
        particles.forEach(particle => {
          this.scene.remove(particle);
          particle.geometry.dispose();
          particle.material.dispose();
        });
        return;
      }
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
  }
  
  /**
   * Override attack method to implement elite-specific attack
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
    
    // Create energy blast
    this.createEnergyBlast();
    
    return true;
  }
  
  /**
   * Create energy blast attack
   */
  createEnergyBlast() {
    if (!this.target) return;
    
    // Calculate direction to target
    const direction = new THREE.Vector3()
      .subVectors(this.target.position, this.position)
      .normalize();
    
    // Create blast geometry
    const blastGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    
    // Create blast material
    const blastMaterial = new THREE.MeshBasicMaterial({
      color: this.options.color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    // Create blast mesh
    const blastMesh = new THREE.Mesh(blastGeometry, blastMaterial);
    blastMesh.position.copy(this.position);
    blastMesh.position.y += 0.7 * this.options.scale;
    
    // Add to scene
    this.scene.add(blastMesh);
    
    // Add point light
    const blastLight = new THREE.PointLight(this.options.color, 1, 5);
    blastLight.position.copy(blastMesh.position);
    this.scene.add(blastLight);
    
    // Animate blast
    const speed = 15;
    const maxDistance = 30;
    const startPosition = blastMesh.position.clone();
    
    const animate = () => {
      // Move blast
      blastMesh.position.add(direction.clone().multiplyScalar(speed * 0.016)); // Assuming 60fps
      blastLight.position.copy(blastMesh.position);
      
      // Pulse size
      const pulseScale = 1 + 0.2 * Math.sin(performance.now() / 100);
      blastMesh.scale.set(pulseScale, pulseScale, pulseScale);
      
      // Check if hit something
      // TODO: Implement proper collision detection
      
      // Check if traveled too far
      const distanceTraveled = blastMesh.position.distanceTo(startPosition);
      if (distanceTraveled > maxDistance) {
        // Remove blast
        this.scene.remove(blastMesh);
        this.scene.remove(blastLight);
        blastGeometry.dispose();
        blastMaterial.dispose();
        return;
      }
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
  }
  
  // Teleport state
  enterTeleportState() {
    // Create teleport out effect
    this.createTeleportEffect(true);
    
    // Hide mesh
    this.mesh.visible = false;
    
    // Disable physics
    this.body.type = CANNON.Body.KINEMATIC;
    this.body.velocity.set(0, 0, 0);
    
    // Set timer for teleport completion
    this.teleportTimer = 0.5;
    
    // Calculate teleport destination
    if (this.target) {
      // Teleport behind or to the side of the target
      const angle = Math.random() * Math.PI * 2;
      const distance = this.options.teleportDistance;
      
      this.teleportDestination = new THREE.Vector3(
        this.target.position.x + Math.cos(angle) * distance,
        this.target.position.y,
        this.target.position.z + Math.sin(angle) * distance
      );
    } else {
      // Teleport to a random position nearby
      const angle = Math.random() * Math.PI * 2;
      const distance = this.options.teleportDistance;
      
      this.teleportDestination = new THREE.Vector3(
        this.position.x + Math.cos(angle) * distance,
        this.position.y,
        this.position.z + Math.sin(angle) * distance
      );
    }
  }
  
  updateTeleportState(deltaTime) {
    // Update timer
    this.teleportTimer -= deltaTime;
    
    // Check if teleport is complete
    if (this.teleportTimer <= 0) {
      // Move to destination
      this.position.copy(this.teleportDestination);
      this.body.position.copy(this.teleportDestination);
      
      // Create teleport in effect
      this.createTeleportEffect(false);
      
      // Show mesh
      this.mesh.visible = true;
      
      // Re-enable physics
      this.body.type = CANNON.Body.DYNAMIC;
      
      // Change state based on target
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
  
  exitTeleportState() {
    // Nothing to do
  }
  
  /**
   * Create teleport effect
   * @param {boolean} isTeleportOut - True if teleporting out, false if teleporting in
   */
  createTeleportEffect(isTeleportOut) {
    // Create effect position
    const effectPosition = isTeleportOut ? this.position.clone() : this.teleportDestination.clone();
    effectPosition.y += 0.7 * this.options.scale;
    
    // Create particles
    const particleCount = 30;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
      // Create particle geometry
      const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      
      // Create particle material
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: this.options.color,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      
      // Create particle mesh
      const particleMesh = new THREE.Mesh(particleGeometry, particleMaterial);
      
      if (isTeleportOut) {
        // Start at center and move outward
        particleMesh.position.copy(effectPosition);
        
        // Random direction
        const direction = MathUtils.randomPointOnSphere(1);
        particleMesh.userData.velocity = direction.multiplyScalar(5);
      } else {
        // Start at outer position and move inward
        const direction = MathUtils.randomPointOnSphere(2);
        particleMesh.position.copy(effectPosition).add(direction);
        
        // Move toward center
        particleMesh.userData.velocity = direction.multiplyScalar(-5);
      }
      
      // Add to scene
      this.scene.add(particleMesh);
      
      // Store in array
      particles.push(particleMesh);
    }
    
    // Add flash light
    const flashLight = new THREE.PointLight(this.options.color, 3, 10);
    flashLight.position.copy(effectPosition);
    this.scene.add(flashLight);
    
    // Animate particles
    let time = 0;
    const animate = () => {
      time += 0.016; // Assuming 60fps
      
      particles.forEach(particle => {
        // Move particle
        particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.016));
        
        // Fade out
        particle.material.opacity = Math.max(0, 0.8 - time * 2);
        
        // Scale down
        particle.scale.multiplyScalar(0.96);
      });
      
      // Fade light
      flashLight.intensity = Math.max(0, 3 - time * 6);
      
      // Check if animation is done
      if (time > 0.5) {
        // Remove particles
        particles.forEach(particle => {
          this.scene.remove(particle);
          particle.geometry.dispose();
          particle.material.dispose();
        });
        
        // Remove light
        this.scene.remove(flashLight);
        return;
      }
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
  }
  
  // Special attack state
  enterSpecialAttackState() {
    // Stop movement
    this.body.velocity.set(0, 0, 0);
    
    // Set timer for attack duration
    this.specialAttackTimer = 2.0;
    this.specialAttackPhase = 'charge';
    this.chargeTime = 1.0;
    
    // Create charge effect
    this.createChargeEffect();
  }
  
  updateSpecialAttackState(deltaTime) {
    // Update timer
    this.specialAttackTimer -= deltaTime;
    
    // Update based on phase
    if (this.specialAttackPhase === 'charge') {
      this.chargeTime -= deltaTime;
      
      // Face target if available
      if (this.target) {
        const direction = new THREE.Vector3()
          .subVectors(this.target.position, this.position)
          .normalize();
        
        if (direction.length() > 0.1) {
          const targetRotation = Math.atan2(direction.x, direction.z);
          this.mesh.rotation.y = MathUtils.damp(
            this.mesh.rotation.y,
            targetRotation,
            0.1,
            deltaTime
          );
        }
      }
      
      // Check if charge is complete
      if (this.chargeTime <= 0) {
        this.specialAttackPhase = 'release';
        
        // Perform area attack
        this.createAreaAttack();
      }
    }
    
    // Check if attack is complete
    if (this.specialAttackTimer <= 0) {
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
  
  exitSpecialAttackState() {
    // Nothing to do
  }
  
  /**
   * Create charge effect for special attack
   */
  createChargeEffect() {
    // Create charge geometry
    const chargeGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    
    // Create charge material
    const chargeMaterial = new THREE.MeshBasicMaterial({
      color: this.options.color,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      wireframe: true
    });
    
    // Create charge mesh
    this.chargeMesh = new THREE.Mesh(chargeGeometry, chargeMaterial);
    this.chargeMesh.position.y = 0.7 * this.options.scale;
    this.mesh.add(this.chargeMesh);
    
    // Add point light
    this.chargeLight = new THREE.PointLight(this.options.color, 1, 5);
    this.chargeLight.position.copy(this.chargeMesh.position);
    this.mesh.add(this.chargeLight);
    
    // Animate charge
    const animate = () => {
      // Check if still in charge phase
      if (this.specialAttackPhase !== 'charge' || !this.isActive || !this.isAlive) {
        // Remove charge effect
        this.mesh.remove(this.chargeMesh);
        this.mesh.remove(this.chargeLight);
        this.chargeMesh.geometry.dispose();
        this.chargeMesh.material.dispose();
        return;
      }
      
      // Calculate progress
      const progress = 1 - (this.chargeTime / 1.0);
      
      // Scale up
      const scale = 0.5 + progress * 1.5;
      this.chargeMesh.scale.set(scale, scale, scale);
      
      // Increase intensity
      this.chargeLight.intensity = 1 + progress * 3;
      
      // Pulse
      const pulseScale = 1 + 0.2 * Math.sin(performance.now() / 100);
      this.chargeMesh.scale.multiplyScalar(pulseScale);
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
  }
  
  /**
   * Create area attack effect
   */
  createAreaAttack() {
    // Create wave geometry
    const waveGeometry = new THREE.RingGeometry(0.5, 1, 32);
    
    // Create wave material
    const waveMaterial = new THREE.MeshBasicMaterial({
      color: this.options.color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    
    // Create wave mesh
    const waveMesh = new THREE.Mesh(waveGeometry, waveMaterial);
    waveMesh.rotation.x = Math.PI / 2; // Lay flat
    waveMesh.position.copy(this.position);
    waveMesh.position.y += 0.1;
    
    // Add to scene
    this.scene.add(waveMesh);
    
    // Add point light
    const waveLight = new THREE.PointLight(this.options.color, 3, 10);
    waveLight.position.copy(waveMesh.position);
    this.scene.add(waveLight);
    
    // Animate wave
    const maxRadius = 10;
    const speed = 10;
    
    const animate = () => {
      // Expand wave
      const scale = waveMesh.scale.x + speed * 0.016;
      waveMesh.scale.set(scale, scale, scale);
      
      // Fade out
      const opacity = Math.max(0, 0.8 - scale / maxRadius);
      waveMaterial.opacity = opacity;
      
      // Fade light
      waveLight.intensity = Math.max(0, 3 - scale / maxRadius * 3);
      
      // Check if wave is done
      if (scale >= maxRadius) {
        // Remove wave
        this.scene.remove(waveMesh);
        this.scene.remove(waveLight);
        waveGeometry.dispose();
        waveMaterial.dispose();
        return;
      }
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
    
    // TODO: Apply damage to nearby objects
    // For now, just log the attack
    console.log(`Elite performs area attack for ${this.options.damage * 1.5} damage!`);
  }
} 