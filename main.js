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

canvas.width = 800;
canvas.height = 800;
gl.viewport(0, 0, canvas.width, canvas.height);

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

const positionBuffer = gl.createBuffer();
const positionLocation = gl.getAttribLocation(program, "position");
const colorLocation = gl.getUniformLocation(program, "uColor");

let currentVertices = [];
let shapes = [];
let transforms = []; 
let selectedIndex = -1; 

let starShape = [
    0, 0.001, 
    0.05, -0.05, 
    -0.05, -0.05,  
];
let starPos = [0, 0]; 

function calculateCentroid(shape) {
    let sumX = 0, sumY = 0;
    for (let i = 0; i < shape.length; i += 2) {
        sumX += shape[i];
        sumY += shape[i + 1];
    }
    const count = shape.length / 2;
    return [sumX / count, sumY / count, 0];
}

function getMousePos(event) {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) / canvas.width * 2 - 1, (rect.bottom - event.clientY) / canvas.height * 2 - 1];
}

// **Ray-Casting Algorithm for Point-in-Polygon Selection**
function isPointInPolygon(px, py, shape) {
    let inside = false;
    for (let i = 0, j = shape.length - 2; i < shape.length; j = i, i += 2) {
        let xi = shape[i], yi = shape[i + 1];
        let xj = shape[j], yj = shape[j + 1];
        let intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

canvas.addEventListener("mousedown", (event) => {
    const pos = getMousePos(event);
    const clickPosition = vec3.fromValues(pos[0], pos[1], 0);

    selectedIndex = -1;
    for (let i = 0; i < shapes.length; i++) {
        const transform = transforms[i];
        let inverseMatrix = mat4.create();
        mat4.invert(inverseMatrix, transform.getModelTransformMatrix());
        let localClickPos = vec3.create();
        vec3.transformMat4(localClickPos, clickPosition, inverseMatrix);
        if (isPointInPolygon(localClickPos[0], localClickPos[1], shapes[i])) {
            selectedIndex = i;
            transform.setCentroid(calculateCentroid(shapes[i]));
            // console.log(`Shape ${i} selected at centroid:`, transform.centroid);
            return;
        }
    }
    currentVertices.push(pos[0], pos[1]);
    starPos = [pos[0], pos[1]];
});

document.addEventListener("keydown", (event) => {
    if (event.key === "s" && currentVertices.length >= 6) {  
        const triangulatedShape = earClippingTriangulation(currentVertices);
        shapes.push(triangulatedShape);
        transforms.push(new Transform()); 
        currentVertices = [];
        console.log("New shape created:", triangulatedShape);
    }
});

let applyToAll = false;

document.addEventListener("keydown", (event) => {
    if (event.key === "a") {
        applyToAll = !applyToAll;
        // console.log(applyToAll ? "All shapes will be transformed" : "Transformations applied to selected shape only");
    }
    if (selectedIndex !== -1 || applyToAll) {
        const targets = applyToAll ? transforms : [transforms[selectedIndex]];
        targets.forEach(transform => {
            switch (event.key) {
                case "ArrowUp": transform.translateShape(0, 0.1, 0); break;
                case "ArrowDown": transform.translateShape(0, -0.1, 0); break;
                case "ArrowLeft": transform.translateShape(-0.1, 0, 0); break;
                case "ArrowRight": transform.translateShape(0.1, 0, 0); break;
                case "r": transform.rotateShape(Math.PI / 12, [0, 0, 1]); break;
                case "+": transform.scaleShape(1.1, 1.1, 1); break;
                case "-": transform.scaleShape(0.9, 0.9, 1); break;
                case "1": 
                    if (applyToAll) { shapes.forEach(shape => shape.color = [1.0, 0.0, 0.0, 1.0]); } 
                    else { shapes[selectedIndex].color = [1.0, 0.0, 0.0, 1.0]; }
                    break;
                case "2": 
                    if (applyToAll) { shapes.forEach(shape => shape.color = [0.0, 1.0, 0.0, 1.0]); } 
                    else { shapes[selectedIndex].color = [0.0, 1.0, 0.0, 1.0]; }
                    break;
                case "3": 
                    if (applyToAll) { shapes.forEach(shape => shape.color = [0.0, 0.0, 1.0, 1.0]); } 
                    else { shapes[selectedIndex].color = [0.0, 0.0, 1.0, 1.0]; }
                    break;
                case "t": 
                    if (shapes.length > 1) {
                        shapes.push(shapes.shift());
                        transforms.push(transforms.shift());
                    }
                    break;
                case "b": 
                    if (shapes.length > 1) {
                        shapes.unshift(shapes.pop());
                        transforms.unshift(transforms.pop());
                    }
                    break;
            }
        });

        // console.log(applyToAll ? "Transformation applied to all shapes" : `Transform applied to shape ${selectedIndex}`);
    }
});

function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawShapes(gl, shapes, currentVertices, positionBuffer, positionLocation, colorLocation, transforms, program, starShape, starPos); 
    requestAnimationFrame(draw);
}

gl.clearColor(0.9, 0.9, 0.9, 1.0);
draw();
