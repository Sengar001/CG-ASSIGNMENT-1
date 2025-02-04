
export function drawShapes(gl, shapes, currentVertices, positionBuffer, positionLocation, colorLocation, transforms, program) {
    const modelMatrixLocation = gl.getUniformLocation(program, "uModelMatrix");

    shapes.forEach((shape, index) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shape), gl.STATIC_DRAW);

        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform4fv(colorLocation, [0.7, 0.7, 0.7, 1.0]);

        // Send the transformation matrix to WebGL
        const modelMatrix = transforms[index].getModelTransformMatrix();
        gl.uniformMatrix4fv(modelMatrixLocation, false, modelMatrix);

        console.log('Drawing shape ${index} with transform matrix:', modelMatrix);

        gl.drawArrays(gl.TRIANGLES, 0, shape.length / 2);
    });

    if (currentVertices.length > 2) {
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(currentVertices), gl.STATIC_DRAW);

        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform4fv(colorLocation, [0, 0, 1, 1]); 
        gl.drawArrays(gl.LINE_STRIP, 0, currentVertices.length / 2);
    }
}