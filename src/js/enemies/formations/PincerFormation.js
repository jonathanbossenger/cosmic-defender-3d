import { Formation } from './Formation.js';
import * as THREE from 'three';

/**
 * PincerFormation - Creates a formation with two or more "arms" that can surround the player
 * Useful for flanking maneuvers and encirclement tactics
 */
export class PincerFormation extends Formation {
  constructor(options = {}) {
    // Set default options for pincer formation
    const defaults = {
      type: 'pincer',
      arms: 2,                  // Number of arms in the pincer
      enemiesPerArm: 5,         // Number of enemies per arm
      armAngle: 120,            // Angle between arms in degrees
      armLength: 15,            // Length of each arm
      armCurvature: 0.3,        // How much the arms curve (0 = straight, 1 = fully curved)
      spacing: 2.0,             // Spacing between enemies in each arm
      rotationSpeed: 0.1,       // Rotation speed of the formation
      moveSpeed: 3.0,           // Movement speed of the formation
      waveAmplitude: 0.2,       // Amplitude of the wave motion
      waveFrequency: 1.2,       // Frequency of the wave motion
      enemyTypes: ['drone', 'soldier'],
      enemyTypeDistribution: {
        drone: 0.8,
        soldier: 0.2,
        elite: 0.0,
        commander: 0.0
      }
    };
    
    // Merge defaults with provided options
    super({...defaults, ...options});
    
    // Additional properties specific to pincer formation
    this.arms = options.arms || defaults.arms;
    this.enemiesPerArm = options.enemiesPerArm || defaults.enemiesPerArm;
    this.armAngle = options.armAngle || defaults.armAngle;
    this.armLength = options.armLength || defaults.armLength;
    this.armCurvature = options.armCurvature || defaults.armCurvature;
    
    // Track arm positions for special behaviors
    this.armPositions = [];
    
    // Track formation phase for movement patterns
    this.phase = 0;
    this.phaseSpeed = 0.5;
    this.attackMode = false;
    this.attackTarget = null;
  }
  
  /**
   * Generate positions for the pincer formation
   */
  generatePositions() {
    this.positions = [];
    this.armPositions = [];
    
    // Calculate the base angle between arms
    const angleStep = (this.armAngle * Math.PI / 180) / (this.arms - 1);
    const startAngle = -this.armAngle * Math.PI / 360; // Start at -half the total angle
    
    // Create each arm
    for (let arm = 0; arm < this.arms; arm++) {
      const armPositions = [];
      
      // Calculate the angle for this arm
      const armAngle = startAngle + (arm * angleStep);
      
      // Create enemies along the arm
      for (let i = 0; i < this.enemiesPerArm; i++) {
        // Calculate position along the arm (0 to 1)
        const t = i / (this.enemiesPerArm - 1);
        
        // Calculate distance from center
        const distance = this.armLength * t;
        
        // Apply curvature to the arm
        const curveFactor = this.armCurvature * Math.sin(t * Math.PI);
        const curveAngle = armAngle + (curveFactor * Math.PI / 4);
        
        // Calculate position
        const x = Math.sin(curveAngle) * distance;
        const z = -Math.cos(curveAngle) * distance;
        const y = 0; // All enemies at same height initially
        
        // Create position vector
        const position = new THREE.Vector3(x, y, z);
        
        // Add to positions array
        this.positions.push(position);
        armPositions.push(this.positions.length - 1); // Store index in positions array
      }
      
      // Store the arm positions
      this.armPositions.push(armPositions);
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
    
    // Store target for attack calculations
    this.attackTarget = targetPosition;
    
    // Calculate direction to target
    const direction = new THREE.Vector3().subVectors(targetPosition, this.position);
    const distance = direction.length();
    direction.normalize();
    
    // Determine if we should enter attack mode
    if (distance < 20 && !this.attackMode) {
      this.attackMode = true;
      this.startAttackPattern();
    } else if (distance > 30 && this.attackMode) {
      this.attackMode = false;
    }
    
    // Different behavior based on mode
    if (this.attackMode) {
      this.updateAttackMode(deltaTime, targetPosition);
    } else {
      this.updateApproachMode(deltaTime, direction, distance);
    }
    
    // Update enemy positions
    this.updateEnemyPositions(deltaTime);
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
    const orbitSpeed = this.rotationSpeed * 2;
    const orbitRadius = 15;
    
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
   * Start attack pattern
   */
  startAttackPattern() {
    // When entering attack mode, we can modify the formation
    // For example, we could spread out the arms more
    this.armAngle = Math.min(this.armAngle * 1.5, 270); // Widen the pincer
    
    // Regenerate positions with new angle
    this.generatePositions();
    
    // Update enemy positions immediately
    this.updateEnemyPositions(0.1);
  }
  
  /**
   * Update positions of all enemies in the formation
   * @param {number} deltaTime - Time since last update
   */
  updateEnemyPositions(deltaTime) {
    // Apply wave effect to each arm
    this.armPositions.forEach((armIndices, armIndex) => {
      // Each arm has a slightly different phase
      const armPhase = this.phase + (armIndex * 0.5);
      
      armIndices.forEach((posIndex, enemyIndex) => {
        // Skip if no position at this index
        if (!this.positions[posIndex]) return;
        
        // Get the base position
        const basePosition = this.positions[posIndex].clone();
        
        // Apply wave motion
        const t = enemyIndex / (this.enemiesPerArm - 1);
        const waveOffset = Math.sin(armPhase + t * Math.PI * 2) * this.waveAmplitude;
        
        // Apply offset
        basePosition.y += waveOffset;
        
        // Get world position
        const worldPosition = this.getWorldPosition(basePosition);
        
        // Update enemy position if it exists
        if (this.enemies[posIndex]) {
          this.enemies[posIndex].setTargetPosition(worldPosition);
        }
      });
    });
  }
  
  /**
   * Get indices for soldier positions (typically at the front of each arm)
   * @returns {Array} Array of position indices for soldiers
   */
  getSoldierIndices() {
    const indices = [];
    
    // Put soldiers at the front of each arm
    this.armPositions.forEach(armIndices => {
      // Add the first 1-2 positions of each arm
      const soldiersPerArm = Math.min(2, Math.floor(this.enemiesPerArm * 0.3));
      for (let i = 0; i < soldiersPerArm; i++) {
        indices.push(armIndices[i]);
      }
    });
    
    return indices;
  }
  
  /**
   * Get indices for drone positions (typically the rest of the formation)
   * @returns {Array} Array of position indices for drones
   */
  getDroneIndices() {
    const indices = [];
    const soldierIndices = this.getSoldierIndices();
    
    // All positions that aren't soldiers are drones
    for (let i = 0; i < this.positions.length; i++) {
      if (!soldierIndices.includes(i)) {
        indices.push(i);
      }
    }
    
    return indices;
  }
} 