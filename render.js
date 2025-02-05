export function drawShapes(gl, shapes, currentVertices, positionBuffer, positionLocation, colorLocation, transforms, program, starShape, starPos) {
    const modelMatrixLocation = gl.getUniformLocation(program, "uModelMatrix");

    // Draw existing shapes
    shapes.forEach((shape, index) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shape), gl.STATIC_DRAW);

        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform4fv(colorLocation, shape.color || [0.7, 0.7, 0.7, 1.0]);

        // Send the transformation matrix to WebGL
        const modelMatrix = transforms[index].getModelTransformMatrix();
        gl.uniformMatrix4fv(modelMatrixLocation, false, modelMatrix);

        console.log(`Drawing shape ${index} with transform matrix:`, modelMatrix);

        gl.drawArrays(gl.TRIANGLES, 0, shape.length / 2);
    });

    // Draw current shape if exists
    if (currentVertices.length > 2) {
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(currentVertices), gl.STATIC_DRAW);

        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Use identity matrix when drawing the current shape
        const identityMatrix = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
        gl.uniformMatrix4fv(modelMatrixLocation, false, identityMatrix);

        gl.uniform4fv(colorLocation, [0, 0, 1, 1]); 
        gl.drawArrays(gl.LINE_STRIP, 0, currentVertices.length / 2);
    }

    // Draw the star at the current position
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starShape), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Use identity matrix when drawing the star
    const identityMatrixStar = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        starPos[0], starPos[1], 0, 1 // Move the star to the clicked position
    ]);
    gl.uniformMatrix4fv(modelMatrixLocation, false, identityMatrixStar);

    gl.uniform4fv(colorLocation, [1.0, 1.0, 0.0, 1.0]); // Star color
    gl.drawArrays(gl.TRIANGLES, 0, starShape.length / 2);
}
