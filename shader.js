export const vertexShaderSource = `
    attribute vec2 position;
    uniform mat4 uModelMatrix;
    void main() {
        gl_Position = uModelMatrix * vec4(position, 0.0, 1.0);
    }
`;

export const fragmentShaderSource =` 
    precision mediump float;
    uniform vec4 uColor;
    void main() {
        gl_FragColor = uColor;
    }
`;

export function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        // console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}