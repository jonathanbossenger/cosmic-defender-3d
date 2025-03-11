import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { MathUtils } from '../../utils/math.js';

/**
 * Base enemy class that all enemy types will extend
 */
export class Enemy {
  /**
   * Create a new enemy
   * @param {THREE.Scene} scene - The scene to add the enemy to
   * @param {Object} physics - The physics world
   * @param {Object} options - Enemy options
   */
  constructor(scene, physics, options = {}) {
    this.scene = scene;
    this.physics = physics;
    
    // Set default options
    this.options = Object.assign({
      type: 'drone',
      health: 30,
      maxHealth: 30,
      damage: 10,
      moveSpeed: 3.0,
      turnSpeed: 2.0,
      scale: 1.0,
      color: 0xff0000,
      points: 100,
      attackRange: 10,
      attackRate: 1.0, // attacks per second
      detectionRange: 20,
      model: null, // Model path or null for default geometry
    }, options);
    
    // Enemy state
    this.health = this.options.health;
    this.maxHealth = this.options.maxHealth;
    this.isActive = false;
    this.isAlive = true;
    this.target = null;
    this.lastAttackTime = 0;
    
    // Movement
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3(0, 0, -1); // Forward direction
    this.targetPosition = new THREE.Vector3();
    this.waypoints = [];
    this.currentWaypoint = 0;
    
    // State machine
    this.stateMachine = {
      currentState: 'idle',
      states: {
        idle: {
          enter: this.enterIdleState.bind(this),
          update: this.updateIdleState.bind(this),
          exit: this.exitIdleState.bind(this)
        },
        patrol: {
          enter: this.enterPatrolState.bind(this),
          update: this.updatePatrolState.bind(this),
          exit: this.exitPatrolState.bind(this)
        },
        chase: {
          enter: this.enterChaseState.bind(this),
          update: this.updateChaseState.bind(this),
          exit: this.exitChaseState.bind(this)
        },
        attack: {
          enter: this.enterAttackState.bind(this),
          update: this.updateAttackState.bind(this),
          exit: this.exitAttackState.bind(this)
        },
        flee: {
          enter: this.enterFleeState.bind(this),
          update: this.updateFleeState.bind(this),
          exit: this.exitFleeState.bind(this)
        },
        stunned: {
          enter: this.enterStunnedState.bind(this),
          update: this.updateStunnedState.bind(this),
          exit: this.exitStunnedState.bind(this)
        },
        dead: {
          enter: this.enterDeadState.bind(this),
          update: this.updateDeadState.bind(this),
          exit: this.exitDeadState.bind(this)
        }
      }
    };
    
    // Create mesh and physics body
    this.createMesh();
    this.createPhysicsBody();
    
    // Set initial state
    this.changeState('idle');
  }
  
  /**
   * Create the enemy mesh
   */
  createMesh() {
    if (this.options.model) {
      // TODO: Load model from path
      // For now, create a default geometry
      this.createDefaultMesh();
    } else {
      this.createDefaultMesh();
    }
  }
  
  /**
   * Create a default mesh for the enemy
   */
  createDefaultMesh() {
    // Create geometry based on enemy type
    let geometry;
    
    switch (this.options.type) {
      case 'drone':
        geometry = new THREE.ConeGeometry(0.5, 1, 8);
        break;
      case 'soldier':
        geometry = new THREE.BoxGeometry(0.8, 1.2, 0.8);
        break;
      case 'elite':
        geometry = new THREE.OctahedronGeometry(0.7, 1);
        break;
      case 'commander':
        geometry = new THREE.DodecahedronGeometry(0.8, 1);
        break;
      default:
        geometry = new THREE.SphereGeometry(0.5, 16, 16);
    }
    
    // Create material
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
    
    // Add to scene
    this.scene.add(this.mesh);
    
    // Store reference to enemy in userData
    this.mesh.userData.isEnemy = true;
    this.mesh.userData.enemyInstance = this;
    
    // Create health bar
    this.createHealthBar();
  }
  
  /**
   * Create a health bar above the enemy
   */
  createHealthBar() {
    // Health bar container
    this.healthBarContainer = new THREE.Group();
    this.healthBarContainer.position.y = 1.5 * this.options.scale;
    this.mesh.add(this.healthBarContainer);
    
    // Background bar
    const bgGeometry = new THREE.PlaneGeometry(1, 0.1);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0x333333,
      side: THREE.DoubleSide
    });
    this.healthBarBg = new THREE.Mesh(bgGeometry, bgMaterial);
    this.healthBarContainer.add(this.healthBarBg);
    
    // Health bar
    const barGeometry = new THREE.PlaneGeometry(1, 0.1);
    const barMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide
    });
    this.healthBar = new THREE.Mesh(barGeometry, barMaterial);
    this.healthBar.position.z = 0.01;
    this.healthBarContainer.add(this.healthBar);
    
    // Make health bar always face camera
    this.healthBarContainer.lookAt(0, 0, 0);
    
    // Hide health bar initially
    this.healthBarContainer.visible = false;
  }
  
  /**
   * Create the physics body for the enemy
   */
  createPhysicsBody() {
    // Create physics shape
    const radius = 0.5 * this.options.scale;
    const shape = new CANNON.Sphere(radius);
    
    // Create physics body
    this.body = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 0, 0),
      shape: shape,
      material: this.physics.defaultMaterial
    });
    
    // Add body to physics world
    this.physics.addBody(this.body);
    
    // Link mesh and body
    this.physics.addObjectToUpdate(this.mesh, this.body);
  }
  
  /**
   * Update the enemy
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (!this.isActive || !this.isAlive) return;
    
    // Update state machine
    const state = this.stateMachine.states[this.stateMachine.currentState];
    if (state && state.update) {
      state.update(deltaTime);
    }
    
    // Update health bar
    this.updateHealthBar();
    
    // Make health bar face camera
    if (this.healthBarContainer) {
      this.healthBarContainer.lookAt(0, 0, 0);
    }
  }
  
  /**
   * Update the health bar
   */
  updateHealthBar() {
    if (!this.healthBar) return;
    
    // Update health bar scale
    const healthPercent = this.health / this.maxHealth;
    this.healthBar.scale.x = Math.max(0.01, healthPercent);
    this.healthBar.position.x = (healthPercent - 1) / 2;
    
    // Update health bar color
    if (healthPercent > 0.6) {
      this.healthBar.material.color.setHex(0x00ff00); // Green
    } else if (healthPercent > 0.3) {
      this.healthBar.material.color.setHex(0xffff00); // Yellow
    } else {
      this.healthBar.material.color.setHex(0xff0000); // Red
    }
    
    // Show health bar if damaged
    this.healthBarContainer.visible = healthPercent < 1;
  }
  
  /**
   * Activate the enemy
   * @param {THREE.Vector3} position - Initial position
   */
  activate(position) {
    this.isActive = true;
    this.isAlive = true;
    this.health = this.maxHealth;
    
    // Set position
    this.position.copy(position);
    this.body.position.copy(position);
    this.mesh.position.copy(position);
    
    // Reset state
    this.changeState('idle');
    
    // Show mesh
    this.mesh.visible = true;
  }
  
  /**
   * Deactivate the enemy
   */
  deactivate() {
    this.isActive = false;
    
    // Hide mesh
    this.mesh.visible = false;
    
    // Reset physics
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.position.set(0, -100, 0); // Move far away
  }
  
  /**
   * Take damage
   * @param {number} amount - Amount of damage
   * @param {THREE.Vector3} source - Source of damage
   * @returns {boolean} True if enemy died
   */
  takeDamage(amount, source) {
    if (!this.isActive || !this.isAlive) return false;
    
    this.health -= amount;
    
    // Show health bar when damaged
    this.healthBarContainer.visible = true;
    
    // Check if dead
    if (this.health <= 0) {
      this.health = 0;
      this.die();
      return true;
    }
    
    // Apply knockback
    if (source) {
      const knockbackDirection = new THREE.Vector3().subVectors(this.position, source).normalize();
      const knockbackForce = 5 * amount;
      this.body.applyImpulse(
        new CANNON.Vec3(
          knockbackDirection.x * knockbackForce,
          knockbackDirection.y * knockbackForce,
          knockbackDirection.z * knockbackForce
        ),
        new CANNON.Vec3(0, 0, 0)
      );
    }
    
    return false;
  }
  
  /**
   * Kill the enemy
   */
  die() {
    if (!this.isAlive) return;
    
    this.isAlive = false;
    this.changeState('dead');
    
    // TODO: Play death animation
    // TODO: Spawn particles
    // TODO: Drop items
    
    // Deactivate after delay
    setTimeout(() => {
      this.deactivate();
    }, 2000);
  }
  
  /**
   * Set the target for the enemy
   * @param {Object} target - Target object (usually the player)
   */
  setTarget(target) {
    this.target = target;
    
    // If in idle state, change to chase state if target is in range
    if (this.stateMachine.currentState === 'idle' && this.target) {
      const distanceToTarget = MathUtils.distance(this.position, this.target.position);
      if (distanceToTarget < this.options.detectionRange) {
        this.changeState('chase');
      }
    }
  }
  
  /**
   * Set waypoints for patrol
   * @param {Array<THREE.Vector3>} waypoints - Array of waypoint positions
   */
  setWaypoints(waypoints) {
    this.waypoints = waypoints;
    this.currentWaypoint = 0;
    
    // If in idle state, change to patrol state
    if (this.stateMachine.currentState === 'idle' && this.waypoints.length > 0) {
      this.changeState('patrol');
    }
  }
  
  /**
   * Move towards a target position
   * @param {THREE.Vector3} targetPosition - Position to move towards
   * @param {number} deltaTime - Time since last update
   * @returns {boolean} True if reached target position
   */
  moveTowards(targetPosition, deltaTime) {
    // Calculate direction to target
    const direction = new THREE.Vector3().subVectors(targetPosition, this.position).normalize();
    
    // Calculate velocity
    const velocity = direction.multiplyScalar(this.options.moveSpeed);
    
    // Apply velocity to physics body
    this.body.velocity.set(velocity.x, this.body.velocity.y, velocity.z);
    
    // Rotate to face direction of movement
    if (direction.length() > 0.1) {
      const targetRotation = Math.atan2(direction.x, direction.z);
      const currentRotation = this.mesh.rotation.y;
      
      // Smoothly rotate towards target rotation
      const rotationDelta = MathUtils.damp(
        currentRotation,
        targetRotation,
        0.1,
        deltaTime
      );
      
      this.mesh.rotation.y = rotationDelta;
    }
    
    // Check if reached target
    const distanceToTarget = MathUtils.distance(this.position, targetPosition);
    return distanceToTarget < 0.5;
  }
  
  /**
   * Attack the target
   * @param {number} currentTime - Current time
   * @returns {boolean} True if attack was performed
   */
  attackTarget(currentTime) {
    if (!this.target || !this.isActive || !this.isAlive) return false;
    
    // Check if can attack
    const timeSinceLastAttack = currentTime - this.lastAttackTime;
    if (timeSinceLastAttack < 1 / this.options.attackRate) return false;
    
    // Check if target is in range
    const distanceToTarget = MathUtils.distance(this.position, this.target.position);
    if (distanceToTarget > this.options.attackRange) return false;
    
    // Perform attack
    this.lastAttackTime = currentTime;
    
    // TODO: Implement attack logic (projectile, melee, etc.)
    console.log(`${this.options.type} attacks for ${this.options.damage} damage!`);
    
    return true;
  }
  
  /**
   * Change the current state
   * @param {string} newState - New state name
   */
  changeState(newState) {
    // Exit current state
    const currentState = this.stateMachine.states[this.stateMachine.currentState];
    if (currentState && currentState.exit) {
      currentState.exit();
    }
    
    // Change state
    this.stateMachine.currentState = newState;
    
    // Enter new state
    const state = this.stateMachine.states[newState];
    if (state && state.enter) {
      state.enter();
    }
  }
  
  // State machine methods
  
  // Idle state
  enterIdleState() {
    // Stop movement
    this.body.velocity.set(0, 0, 0);
  }
  
  updateIdleState(deltaTime) {
    // Check if target is in range
    if (this.target) {
      const distanceToTarget = MathUtils.distance(this.position, this.target.position);
      if (distanceToTarget < this.options.detectionRange) {
        this.changeState('chase');
        return;
      }
    }
    
    // If waypoints are set, switch to patrol
    if (this.waypoints.length > 0) {
      this.changeState('patrol');
      return;
    }
    
    // Random idle movement
    if (Math.random() < 0.01) {
      const randomOffset = new THREE.Vector3(
        MathUtils.randomFloat(-3, 3),
        0,
        MathUtils.randomFloat(-3, 3)
      );
      this.targetPosition.copy(this.position).add(randomOffset);
      this.moveTowards(this.targetPosition, deltaTime);
    }
  }
  
  exitIdleState() {
    // Nothing to do
  }
  
  // Patrol state
  enterPatrolState() {
    if (this.waypoints.length === 0) {
      this.changeState('idle');
      return;
    }
    
    // Set first waypoint as target
    this.targetPosition.copy(this.waypoints[this.currentWaypoint]);
  }
  
  updatePatrolState(deltaTime) {
    // Check if target is in range
    if (this.target) {
      const distanceToTarget = MathUtils.distance(this.position, this.target.position);
      if (distanceToTarget < this.options.detectionRange) {
        this.changeState('chase');
        return;
      }
    }
    
    // Move towards current waypoint
    const reachedWaypoint = this.moveTowards(this.targetPosition, deltaTime);
    
    // If reached waypoint, move to next
    if (reachedWaypoint) {
      this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
      this.targetPosition.copy(this.waypoints[this.currentWaypoint]);
    }
  }
  
  exitPatrolState() {
    // Nothing to do
  }
  
  // Chase state
  enterChaseState() {
    if (!this.target) {
      this.changeState('idle');
      return;
    }
  }
  
  updateChaseState(deltaTime) {
    if (!this.target) {
      this.changeState('idle');
      return;
    }
    
    // Update target position
    this.targetPosition.copy(this.target.position);
    
    // Move towards target
    const distanceToTarget = MathUtils.distance(this.position, this.targetPosition);
    
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
  
  exitChaseState() {
    // Nothing to do
  }
  
  // Attack state
  enterAttackState() {
    if (!this.target) {
      this.changeState('idle');
      return;
    }
    
    // Stop movement
    this.body.velocity.set(0, 0, 0);
  }
  
  updateAttackState(deltaTime) {
    if (!this.target) {
      this.changeState('idle');
      return;
    }
    
    // Check distance to target
    const distanceToTarget = MathUtils.distance(this.position, this.target.position);
    
    // If target is out of attack range but still in detection range, chase
    if (distanceToTarget > this.options.attackRange) {
      this.changeState('chase');
      return;
    }
    
    // Face target
    const direction = new THREE.Vector3().subVectors(this.target.position, this.position).normalize();
    if (direction.length() > 0.1) {
      const targetRotation = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = MathUtils.damp(
        this.mesh.rotation.y,
        targetRotation,
        0.1,
        deltaTime
      );
    }
    
    // Attack target
    this.attackTarget(performance.now() / 1000);
  }
  
  exitAttackState() {
    // Nothing to do
  }
  
  // Flee state
  enterFleeState() {
    // Nothing to do
  }
  
  updateFleeState(deltaTime) {
    if (!this.target) {
      this.changeState('idle');
      return;
    }
    
    // Move away from target
    const fleeDirection = new THREE.Vector3().subVectors(this.position, this.target.position).normalize();
    const fleePosition = new THREE.Vector3().copy(this.position).add(
      fleeDirection.multiplyScalar(this.options.detectionRange)
    );
    
    this.moveTowards(fleePosition, deltaTime);
    
    // If far enough from target, go back to idle
    const distanceToTarget = MathUtils.distance(this.position, this.target.position);
    if (distanceToTarget > this.options.detectionRange * 1.5) {
      this.changeState('idle');
    }
  }
  
  exitFleeState() {
    // Nothing to do
  }
  
  // Stunned state
  enterStunnedState() {
    // Stop movement
    this.body.velocity.set(0, 0, 0);
    
    // Visual feedback for stunned state
    if (this.mesh.material) {
      this.originalColor = this.mesh.material.color.clone();
      this.mesh.material.color.set(0x0000ff); // Blue for stunned
    }
  }
  
  updateStunnedState(deltaTime) {
    // Do nothing while stunned
    // Transition handled by the stun method with a timeout
  }
  
  exitStunnedState() {
    // Restore original color
    if (this.mesh.material && this.originalColor) {
      this.mesh.material.color.copy(this.originalColor);
    }
  }
  
  // Dead state
  enterDeadState() {
    // Stop movement
    this.body.velocity.set(0, 0, 0);
    
    // Visual feedback for death
    if (this.mesh.material) {
      this.mesh.material.opacity = 0.5;
      this.mesh.material.transparent = true;
    }
    
    // Hide health bar
    if (this.healthBarContainer) {
      this.healthBarContainer.visible = false;
    }
  }
  
  updateDeadState(deltaTime) {
    // Fade out
    if (this.mesh.material) {
      this.mesh.material.opacity = Math.max(0, this.mesh.material.opacity - deltaTime * 0.5);
    }
    
    // Sink into ground
    this.mesh.position.y = Math.max(-1, this.mesh.position.y - deltaTime * 0.5);
  }
  
  exitDeadState() {
    // Nothing to do
  }
  
  /**
   * Stun the enemy for a duration
   * @param {number} duration - Stun duration in seconds
   */
  stun(duration) {
    if (!this.isActive || !this.isAlive) return;
    
    this.changeState('stunned');
    
    // Return to previous state after duration
    setTimeout(() => {
      if (this.isActive && this.isAlive && this.stateMachine.currentState === 'stunned') {
        this.changeState('idle');
      }
    }, duration * 1000);
  }
  
  /**
   * Clean up the enemy
   */
  dispose() {
    // Remove from scene
    if (this.mesh) {
      this.scene.remove(this.mesh);
    }
    
    // Remove from physics world
    if (this.body) {
      this.physics.removeBody(this.body);
    }
    
    // Remove from update list
    if (this.mesh && this.body) {
      this.physics.removeObjectToUpdate(this.mesh);
    }
    
    // Dispose geometries and materials
    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) {
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(material => material.dispose());
        } else {
          this.mesh.material.dispose();
        }
      }
    }
  }
} 