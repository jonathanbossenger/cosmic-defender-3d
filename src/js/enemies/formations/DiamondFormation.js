import { Formation } from './Formation.js';
import * as THREE from 'three';

/**
 * Diamond formation
 * Enemies arranged in a diamond pattern
 */
export class DiamondFormation extends Formation {
  /**
   * Create a new diamond formation
   * @param {Object} options - Formation options
   */
  constructor(options = {}) {
    // Set diamond-specific default options
    const diamondOptions = Object.assign({
      type: 'diamond',
      size: 5, // Size of the diamond (radius)
      layers: 3, // Number of layers
      rotationSpeed: 0.2, // Rotate slowly
      waveAmplitude: 0.3, // Add wave effect
      waveFrequency: 0.8,
      enemyTypeDistribution: {
        drone: 0.6,
        soldier: 0.3,
        elite: 0.1,
        commander: 0.0
      }
    }, options);
    
    // Call parent constructor
    super(diamondOptions);
  }
  
  /**
   * Generate positions for the diamond formation
   */
  generatePositions() {
    this.positions = [];
    
    // Create center position
    this.positions.push(new THREE.Vector3(0, 0, 0));
    
    // Create layers
    for (let layer = 1; layer <= this.options.layers; layer++) {
      const radius = layer * this.options.spacing;
      const pointsInLayer = layer * 4; // 4 points per layer (diamond shape)
      
      for (let i = 0; i < pointsInLayer; i++) {
        const angle = (i / pointsInLayer) * Math.PI * 2;
        
        // Calculate position
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        // Add position
        this.positions.push(new THREE.Vector3(x, 0, z));
      }
    }
  }
  
  /**
   * Update the diamond formation
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
          // Different wave pattern for diamond formation
          // Center rises and falls, outer layers follow with delay
          const layerIndex = i === 0 ? 0 : Math.floor(Math.sqrt(i) / 2) + 1;
          const layerDelay = layerIndex * 0.3;
          const waveOffset = Math.sin(this.time * this.options.waveFrequency - layerDelay) * this.options.waveAmplitude;
          
          targetPosition.y += waveOffset;
        }
        
        // Move enemy towards position
        enemy.targetPosition.copy(targetPosition);
      }
    }
  }
  
  /**
   * Get the commander position index
   * @returns {number} Index of the commander position (center)
   */
  getCommanderPositionIndex() {
    // Commander is at the center
    return 0;
  }
  
  /**
   * Get the elite position indices
   * @returns {Array<number>} Indices of elite positions (first layer)
   */
  getElitePositionIndices() {
    // Elites are in the first layer
    const indices = [];
    
    // First layer starts at index 1 and has 4 positions
    for (let i = 1; i <= 4; i++) {
      indices.push(i);
    }
    
    return indices;
  }
  
  /**
   * Get the soldier position indices
   * @returns {Array<number>} Indices of soldier positions (second layer)
   */
  getSoldierPositionIndices() {
    // Soldiers are in the second layer
    const indices = [];
    
    // Second layer starts after first layer and has 8 positions
    for (let i = 5; i <= 12; i++) {
      indices.push(i);
    }
    
    return indices;
  }
  
  /**
   * Get the drone position indices
   * @returns {Array<number>} Indices of drone positions (outer layers)
   */
  getDronePositionIndices() {
    // Drones are in the outer layers
    const indices = [];
    
    // Outer layers start after second layer
    for (let i = 13; i < this.positions.length; i++) {
      indices.push(i);
    }
    
    return indices;
  }
} 