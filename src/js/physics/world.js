import * as CANNON from 'cannon-es';

export class PhysicsWorld {
  constructor() {
    // Create physics world
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0), // Earth gravity
    });
    
    // Set solver iterations for better stability
    this.world.solver.iterations = 10;
    
    // Set contact material properties
    this.defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
      this.defaultMaterial,
      this.defaultMaterial,
      {
        friction: 0.3,
        restitution: 0.2,
      }
    );
    this.world.addContactMaterial(defaultContactMaterial);
    this.world.defaultContactMaterial = defaultContactMaterial;
    
    // Objects map to link Three.js and Cannon.js objects
    this.objectsToUpdate = [];
  }
  
  step(deltaTime) {
    // Step the physics world
    this.world.step(1 / 60, deltaTime, 3);
    
    // Update all objects
    for (const object of this.objectsToUpdate) {
      object.mesh.position.copy(object.body.position);
      object.mesh.quaternion.copy(object.body.quaternion);
    }
  }
  
  addBody(body) {
    this.world.addBody(body);
    return body;
  }
  
  removeBody(body) {
    this.world.removeBody(body);
  }
  
  addObjectToUpdate(mesh, body) {
    this.objectsToUpdate.push({
      mesh,
      body,
    });
  }
  
  removeObjectToUpdate(mesh) {
    this.objectsToUpdate = this.objectsToUpdate.filter(object => object.mesh !== mesh);
  }
}
