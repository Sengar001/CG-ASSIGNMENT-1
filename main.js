import { vertexShaderSource, fragmentShaderSource, createShader } from './shader.js';
import { earClippingTriangulation } from './clipper.js';
import { drawShapes } from './render.js';
import { Transform } from './transform.js';
import { vec3, mat4 } from 'https://cdn.skypack.dev/gl-matrix';

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    console.error("WebGL not supported");
}

// Set canvas size
canvas.width = 800;
canvas.height = 800;
gl.viewport(0, 0, canvas.width, canvas.height);

// Create and Link Shader Program
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
}

gl.useProgram(program);

// Buffer Setup
const positionBuffer = gl.createBuffer();
const positionLocation = gl.getAttribLocation(program, "position");
const colorLocation = gl.getUniformLocation(program, "uColor");

// Shape Storage
let currentVertices = [];
let shapes = [];
let transforms = []; // Store transformations per shape
let selectedIndex = -1; // Index of selected shape

// Star shape to move
let starShape = [
    0, 0.001, // Top point
    0.05, -0.05, // Bottom right point
    -0.05, -0.05,  // Right point
];
let starPos = [0, 0]; // Initial star position

// **Calculate the centroid of a shape**
function calculateCentroid(shape) {
    let sumX = 0, sumY = 0;
    for (let i = 0; i < shape.length; i += 2) {
        sumX += shape[i];
        sumY += shape[i + 1];
    }
    const count = shape.length / 2;
    return [sumX / count, sumY / count, 0];
}

// Convert Mouse Coordinates to WebGL Space
function getMousePos(event) {
    const rect = canvas.getBoundingClientRect();
    return [
        (event.clientX - rect.left) / canvas.width * 2 - 1,
        (rect.bottom - event.clientY) / canvas.height * 2 - 1
    ];
}

// **Ray-Casting Algorithm for Point-in-Polygon Selection**
function isPointInPolygon(px, py, shape) {
    let inside = false;
    for (let i = 0, j = shape.length - 2; i < shape.length; j = i, i += 2) {
        let xi = shape[i], yi = shape[i + 1];
        let xj = shape[j], yj = shape[j + 1];

        let intersect = ((yi > py) !== (yj > py)) &&
                        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Mouse Event for Clicking on Shape
canvas.addEventListener("mousedown", (event) => {
    const pos = getMousePos(event);
    const clickPosition = vec3.fromValues(pos[0], pos[1], 0);

    selectedIndex = -1;
    for (let i = 0; i < shapes.length; i++) {
        const transform = transforms[i];

        // Get the inverse transformation matrix
        let inverseMatrix = mat4.create();
        mat4.invert(inverseMatrix, transform.getModelTransformMatrix());

        // Transform the click position back to the shape's local space
        let localClickPos = vec3.create();
        vec3.transformMat4(localClickPos, clickPosition, inverseMatrix);

        // Check if transformed point is inside the shape
        if (isPointInPolygon(localClickPos[0], localClickPos[1], shapes[i])) {
            selectedIndex = i;
            transform.setCentroid(calculateCentroid(shapes[i]));
            console.log(`Shape ${i} selected at centroid:`, transform.centroid);
            return;
        }
    }

    // If no shape selected, start a new shape
    currentVertices.push(pos[0], pos[1]);

    // Update star position on mouse click
    starPos = [pos[0], pos[1]];
});

// Keyboard Event to Finalize Shape ('s' Key)
document.addEventListener("keydown", (event) => {
    if (event.key === "s" && currentVertices.length >= 6) {  
        const triangulatedShape = earClippingTriangulation(currentVertices);
        shapes.push(triangulatedShape);
        transforms.push(new Transform()); // Create a new transform instance for this shape
        currentVertices = [];
        console.log("New shape created:", triangulatedShape);
    }
});

// Apply transformations based on keyboard events
document.addEventListener("keydown", (event) => {
    if (selectedIndex !== -1) { // Only apply transformations if a shape is selected
        const transform = transforms[selectedIndex];

        switch (event.key) {
            case "ArrowUp": transform.translateShape(0, 0.1, 0); break;
            case "ArrowDown": transform.translateShape(0, -0.1, 0); break;
            case "ArrowLeft": transform.translateShape(-0.1, 0, 0); break;
            case "ArrowRight": transform.translateShape(0.1, 0, 0); break;
            case "r": transform.rotateShape(Math.PI / 12, [0, 0, 1]); break;
            case "+": transform.scaleShape(1.1, 1.1, 1); break;
            case "-": transform.scaleShape(0.9, 0.9, 1); break;
            case "1": shapes[selectedIndex].color = [1.0, 0.0, 0.0, 1.0]; break;
            case "2": shapes[selectedIndex].color = [0.0, 1.0, 0.0, 1.0]; break;
            case "3": shapes[selectedIndex].color = [0.0, 0.0, 1.0, 1.0]; break;
            case "t": // Rotate array forward (bring first element to the end)
            if (shapes.length > 1) {
                shapes.push(shapes.shift());
                transforms.push(transforms.shift());
            }
            break;

            case "b": // Rotate array backward (bring last element to the front)
            if (shapes.length > 1) {
                shapes.unshift(shapes.pop());
                transforms.unshift(transforms.pop());
            }
            break;
        }
        console.log(`Transform applied to shape ${selectedIndex}`);
    }
});

// Rendering Loop
function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawShapes(gl, shapes, currentVertices, positionBuffer, positionLocation, colorLocation, transforms, program, starShape, starPos); 
    requestAnimationFrame(draw);
}

// Initialize WebGL
gl.clearColor(0.9, 0.9, 0.9, 1.0);
draw();
