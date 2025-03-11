import { Formation } from './Formation.js';
import * as THREE from 'three';

/**
 * EliteSquadFormation - Creates a formation with elite enemies surrounded by support units
 * Features a commander in the center with elites in an inner circle and support units in outer circles
 */
export class EliteSquadFormation extends Formation {
  constructor(options = {}) {
    // Set default options for elite squad formation
    const defaults = {
      type: 'eliteSquad',
      innerRadius: 3.0,         // Radius of inner circle (elites)
      outerRadius: 6.0,         // Radius of outer circle (support units)
      innerCount: 4,            // Number of elites in inner circle
      outerCount: 8,            // Number of support units in outer circle
      hasCommander: true,       // Whether the formation has a commander
      rotationSpeed: 0.15,      // Rotation speed of the formation
      moveSpeed: 2.0,           // Movement speed of the formation
      waveAmplitude: 0.0,       // Amplitude of the wave motion
      waveFrequency: 1.0,       // Frequency of the wave motion
      enemyTypes: ['elite', 'soldier', 'drone'],
      enemyTypeDistribution: {
        drone: 0.4,
        soldier: 0.3,
        elite: 0.2,
        commander: 0.1
      }
    };
    
    // Merge defaults with provided options
    super({...defaults, ...options});
    
    // Additional properties specific to elite squad formation
    this.innerRadius = options.innerRadius || defaults.innerRadius;
    this.outerRadius = options.outerRadius || defaults.outerRadius;
    this.innerCount = options.innerCount || defaults.innerCount;
    this.outerCount = options.outerCount || defaults.outerCount;
    this.hasCommander = options.hasCommander !== undefined ? options.hasCommander : defaults.hasCommander;
    
    // Track circle positions for special behaviors
    this.centerIndex = -1;
    this.innerCircleIndices = [];
    this.outerCircleIndices = [];
    
    // Track formation phase for movement patterns
    this.phase = 0;
    this.phaseSpeed = 0.3;
    this.defenseMode = false;
    this.attackMode = false;
  }
  
  /**
   * Generate positions for the elite squad formation
   */
  generatePositions() {
    this.positions = [];
    this.innerCircleIndices = [];
    this.outerCircleIndices = [];
    
    // Center position (commander)
    if (this.hasCommander) {
      this.positions.push(new THREE.Vector3(0, 0, 0));
      this.centerIndex = 0;
    }
    
    // Inner circle (elites)
    for (let i = 0; i < this.innerCount; i++) {
      const angle = (i / this.innerCount) * Math.PI * 2;
      const x = Math.sin(angle) * this.innerRadius;
      const z = Math.cos(angle) * this.innerRadius;
      const y = 0;
      
      this.positions.push(new THREE.Vector3(x, y, z));
      this.innerCircleIndices.push(this.positions.length - 1);
    }
    
    // Outer circle (support units)
    for (let i = 0; i < this.outerCount; i++) {
      const angle = (i / this.outerCount) * Math.PI * 2;
      const x = Math.sin(angle) * this.outerRadius;
      const z = Math.cos(angle) * this.outerRadius;
      const y = 0;
      
      this.positions.push(new THREE.Vector3(x, y, z));
      this.outerCircleIndices.push(this.positions.length - 1);
    }
    
    // Store the total number of positions
    this.totalPositions = this.positions.length;
    
    return this.positions;
  }
  
  /**
   * Update the formation
   * @param {number} deltaTime - Time since last update
   * @param {THREE.Vector3} targetPosition - Position to move towards (usually player)
   */
  update(deltaTime, targetPosition) {
    if (!this.active) return;
    
    // Update phase for wave motion
    this.phase += deltaTime * this.phaseSpeed;
    
    // Calculate direction to target
    const direction = new THREE.Vector3().subVectors(targetPosition, this.position);
    const distance = direction.length();
    direction.normalize();
    
    // Determine formation mode based on distance
    if (distance < 15 && !this.defenseMode) {
      this.defenseMode = true;
      this.attackMode = false;
      this.startDefensePattern();
    } else if (distance < 25 && !this.attackMode && !this.defenseMode) {
      this.attackMode = true;
      this.defenseMode = false;
      this.startAttackPattern();
    } else if (distance > 30 && (this.attackMode || this.defenseMode)) {
      this.attackMode = false;
      this.defenseMode = false;
      this.resetFormation();
    }
    
    // Different behavior based on mode
    if (this.defenseMode) {
      this.updateDefenseMode(deltaTime, targetPosition);
    } else if (this.attackMode) {
      this.updateAttackMode(deltaTime, targetPosition);
    } else {
      this.updateApproachMode(deltaTime, direction, distance);
    }
    
    // Update enemy positions
    this.updateEnemyPositions(deltaTime);
    
    // Apply rotation to the formation
    this.rotation.y += deltaTime * this.rotationSpeed;
  }
  
  /**
   * Update formation in approach mode
   * @param {number} deltaTime - Time since last update
   * @param {THREE.Vector3} direction - Direction to target
   * @param {number} distance - Distance to target
   */
  updateApproachMode(deltaTime, direction, distance) {
    // Move towards target at moveSpeed
    const moveAmount = Math.min(this.moveSpeed * deltaTime, distance);
    this.position.add(direction.clone().multiplyScalar(moveAmount));
    
    // Rotate formation to face target
    const targetRotation = Math.atan2(direction.x, -direction.z);
    this.rotation.y = THREE.MathUtils.lerp(
      this.rotation.y,
      targetRotation,
      deltaTime * 2
    );
  }
  
  /**
   * Update formation in attack mode
   * @param {number} deltaTime - Time since last update
   * @param {THREE.Vector3} targetPosition - Target position
   */
  updateAttackMode(deltaTime, targetPosition) {
    // In attack mode, circle around the target
    const orbitSpeed = this.rotationSpeed * 1.5;
    const orbitRadius = 20;
    
    // Calculate orbit position
    this.orbitAngle = (this.orbitAngle || 0) + (deltaTime * orbitSpeed);
    
    // Calculate new position
    const newX = targetPosition.x + Math.sin(this.orbitAngle) * orbitRadius;
    const newZ = targetPosition.z + Math.cos(this.orbitAngle) * orbitRadius;
    
    // Smoothly move to new position
    this.position.x = THREE.MathUtils.lerp(this.position.x, newX, deltaTime * 2);
    this.position.z = THREE.MathUtils.lerp(this.position.z, newZ, deltaTime * 2);
    
    // Always face the target
    const direction = new THREE.Vector3().subVectors(targetPosition, this.position);
    const targetRotation = Math.atan2(direction.x, -direction.z);
    this.rotation.y = THREE.MathUtils.lerp(
      this.rotation.y,
      targetRotation,
      deltaTime * 3
    );
  }
  
  /**
   * Update formation in defense mode
   * @param {number} deltaTime - Time since last update
   * @param {THREE.Vector3} targetPosition - Target position
   */
  updateDefenseMode(deltaTime, targetPosition) {
    // In defense mode, back away from target while maintaining formation
    const direction = new THREE.Vector3().subVectors(this.position, targetPosition).normalize();
    
    // Move away from target
    this.position.add(direction.clone().multiplyScalar(this.moveSpeed * 0.5 * deltaTime));
    
    // Always face the target
    const faceDirection = new THREE.Vector3().subVectors(targetPosition, this.position);
    const targetRotation = Math.atan2(faceDirection.x, -faceDirection.z);
    this.rotation.y = THREE.MathUtils.lerp(
      this.rotation.y,
      targetRotation,
      deltaTime * 3
    );
  }
  
  /**
   * Start attack pattern
   */
  startAttackPattern() {
    // When entering attack mode, we can modify the formation
    // For example, we could spread out the outer circle
    this.outerRadius *= 1.2;
    
    // Regenerate positions with new radius
    this.generatePositions();
    
    // Update enemy positions immediately
    this.updateEnemyPositions(0.1);
  }
  
  /**
   * Start defense pattern
   */
  startDefensePattern() {
    // When entering defense mode, we can modify the formation
    // For example, we could tighten the formation
    this.innerRadius *= 0.8;
    this.outerRadius *= 0.8;
    
    // Regenerate positions with new radius
    this.generatePositions();
    
    // Update enemy positions immediately
    this.updateEnemyPositions(0.1);
  }
  
  /**
   * Reset formation to default
   */
  resetFormation() {
    // Reset radii to original values
    this.innerRadius = this.options.innerRadius || 3.0;
    this.outerRadius = this.options.outerRadius || 6.0;
    
    // Regenerate positions
    this.generatePositions();
    
    // Update enemy positions immediately
    this.updateEnemyPositions(0.1);
  }
  
  /**
   * Update positions of all enemies in the formation
   * @param {number} deltaTime - Time since last update
   */
  updateEnemyPositions(deltaTime) {
    // Apply wave effect to each circle
    
    // Center (commander)
    if (this.centerIndex >= 0 && this.positions[this.centerIndex]) {
      const basePosition = this.positions[this.centerIndex].clone();
      
      // Commander hovers slightly
      basePosition.y = Math.sin(this.phase) * 0.5 + 1.0;
      
      // Get world position
      const worldPosition = this.getWorldPosition(basePosition);
      
      // Update enemy position if it exists
      if (this.enemies[this.centerIndex]) {
        this.enemies[this.centerIndex].setTargetPosition(worldPosition);
      }
    }
    
    // Inner circle (elites)
    this.innerCircleIndices.forEach((posIndex, i) => {
      if (!this.positions[posIndex]) return;
      
      const basePosition = this.positions[posIndex].clone();
      
      // Apply wave motion - inner circle moves up and down together
      basePosition.y = Math.sin(this.phase) * this.waveAmplitude * 0.5 + 0.5;
      
      // Get world position
      const worldPosition = this.getWorldPosition(basePosition);
      
      // Update enemy position if it exists
      if (this.enemies[posIndex]) {
        this.enemies[posIndex].setTargetPosition(worldPosition);
      }
    });
    
    // Outer circle (support units)
    this.outerCircleIndices.forEach((posIndex, i) => {
      if (!this.positions[posIndex]) return;
      
      const basePosition = this.positions[posIndex].clone();
      
      // Apply wave motion - outer circle has alternating pattern
      const waveOffset = Math.sin(this.phase + (i / this.outerCount) * Math.PI * 2) * this.waveAmplitude;
      basePosition.y = waveOffset;
      
      // Get world position
      const worldPosition = this.getWorldPosition(basePosition);
      
      // Update enemy position if it exists
      if (this.enemies[posIndex]) {
        this.enemies[posIndex].setTargetPosition(worldPosition);
      }
    });
  }
  
  /**
   * Get index for commander position (center)
   * @returns {number} Index of commander position or -1 if none
   */
  getCommanderIndex() {
    return this.centerIndex;
  }
  
  /**
   * Get indices for elite positions (inner circle)
   * @returns {Array} Array of position indices for elites
   */
  getEliteIndices() {
    return this.innerCircleIndices;
  }
  
  /**
   * Get indices for soldier positions (first half of outer circle)
   * @returns {Array} Array of position indices for soldiers
   */
  getSoldierIndices() {
    // Use the first half of the outer circle for soldiers
    const halfCount = Math.ceil(this.outerCircleIndices.length / 2);
    return this.outerCircleIndices.slice(0, halfCount);
  }
  
  /**
   * Get indices for drone positions (second half of outer circle)
   * @returns {Array} Array of position indices for drones
   */
  getDroneIndices() {
    // Use the second half of the outer circle for drones
    const halfCount = Math.ceil(this.outerCircleIndices.length / 2);
    return this.outerCircleIndices.slice(halfCount);
  }
} 