import * as THREE from 'three';

export class MathUtils {
  /**
   * Clamp a value between min and max
   * @param {number} value - The value to clamp
   * @param {number} min - The minimum value
   * @param {number} max - The maximum value
   * @returns {number} The clamped value
   */
  static clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  
  /**
   * Linear interpolation between two values
   * @param {number} a - Start value
   * @param {number} b - End value
   * @param {number} t - Interpolation factor (0-1)
   * @returns {number} The interpolated value
   */
  static lerp(a, b, t) {
    return a + (b - a) * t;
  }
  
  /**
   * Linear interpolation between two vectors
   * @param {THREE.Vector3} a - Start vector
   * @param {THREE.Vector3} b - End vector
   * @param {number} t - Interpolation factor (0-1)
   * @returns {THREE.Vector3} The interpolated vector
   */
  static lerpVectors(a, b, t) {
    return new THREE.Vector3(
      this.lerp(a.x, b.x, t),
      this.lerp(a.y, b.y, t),
      this.lerp(a.z, b.z, t)
    );
  }
  
  /**
   * Convert degrees to radians
   * @param {number} degrees - Angle in degrees
   * @returns {number} Angle in radians
   */
  static degToRad(degrees) {
    return degrees * (Math.PI / 180);
  }
  
  /**
   * Convert radians to degrees
   * @param {number} radians - Angle in radians
   * @returns {number} Angle in degrees
   */
  static radToDeg(radians) {
    return radians * (180 / Math.PI);
  }
  
  /**
   * Get a random float between min and max
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random float between min and max
   */
  static randomFloat(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  /**
   * Get a random integer between min and max (inclusive)
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random integer between min and max
   */
  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * Get a random point on a sphere
   * @param {number} radius - Sphere radius
   * @returns {THREE.Vector3} Random point on sphere
   */
  static randomPointOnSphere(radius) {
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    return new THREE.Vector3(x, y, z);
  }
  
  /**
   * Get a random point in a circle
   * @param {number} radius - Circle radius
   * @returns {THREE.Vector2} Random point in circle
   */
  static randomPointInCircle(radius) {
    const r = radius * Math.sqrt(Math.random());
    const theta = 2 * Math.PI * Math.random();
    
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    
    return new THREE.Vector2(x, y);
  }
  
  /**
   * Calculate the distance between two points
   * @param {THREE.Vector3} a - First point
   * @param {THREE.Vector3} b - Second point
   * @returns {number} Distance between points
   */
  static distance(a, b) {
    return a.distanceTo(b);
  }
  
  /**
   * Calculate the squared distance between two points (faster than distance)
   * @param {THREE.Vector3} a - First point
   * @param {THREE.Vector3} b - Second point
   * @returns {number} Squared distance between points
   */
  static distanceSquared(a, b) {
    return a.distanceToSquared(b);
  }
  
  /**
   * Smoothly interpolate between two values using a damping factor
   * @param {number} current - Current value
   * @param {number} target - Target value
   * @param {number} smoothing - Smoothing factor (0-1)
   * @param {number} deltaTime - Time since last frame
   * @returns {number} Smoothed value
   */
  static damp(current, target, smoothing, deltaTime) {
    return this.lerp(current, target, 1 - Math.pow(smoothing, deltaTime));
  }
  
  /**
   * Smoothly interpolate between two vectors using a damping factor
   * @param {THREE.Vector3} current - Current vector
   * @param {THREE.Vector3} target - Target vector
   * @param {number} smoothing - Smoothing factor (0-1)
   * @param {number} deltaTime - Time since last frame
   * @returns {THREE.Vector3} Smoothed vector
   */
  static dampVector(current, target, smoothing, deltaTime) {
    const factor = 1 - Math.pow(smoothing, deltaTime);
    return new THREE.Vector3(
      this.lerp(current.x, target.x, factor),
      this.lerp(current.y, target.y, factor),
      this.lerp(current.z, target.z, factor)
    );
  }
  
  /**
   * Check if a point is inside a sphere
   * @param {THREE.Vector3} point - The point to check
   * @param {THREE.Vector3} sphereCenter - The center of the sphere
   * @param {number} sphereRadius - The radius of the sphere
   * @returns {boolean} True if the point is inside the sphere
   */
  static isPointInSphere(point, sphereCenter, sphereRadius) {
    return this.distanceSquared(point, sphereCenter) <= (sphereRadius * sphereRadius);
  }
  
  /**
   * Check if a point is inside a cylinder
   * @param {THREE.Vector3} point - The point to check
   * @param {THREE.Vector3} cylinderStart - The start point of the cylinder axis
   * @param {THREE.Vector3} cylinderEnd - The end point of the cylinder axis
   * @param {number} cylinderRadius - The radius of the cylinder
   * @returns {boolean} True if the point is inside the cylinder
   */
  static isPointInCylinder(point, cylinderStart, cylinderEnd, cylinderRadius) {
    // Calculate cylinder axis
    const axis = new THREE.Vector3().subVectors(cylinderEnd, cylinderStart);
    const length = axis.length();
    axis.normalize();
    
    // Calculate vector from start to point
    const toPoint = new THREE.Vector3().subVectors(point, cylinderStart);
    
    // Project point onto axis
    const projection = toPoint.dot(axis);
    
    // Check if projection is within cylinder length
    if (projection < 0 || projection > length) {
      return false;
    }
    
    // Calculate distance from point to axis
    const distance = new THREE.Vector3()
      .crossVectors(toPoint, axis)
      .length();
    
    // Check if distance is within cylinder radius
    return distance <= cylinderRadius;
  }
}
