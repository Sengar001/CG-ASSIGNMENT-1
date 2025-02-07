import { vertexShaderSource, fragmentShaderSource, createShader } from "./shader.js";
import { earClippingTriangulation } from "./clipper.js";
import { drawShapes } from "./render.js";
import { Transform } from "./transform.js";
import { vec3, mat4 } from "https://cdn.skypack.dev/gl-matrix";
// import { starShape } from "./matix.js";

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
let starPos = [0, 0]; 
let cursorVisible = true;
let applyToAll = false;
let isDrawing = true;

function centroid(shape) {
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

function clearCanvas() {
    shapes.length = 0;
    transforms.length = 0;
    currentVertices.length = 0;
}

function cursorVisibility() {
    cursorVisible = !cursorVisible;
}

function toggleDrawing() {
    isDrawing = !isDrawing;
}

canvas.addEventListener("mousedown", (event) => {
    if(isDrawing) {
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
                transform.setCentroid(centroid(shapes[i]));
                return;
            }
        }
        currentVertices.push(pos[0], pos[1]);
        starPos = [pos[0], pos[1]];
    }
});


document.addEventListener("keydown", (event) => {
    if (isDrawing) { 
        let step = 0.1; 
        let newPoint = [...starPos]; 

        switch (event.key) {
            case "8": newPoint[1] += step;
                break;
            case "2": newPoint[1] -= step;
                break;
            case "4": newPoint[0] -= step;
                break;
            case "6": newPoint[0] += step;
                break;
            case "Enter": currentVertices.push(newPoint[0], newPoint[1]);
                break;
            case "s": 
                if (currentVertices.length >= 6) { 
                    const triangulatedShape = earClippingTriangulation(currentVertices);
                    shapes.push(triangulatedShape);
                    transforms.push(new Transform());
                    currentVertices = [];
                }
                break;
        }

        starPos = newPoint;
    }
});


document.addEventListener("keydown", (event) => {
    if (event.key === "s" && currentVertices.length >= 6) {  
        const triangulatedShape = earClippingTriangulation(currentVertices);
        shapes.push(triangulatedShape);
        transforms.push(new Transform()); 
        currentVertices = [];
    }
});

document.getElementById("clearCanvas").addEventListener("click", clearCanvas);

document.getElementById("toggleCursor").addEventListener("click", cursorVisibility);

document.getElementById("toggleMovement").addEventListener("click", toggleDrawing);

document.addEventListener("keydown", (event) => {
    if (event.key === "a") {
        applyToAll = !applyToAll;
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
                case "c": 
                    if (applyToAll) { shapes.forEach(shape => shape.color = [1.0, 0.0, Math.random(), 1.0]); } 
                    else { shapes[selectedIndex].color = [Math.random(), Math.random(), Math.random(), 1.0]; }
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
    }
});

function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawShapes(gl, shapes, currentVertices, positionBuffer, positionLocation, colorLocation, transforms, program, starPos, cursorVisible); 
    requestAnimationFrame(draw);
}

gl.clearColor(0.9, 0.9, 0.9, 1.0);
draw();
