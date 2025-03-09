import * as THREE from 'three';

export class Weapon {
  constructor(scene, camera, loadingManager) {
    this.scene = scene;
    this.camera = camera;
    this.loadingManager = loadingManager;
    
    // Weapon properties
    this.name = 'Basic Weapon';
    this.damage = 10;
    this.fireRate = 5; // shots per second
    this.ammoCapacity = 30;
    this.currentAmmo = this.ammoCapacity;
    this.reloadTime = 2; // seconds
    this.isReloading = false;
    this.lastFireTime = 0;
    
    // Raycaster for shooting
    this.raycaster = new THREE.Raycaster();
    this.shootDirection = new THREE.Vector3();
    
    // Muzzle flash
    this.muzzleFlash = this.createMuzzleFlash();
    this.muzzleFlash.visible = false;
    
    // Bullet trail
    this.bulletTrail = this.createBulletTrail();
    this.bulletTrail.visible = false;
    
    // UI elements
    this.ammoCounter = document.getElementById('ammo-counter');
    this.updateAmmoCounter();
    
    // Sound effects
    // this.shootSound = new Audio('/assets/sounds/shoot.mp3');
    // this.reloadSound = new Audio('/assets/sounds/reload.mp3');
    // this.emptySound = new Audio('/assets/sounds/empty.mp3');
  }
  
  createMuzzleFlash() {
    const geometry = new THREE.PlaneGeometry(0.5, 0.5);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    
    const muzzleFlash = new THREE.Mesh(geometry, material);
    muzzleFlash.position.set(0, 0, -1);
    muzzleFlash.rotation.z = Math.random() * Math.PI;
    
    this.camera.add(muzzleFlash);
    
    return muzzleFlash;
  }
  
  createBulletTrail() {
    const material = new THREE.LineBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.5,
    });
    
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0, -100),
    ]);
    
    const line = new THREE.Line(geometry, material);
    this.camera.add(line);
    
    return line;
  }
  
  shoot() {
    // Check if can shoot
    const now = performance.now();
    const timeSinceLastFire = (now - this.lastFireTime) / 1000;
    
    if (
      this.isReloading ||
      this.currentAmmo <= 0 ||
      timeSinceLastFire < 1 / this.fireRate
    ) {
      if (this.currentAmmo <= 0) {
        // Play empty sound
        // this.emptySound.play();
        this.reload();
      }
      return false;
    }
    
    // Update last fire time
    this.lastFireTime = now;
    
    // Decrease ammo
    this.currentAmmo--;
    this.updateAmmoCounter();
    
    // Play shoot sound
    // this.shootSound.currentTime = 0;
    // this.shootSound.play();
    
    // Show muzzle flash
    this.muzzleFlash.visible = true;
    this.muzzleFlash.rotation.z = Math.random() * Math.PI;
    setTimeout(() => {
      this.muzzleFlash.visible = false;
    }, 50);
    
    // Show bullet trail
    this.bulletTrail.visible = true;
    setTimeout(() => {
      this.bulletTrail.visible = false;
    }, 50);
    
    // Calculate shoot direction
    this.camera.getWorldDirection(this.shootDirection);
    
    // Set raycaster
    this.raycaster.set(this.camera.position, this.shootDirection);
    
    // Check for hits
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    
    if (hits.length > 0) {
      const hit = hits[0];
      
      // Update bullet trail to hit point
      const points = [
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3().copy(hit.point)
      ];
      
      // Convert hit point from world space to camera local space
      const cameraWorldMatrix = this.camera.matrixWorld.clone();
      const cameraMatrixInverse = new THREE.Matrix4().copy(cameraWorldMatrix).invert();
      points[1].applyMatrix4(cameraMatrixInverse);
      
      this.bulletTrail.geometry.setFromPoints(points);
      
      // Check if hit an enemy or target
      if (hit.object.userData.isEnemy || hit.object.userData.isTarget) {
        // Apply damage
        if (typeof hit.object.userData.takeDamage === 'function') {
          hit.object.userData.takeDamage(this.damage);
        }
      }
      
      // Create impact effect
      this.createImpactEffect(hit);
      
      return hit;
    }
    
    return false;
  }
  
  createImpactEffect(hit) {
    // Create a simple impact sprite
    const geometry = new THREE.PlaneGeometry(0.2, 0.2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    
    const impact = new THREE.Mesh(geometry, material);
    impact.position.copy(hit.point);
    impact.position.add(hit.face.normal.multiplyScalar(0.01)); // Offset slightly to avoid z-fighting
    
    // Orient to face normal
    impact.lookAt(
      hit.point.x + hit.face.normal.x,
      hit.point.y + hit.face.normal.y,
      hit.point.z + hit.face.normal.z
    );
    
    // Add to scene
    this.scene.add(impact);
    
    // Remove after a short time
    setTimeout(() => {
      this.scene.remove(impact);
      impact.geometry.dispose();
      impact.material.dispose();
    }, 1000);
  }
  
  reload() {
    if (this.isReloading || this.currentAmmo === this.ammoCapacity) {
      return;
    }
    
    this.isReloading = true;
    
    // Play reload sound
    // this.reloadSound.play();
    
    // Update UI
    this.ammoCounter.textContent = 'Reloading...';
    
    // Wait for reload time
    setTimeout(() => {
      this.currentAmmo = this.ammoCapacity;
      this.isReloading = false;
      this.updateAmmoCounter();
    }, this.reloadTime * 1000);
  }
  
  updateAmmoCounter() {
    if (this.ammoCounter) {
      this.ammoCounter.textContent = `${this.currentAmmo}/${this.ammoCapacity}`;
    }
  }
} 
