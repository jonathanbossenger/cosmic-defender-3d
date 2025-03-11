/**
 * Update the soldier
 * @param {number} deltaTime - Time since last update
 */
update(deltaTime) {
  // Update position and rotation
  this.updatePosition(deltaTime);
  this.updateRotation(deltaTime);
  
  // Update animations
  this.updateAnimations(deltaTime);
  
  // Update weapon
  if (this.weapon) {
    this.weapon.update(deltaTime);
  }
  
  // Update health regeneration
  this.updateHealthRegeneration(deltaTime);
  
  // Check for cover
  this.updateCoverState();
  
  // Check for environmental hazards
  this.checkEnvironmentalHazards();
  
  // Check boundary
  this.checkBoundary();
}

/**
 * Check for environmental hazards
 */
checkEnvironmentalHazards() {
  const arena = this.scene.userData.arena;
  if (!arena) return;
  
  const hazard = arena.isInHazardZone(this.mesh.position);
  if (hazard) {
    // Take damage from hazard
    this.takeDamage(hazard.damage * 0.1); // Scale damage for gameplay balance
    
    // Create damage effect
    arena.createHazardDamageEffect(this.mesh.position.clone());
    
    // Try to move away from hazard if AI controlled
    if (!this.isPlayer) {
      this.findSafePosition();
    }
  }
}

/**
 * Check if soldier is within arena boundary
 */
checkBoundary() {
  const arena = this.scene.userData.arena;
  if (!arena) return;
  
  if (arena.isOutsideBoundary(this.mesh.position)) {
    // Take damage for being outside boundary
    this.takeDamage(5);
    
    // Create breach effect
    arena.createBoundaryBreachEffect(this.mesh.position.clone());
    
    // Force AI soldiers back into arena
    if (!this.isPlayer) {
      this.findSafePosition();
    }
  }
}

/**
 * Find a safe position away from hazards and within boundary
 */
findSafePosition() {
  const arena = this.scene.userData.arena;
  if (!arena) return;
  
  // Get current position
  const currentPos = this.mesh.position.clone();
  
  // Try positions in different directions
  const directions = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1)
  ];
  
  for (const dir of directions) {
    const testPos = currentPos.clone().add(dir.multiplyScalar(5));
    
    // Check if position is safe
    if (!arena.isInHazardZone(testPos) && !arena.isOutsideBoundary(testPos)) {
      // Move towards safe position
      this.moveTarget.copy(testPos);
      break;
    }
  }
} 