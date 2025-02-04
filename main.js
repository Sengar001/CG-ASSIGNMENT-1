import { vertexShaderSource, fragmentShaderSource, createShader } from './shader.js';
import { earClippingTriangulation } from './clipper.js';
import { drawShapes } from './render.js';
import { Transform } from './transform.js';

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    console.error("WebGL not supported");
}

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
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

// Convert Mouse Coordinates to WebGL Space
function getMousePos(event) {
    const rect = canvas.getBoundingClientRect();
    return [
        (event.clientX - rect.left) / canvas.width * 2 - 1,
        (rect.bottom - event.clientY) / canvas.height * 2 - 1
    ];
}

// Function to check if a point is inside a shape (Bounding Box for now)
function isPointInShape(px, py, shape) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < shape.length; i += 2) {
        minX = Math.min(minX, shape[i]);
        maxX = Math.max(maxX, shape[i]);
        minY = Math.min(minY, shape[i + 1]);
        maxY = Math.max(maxY, shape[i + 1]);
    }

    return px >= minX && px <= maxX && py >= minY && py <= maxY;
}

// Calculate the centroid of a shape
function calculateCentroid(shape) {
    let sumX = 0, sumY = 0;
    for (let i = 0; i < shape.length; i += 2) {
        sumX += shape[i];
        sumY += shape[i + 1];
    }
    const count = shape.length / 2;
    return [sumX / count, sumY / count, 0];
}

// Mouse Event for Clicking on Shape
canvas.addEventListener("mousedown", (event) => {
    const pos = getMousePos(event);

    // Check if the click is inside an existing shape
    selectedIndex = -1;
    for (let i = 0; i < shapes.length; i++) {
        if (isPointInShape(pos[0], pos[1], shapes[i])) {
            selectedIndex = i;
            transforms[i].setCentroid(calculateCentroid(shapes[i]));
            console.log('Shape ${i} selected at centroid:', transforms[i].centroid);
            return;
        }
    }

    // If no shape selected, start a new shape
    currentVertices.push(pos[0], pos[1]);
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

        if (event.key === 'ArrowUp') {
            transform.translateShape(0, 0.1, 0); // Move up
        }
        if (event.key === 'ArrowDown') {
            transform.translateShape(0, -0.1, 0); // Move down
        }
        if (event.key === 'ArrowLeft') {
            transform.translateShape(-0.1, 0, 0); // Move left
        }
        if (event.key === 'ArrowRight') {
            transform.translateShape(0.1, 0, 0); // Move right
        }
        if (event.key === 'r') {
            transform.rotateShape(Math.PI / 180, [0, 0, 1]); // Rotate by 1 degree around Z-axis
        }
        if (event.key === '+') {
            transform.scaleShape(1.1, 1.1, 1); // Scale up
        }
        if (event.key === '-') {
            transform.scaleShape(0.9, 0.9, 1); // Scale down
        }
        console.log('Transform applied to shape ${selectedIndex}');
    }
});

// Rendering Loop
function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawShapes(gl, shapes, currentVertices, positionBuffer, positionLocation, colorLocation, transforms, program); 
    requestAnimationFrame(draw);
}

// Initialize WebGL
gl.clearColor(0.9, 0.9, 0.9, 1.0);
draw();