import { Enemy } from '../base/Enemy.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Drone enemy type
 * Fast but weak enemy that attacks in swarms
 */
export class Drone extends Enemy {
  /**
   * Create a new drone enemy
   * @param {THREE.Scene} scene - The scene to add the enemy to
   * @param {Object} physics - The physics world
   * @param {Object} options - Enemy options
   */
  constructor(scene, physics, options = {}) {
    // Set drone-specific default options
    const droneOptions = Object.assign({
      type: 'drone',
      health: 20,
      maxHealth: 20,
      damage: 5,
      moveSpeed: 5.0, // Faster than base enemy
      turnSpeed: 3.0, // More agile
      scale: 0.8,     // Smaller
      color: 0x00aaff, // Blue color
      points: 50,     // Worth fewer points
      attackRange: 8,
      attackRate: 1.5, // Attacks per second
      detectionRange: 25,
      model: null,
      // Drone-specific properties
      swarmRadius: 3.0,
      swarmOffset: new THREE.Vector3(0, 0, 0),
      swarmIndex: 0,
      swarmSize: 1,
    }, options);
    
    // Call parent constructor
    super(scene, physics, droneOptions);
    
    // Drone-specific properties
    this.swarmPosition = new THREE.Vector3();
    this.swarmAngle = 0;
    this.swarmSpeed = 2.0;
    
    // Override default mesh with drone-specific mesh
    this.createDroneMesh();
  }
  
  /**
   * Create a drone-specific mesh
   */
  createDroneMesh() {
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
    
    // Create drone geometry
    const geometry = new THREE.ConeGeometry(0.5, 1, 8);
    
    // Create drone material
    const material = new THREE.MeshStandardMaterial({
      color: this.options.color,
      roughness: 0.7,
      metalness: 0.3,
      emissive: new THREE.Color(this.options.color).multiplyScalar(0.2)
    });
    
    // Create mesh
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.scale.multiplyScalar(this.options.scale);
    
    // Rotate to point forward
    this.mesh.rotation.x = Math.PI / 2;
    
    // Add to scene
    this.scene.add(this.mesh);
    
    // Store reference to enemy in userData
    this.mesh.userData.isEnemy = true;
    this.mesh.userData.enemyInstance = this;
    
    // Create health bar
    this.createHealthBar();
    
    // Add engine glow effect
    this.createEngineGlow();
  }
  
  /**
   * Create engine glow effect
   */
  createEngineGlow() {
    // Create glow geometry
    const glowGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    
    // Create glow material
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.options.color,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    
    // Create glow mesh
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glowMesh.position.y = -0.5;
    this.mesh.add(this.glowMesh);
    
    // Add point light
    this.engineLight = new THREE.PointLight(this.options.color, 0.5, 2);
    this.engineLight.position.copy(this.glowMesh.position);
    this.mesh.add(this.engineLight);
  }
  
  /**
   * Update the drone
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (!this.isActive || !this.isAlive) return;
    
    // Update engine glow
    if (this.glowMesh) {
      // Pulse the glow
      const pulseScale = 0.8 + 0.2 * Math.sin(performance.now() / 200);
      this.glowMesh.scale.set(pulseScale, pulseScale, pulseScale);
      
      // Pulse the light intensity
      if (this.engineLight) {
        this.engineLight.intensity = 0.3 + 0.2 * Math.sin(performance.now() / 200);
      }
    }
    
    // Call parent update
    super.update(deltaTime);
  }
  
  /**
   * Override the chase state update to implement swarm behavior
   * @param {number} deltaTime - Time since last update
   */
  updateChaseState(deltaTime) {
    if (!this.target) {
      this.changeState('idle');
      return;
    }
    
    // Calculate base target position (player position)
    this.targetPosition.copy(this.target.position);
    
    // Apply swarm behavior if part of a swarm
    if (this.options.swarmSize > 1) {
      this.applySwarmBehavior(deltaTime);
    }
    
    // Calculate distance to target
    const distanceToTarget = this.position.distanceTo(this.targetPosition);
    
    // If in attack range, switch to attack state
    if (distanceToTarget <= this.options.attackRange) {
      this.changeState('attack');
      return;
    }
    
    // If target is too far, go back to idle
    if (distanceToTarget > this.options.detectionRange * 1.5) {
      this.changeState('idle');
      return;
    }
    
    // Move towards target
    this.moveTowards(this.targetPosition, deltaTime);
  }
  
  /**
   * Apply swarm behavior to modify target position
   * @param {number} deltaTime - Time since last update
   */
  applySwarmBehavior(deltaTime) {
    // Update swarm angle
    this.swarmAngle += this.swarmSpeed * deltaTime;
    
    // Calculate position in swarm
    const angleOffset = (Math.PI * 2 / this.options.swarmSize) * this.options.swarmIndex;
    const angle = this.swarmAngle + angleOffset;
    
    // Calculate offset from target
    const offsetX = Math.cos(angle) * this.options.swarmRadius;
    const offsetZ = Math.sin(angle) * this.options.swarmRadius;
    
    // Apply offset to target position
    this.targetPosition.x += offsetX + this.options.swarmOffset.x;
    this.targetPosition.y += this.options.swarmOffset.y;
    this.targetPosition.z += offsetZ + this.options.swarmOffset.z;
  }
  
  /**
   * Override attack method to implement drone-specific attack
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
    
    // TODO: Implement drone attack (small energy projectile)
    console.log(`Drone attacks for ${this.options.damage} damage!`);
    
    // Visual feedback for attack
    this.createAttackEffect();
    
    return true;
  }
  
  /**
   * Create visual effect for attack
   */
  createAttackEffect() {
    // Create attack geometry
    const attackGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    
    // Create attack material
    const attackMaterial = new THREE.MeshBasicMaterial({
      color: this.options.color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    // Create attack mesh
    const attackMesh = new THREE.Mesh(attackGeometry, attackMaterial);
    attackMesh.position.copy(this.position);
    
    // Add to scene
    this.scene.add(attackMesh);
    
    // Calculate direction to target
    const direction = new THREE.Vector3()
      .subVectors(this.target.position, this.position)
      .normalize();
    
    // Animate attack
    const animate = () => {
      // Move attack mesh
      attackMesh.position.add(direction.clone().multiplyScalar(0.5));
      
      // Scale down
      attackMesh.scale.multiplyScalar(0.95);
      
      // Check if reached target
      const distanceToTarget = attackMesh.position.distanceTo(this.target.position);
      if (distanceToTarget < 0.5 || attackMesh.scale.x < 0.1) {
        // Remove attack mesh
        this.scene.remove(attackMesh);
        attackGeometry.dispose();
        attackMaterial.dispose();
        return;
      }
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
  }
  
  /**
   * Set the drone's swarm parameters
   * @param {number} swarmSize - Total number of drones in swarm
   * @param {number} swarmIndex - Index of this drone in swarm
   * @param {THREE.Vector3} swarmOffset - Offset from target for swarm center
   */
  setSwarmParameters(swarmSize, swarmIndex, swarmOffset = new THREE.Vector3()) {
    this.options.swarmSize = swarmSize;
    this.options.swarmIndex = swarmIndex;
    this.options.swarmOffset.copy(swarmOffset);
    
    // Randomize starting angle
    this.swarmAngle = Math.random() * Math.PI * 2;
  }
} 