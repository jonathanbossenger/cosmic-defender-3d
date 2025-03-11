import * as THREE from 'three';
import { MathUtils } from '../../utils/math.js';

/**
 * Base formation class for organizing enemies
 */
export class Formation {
  /**
   * Create a new formation
   * @param {Object} options - Formation options
   */
  constructor(options = {}) {
    // Set default options
    this.options = Object.assign({
      type: 'basic',
      spacing: 3.0,
      rows: 3,
      columns: 3,
      centerOffset: new THREE.Vector3(0, 0, 0),
      rotationSpeed: 0.0,
      moveSpeed: 2.0,
      waveAmplitude: 0.0,
      waveFrequency: 1.0,
      enemyTypes: ['drone'],
      enemyTypeDistribution: {
        drone: 0.7,
        soldier: 0.2,
        elite: 0.1,
        commander: 0.0
      }
    }, options);
    
    // Formation properties
    this.positions = [];
    this.enemies = [];
    this.center = new THREE.Vector3();
    this.targetCenter = new THREE.Vector3();
    this.rotation = 0;
    this.active = false;
    this.time = 0;
    
    // Generate positions
    this.generatePositions();
  }
  
  /**
   * Generate positions for the formation
   */
  generatePositions() {
    this.positions = [];
    
    // Basic grid formation
    const totalWidth = (this.options.columns - 1) * this.options.spacing;
    const totalDepth = (this.options.rows - 1) * this.options.spacing;
    
    for (let row = 0; row < this.options.rows; row++) {
      for (let col = 0; col < this.options.columns; col++) {
        // Calculate position
        const x = col * this.options.spacing - totalWidth / 2;
        const z = row * this.options.spacing - totalDepth / 2;
        
        // Add position
        this.positions.push(new THREE.Vector3(x, 0, z));
      }
    }
  }
  
  /**
   * Activate the formation
   * @param {THREE.Vector3} center - Center position of the formation
   */
  activate(center) {
    this.active = true;
    this.center.copy(center);
    this.targetCenter.copy(center);
    this.time = 0;
  }
  
  /**
   * Deactivate the formation
   */
  deactivate() {
    this.active = false;
    this.enemies = [];
  }
  
  /**
   * Add an enemy to the formation
   * @param {Object} enemy - Enemy to add
   * @param {number} index - Position index
   */
  addEnemy(enemy, index) {
    if (index >= this.positions.length) {
      console.warn('Formation position index out of bounds');
      return;
    }
    
    // Store enemy
    this.enemies[index] = enemy;
    
    // Set enemy position
    const position = this.getWorldPosition(index);
    enemy.position.copy(position);
  }
  
  /**
   * Get world position for a formation position
   * @param {number} index - Position index
   * @returns {THREE.Vector3} World position
   */
  getWorldPosition(index) {
    if (index >= this.positions.length) {
      console.warn('Formation position index out of bounds');
      return new THREE.Vector3();
    }
    
    // Get local position
    const localPosition = this.positions[index].clone();
    
    // Apply rotation
    const rotatedX = localPosition.x * Math.cos(this.rotation) - localPosition.z * Math.sin(this.rotation);
    const rotatedZ = localPosition.x * Math.sin(this.rotation) + localPosition.z * Math.cos(this.rotation);
    
    // Apply center offset
    const worldPosition = new THREE.Vector3(
      rotatedX + this.center.x + this.options.centerOffset.x,
      localPosition.y + this.center.y + this.options.centerOffset.y,
      rotatedZ + this.center.z + this.options.centerOffset.z
    );
    
    return worldPosition;
  }
  
  /**
   * Update the formation
   * @param {number} deltaTime - Time since last update
   */
  update(deltaTime) {
    if (!this.active) return;
    
    // Update time
    this.time += deltaTime;
    
    // Update rotation
    this.rotation += this.options.rotationSpeed * deltaTime;
    
    // Move towards target
    if (!this.center.equals(this.targetCenter)) {
      const direction = new THREE.Vector3().subVectors(this.targetCenter, this.center);
      const distance = direction.length();
      
      if (distance > 0.1) {
        direction.normalize();
        const moveAmount = Math.min(distance, this.options.moveSpeed * deltaTime);
        this.center.add(direction.multiplyScalar(moveAmount));
      } else {
        this.center.copy(this.targetCenter);
      }
    }
    
    // Update enemy positions
    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      
      if (enemy && enemy.isActive && enemy.isAlive) {
        // Get target position
        const targetPosition = this.getWorldPosition(i);
        
        // Apply wave effect if enabled
        if (this.options.waveAmplitude > 0) {
          const waveOffset = Math.sin(this.time * this.options.waveFrequency + i * 0.5) * this.options.waveAmplitude;
          targetPosition.y += waveOffset;
        }
        
        // Move enemy towards position
        enemy.targetPosition.copy(targetPosition);
      }
    }
  }
  
  /**
   * Set the target center position
   * @param {THREE.Vector3} position - Target center position
   */
  setTargetCenter(position) {
    this.targetCenter.copy(position);
  }
  
  /**
   * Get the number of active enemies in the formation
   * @returns {number} Number of active enemies
   */
  getActiveEnemyCount() {
    let count = 0;
    
    for (const enemy of this.enemies) {
      if (enemy && enemy.isActive && enemy.isAlive) {
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Check if the formation is defeated
   * @returns {boolean} True if all enemies are defeated
   */
  isDefeated() {
    return this.getActiveEnemyCount() === 0;
  }
  
  /**
   * Get a random enemy type based on distribution
   * @returns {string} Enemy type
   */
  getRandomEnemyType() {
    const rand = Math.random();
    let cumulativeProbability = 0;
    
    for (const type in this.options.enemyTypeDistribution) {
      cumulativeProbability += this.options.enemyTypeDistribution[type];
      
      if (rand < cumulativeProbability) {
        return type;
      }
    }
    
    // Default to first enemy type
    return this.options.enemyTypes[0];
  }
  
  /**
   * Get the size of the formation
   * @returns {number} Number of positions in the formation
   */
  getSize() {
    return this.positions.length;
  }
} 