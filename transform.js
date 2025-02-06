
import { vec3, mat4 } from 'https://cdn.skypack.dev/gl-matrix';

export class Transform {
    constructor() {
        this.translate = vec3.create();
        vec3.set(this.translate, 0, 0, 0);

        this.scale = vec3.create();
        vec3.set(this.scale, 1, 1, 1);

        this.rotationAngle = 0;
        this.rotationAxis = vec3.create();
        vec3.set(this.rotationAxis, 0, 0, 1);

        this.modelTransformMatrix = mat4.create();
        mat4.identity(this.modelTransformMatrix);

        this.centroid = vec3.create();
    }

    setCentroid(centroid) {
        vec3.copy(this.centroid, centroid);
    }

    translateShape(tx, ty, tz) {
        vec3.add(this.translate, this.translate, [tx, ty, tz]);
        this.updateModelTransformMatrix();
    }

    scaleShape(sx, sy, sz) {
        vec3.multiply(this.scale, this.scale, [sx, sy, sz]);
        this.updateModelTransformMatrix();
    }

    rotateShape(angle, axis) {
        this.rotationAngle += angle;
        vec3.copy(this.rotationAxis, axis);
        this.updateModelTransformMatrix();
    }

    updateModelTransformMatrix() {
        mat4.identity(this.modelTransformMatrix);
    
        // Step 1: Apply Final Translation (Move Shape to its position)
        mat4.translate(this.modelTransformMatrix, this.modelTransformMatrix, this.translate);
    
        // Step 2: Move to Centroid (for local transformations)
        mat4.translate(this.modelTransformMatrix, this.modelTransformMatrix, this.centroid);
    
        // Step 3: Apply Rotation
        mat4.rotate(this.modelTransformMatrix, this.modelTransformMatrix, this.rotationAngle, this.rotationAxis);
    
        // Step 4: Apply Scaling
        mat4.scale(this.modelTransformMatrix, this.modelTransformMatrix, this.scale);
    
        // Step 5: Move Back from Centroid
        let negCentroid = vec3.create();
        vec3.negate(negCentroid, this.centroid);
        mat4.translate(this.modelTransformMatrix, this.modelTransformMatrix, negCentroid);
    }
    

    getModelTransformMatrix() {
        return this.modelTransformMatrix;
    }
}