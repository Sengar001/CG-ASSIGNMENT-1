// <!DOCTYPE html>

// <html lang="en">
//   <head>
//     <meta charset="UTF-8" />
//     <title>WebGL Shape Transformations</title>
//     <style>
//       body { margin: 0; overflow: hidden; }
//     </style>
//   </head>
//   <body>
//     <script>
      // ------------------------------------------------------------------
      // 1. Setup Canvas and WebGL Context
      // ------------------------------------------------------------------
      const canvas = document.createElement("canvas");
      document.body.appendChild(canvas);
      canvas.width = window.innerWidth * 0.4;
      canvas.height = window.innerHeight * 0.6;
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";

      const gl = canvas.getContext("webgl");
      if (!gl) {
          console.error("WebGL not supported");
      }

      // ------------------------------------------------------------------
      // 2. Shaders
      // ------------------------------------------------------------------
      // Vertex Shader (with transformation matrix)
      const vertexShaderSource = `
          attribute vec4 a_position;
          uniform mat4 u_matrix;
          void main() {
              gl_Position = u_matrix * a_position;
          }
      `;

      // Fragment Shader
      const fragmentShaderSource = `
          precision mediump float;
          uniform vec4 u_color;
          void main() {
              gl_FragColor = u_color;
          }
      `;

      // Compile Shader Function
      function createShader(gl, type, source) {
          const shader = gl.createShader(type);
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
              console.error("Shader compile failed:", gl.getShaderInfoLog(shader));
              gl.deleteShader(shader);
              return null;
          }
          return shader;
      }

      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

      // Create Shader Program
      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          console.error("Program link failed:", gl.getProgramInfoLog(program));
      }
      gl.useProgram(program);

      // ------------------------------------------------------------------
      // 3. Get Attributes and Uniform Locations
      // ------------------------------------------------------------------
      const positionAttribute = gl.getAttribLocation(program, "a_position");
      const colorUniform = gl.getUniformLocation(program, "u_color");
      const matrixUniform = gl.getUniformLocation(program, "u_matrix");

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionAttribute);
      gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

      gl.clearColor(0.8, 0.8, 0.8, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // ------------------------------------------------------------------
      // 4. Matrix Utility Functions (4x4 matrices)
      // ------------------------------------------------------------------
      function identityMatrix() {
          let identity =  [
              1, 0, 0, 0,
              0, 1, 0, 0,
              0, 0, 1, 0,
              0, 0, 0, 1,
          ];
          return identity;
      }

      // Multiply two 4x4 matrices (a * b)
      function multiplyMatrices(a, b) {
          let result = new Array(16).fill(0);
          for (let row = 0; row < 4; ++row) {
              for (let col = 0; col < 4; ++col) {
                  for (let i = 0; i < 4; ++i) {
                      result[row * 4 + col] += a[row * 4 + i] * b[i * 4 + col];
                  }
              }
          }
          return result;
      }

      // Create a translation matrix
      function translationMatrix(tx, ty) {
          return [
              1, 0, 0, 0,
              0, 1, 0, 0,
              0, 0, 1, 0,
              tx, ty, 0, 1,
          ];
      }

      // Create a rotation matrix (angle in radians)
      function rotationMatrix(angle) {
          const c = Math.cos(angle);
          const s = Math.sin(angle);
          return [
              c,  s, 0, 0,
             -s,  c, 0, 0,
              0,  0, 1, 0,
              0,  0, 0, 1,
          ];
      }

      // Create a scaling matrix (uniform scale)
      function scalingMatrix(s) {
          return [
              s, 0, 0, 0,
              0, s, 0, 0,
              0, 0, 1, 0,
              0, 0, 0, 1,
          ];
      }

      // ------------------------------------------------------------------
      // 5. Shape Data and Utility Functions
      // ------------------------------------------------------------------
      let shapes = [];      // Finalized shapes, each object: { vertices, color, matrix }
      let currentShape = []; // Vertices for the shape being drawn
      let selectedShape = null;  // The currently selected shape (if any)
      let transformationMode = null; // "rotate", "translate", or "scale" (zoom)

      // Compute the centroid of a shape (from its original vertices)
      function computeCentroid(vertices) {
          let numPoints = vertices.length / 2;
          let sumX = 0, sumY = 0;
          for (let i = 0; i < vertices.length; i += 2) {
              sumX += vertices[i];
              sumY += vertices[i + 1];
          }
          return [sumX / numPoints, sumY / numPoints];
      }

      // Apply a 4x4 transformation matrix to a 2D point [x, y].
      // We assume z=0 and w=1.
      function transformPoint(matrix, point) {
          let x = point[0], y = point[1];
          // Column-major order:
          let xPrime = matrix[0] * x + matrix[4] * y + matrix[12];
          let yPrime = matrix[1] * x + matrix[5] * y + matrix[13];
          return [xPrime, yPrime];
      }

      // Check if a point is inside a polygon using ray-casting.
      // 'point' is [x, y] and 'polygon' is an array of points [[x1,y1], [x2,y2], ...].
      function isPointInPolygon(point, polygon) {
          let x = point[0], y = point[1];
          let inside = false;
          for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
              let xi = polygon[i][0], yi = polygon[i][1];
              let xj = polygon[j][0], yj = polygon[j][1];

              let intersect = ((yi > y) !== (yj > y)) &&
                              (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
              if (intersect) inside = !inside;
          }
          return inside;
      }

      // Ear clipping triangulation (unchanged)
    function isConvex(a, b, c) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) >= 0;
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
    const area = 0.5 * (-by * cx + ay * (-bx + cx) + ax * (by - cy) + bx * cy);
    const s = (ay * cx - ax * cy + (cy - ay) * px + (ax - cx) * py) / (2 * area);
    const t = (ax * by - ay * bx + (ay - by) * px + (bx - ax) * py) / (2 * area);
    const u = 1 - s - t;
    return s >= 0 && t >= 0 && u >= 0;
}

// Compute the signed area of the polygon
function computeSignedArea(vertices) {
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
        let [x1, y1] = vertices[i];
        let [x2, y2] = vertices[(i + 1) % vertices.length];
        area += (x2 - x1) * (y2 + y1);
    }
    return area * 0.5;
}

// Ear Clipping Algorithm
function earClippingTriangulation(vertices) {
    let polygon = [];
    for (let i = 0; i < vertices.length; i += 2) {
        polygon.push([vertices[i], vertices[i + 1]]);
    }

    function triangulate(polygon) {
        let triangles = [];
        let remaining = [...polygon];

        while (remaining.length > 3) {
            let earFound = false;
            for (let i = 0; i < remaining.length; i++) {
                let prev = remaining[(i - 1 + remaining.length) % remaining.length];
                let curr = remaining[i];
                let next = remaining[(i + 1) % remaining.length];

                if (isConvex(prev, curr, next)) {
                    let valid = true;
                    for (let p of remaining) {
                        if (p !== prev && p !== curr && p !== next &&
                            pointInTriangle(p[0], p[1], prev[0], prev[1], curr[0], curr[1], next[0], next[1])) {
                            valid = false;
                            break;
                        }
                    }
                    if (valid) {
                        triangles.push(...prev, ...curr, ...next);
                        remaining.splice(i, 1);
                        earFound = true;
                        break;
                    }
                }
            }
            if (!earFound) break;
        }

        if (remaining.length === 3) {
            triangles.push(...remaining[0], ...remaining[1], ...remaining[2]);
        }

        return triangles;
    }

    // Compute the signed area
    let area = computeSignedArea(polygon);

    // If the area is negative, the polygon is in clockwise order
    let originalTriangles = triangulate(polygon);
    let reversedTriangles = triangulate([...polygon].reverse());

    // Return the triangulation with more triangles
    return originalTriangles.length >= reversedTriangles.length ? originalTriangles : reversedTriangles;
}



      // ------------------------------------------------------------------
      // 6. Drawing Function
      // ------------------------------------------------------------------
      function drawShapes() {
          gl.clear(gl.COLOR_BUFFER_BIT);
          shapes.forEach((shape) => {
              let { vertices, color, matrix } = shape;
              // If this shape is selected, draw it with white.
              if (selectedShape === shape) {
                  gl.uniform4fv(colorUniform, [1, 1, 1, 1]);
              } else {
                  gl.uniform4fv(colorUniform, color);
              }
              gl.uniformMatrix4fv(matrixUniform, false, new Float32Array(matrix || identityMatrix()));
              const triangles = earClippingTriangulation(vertices);
              gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangles), gl.STATIC_DRAW);
              gl.drawArrays(gl.TRIANGLES, 0, triangles.length / 2);
          });
          // Draw the in-progress shape outline.
          if (currentShape.length >= 4) {
              gl.uniform4fv(colorUniform, [1, 1, 1, 1]);
              gl.uniformMatrix4fv(matrixUniform, false, new Float32Array(identityMatrix()));
              gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(currentShape), gl.STATIC_DRAW);
              gl.drawArrays(gl.LINE_STRIP, 0, currentShape.length / 2);
          }
      }

      // ------------------------------------------------------------------
      // 7. Mouse Event Listeners
      // ------------------------------------------------------------------
      // Left-click: add a vertex to the current shape.
      canvas.addEventListener("click", (event) => {
          if (event.button !== 0) return;
          const x = (event.clientX / canvas.width) * 2 - 1;
          const y = -(event.clientY / canvas.height) * 2 + 1;
          currentShape.push(x, y);
          drawShapes();
      });

      // Right-click: finalize the current shape and assign a random color.
      canvas.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          if (currentShape.length >= 6) {
              const randomColor = [Math.random(), Math.random(), Math.random(), 1];
              shapes.push({
                  vertices: [...currentShape],
                  color: randomColor,
                  matrix: identityMatrix()
              });
              currentShape = [];
              drawShapes();
          }
      });

      // Middle-click: select a shape if the clicked point lies within its effective polygon.
      // If the shape clicked is already selected, deselect it.
      canvas.addEventListener("mousedown", (event) => {
          if (event.button === 1) {
              event.preventDefault();
              const x = (event.clientX / canvas.width) * 2 - 1;
              const y = -(event.clientY / canvas.height) * 2 + 1;
              const clickPoint = [x, y];
              let foundShape = null;
              // Loop through each shape.
              for (let shape of shapes) {
                  // Transform the shape's vertices using its transformation matrix.
                  let effectivePolygon = [];
                  for (let i = 0; i < shape.vertices.length; i += 2) {
                      let pt = [shape.vertices[i], shape.vertices[i + 1]];
                      effectivePolygon.push(transformPoint(shape.matrix, pt));
                  }
                  // If the click point is inside the effective polygon, mark this shape.
                  if (isPointInPolygon(clickPoint, effectivePolygon)) {
                      foundShape = shape;
                      break;
                  }
              }
              // Toggle selection: if the found shape is already selected, deselect it.
              if (foundShape && selectedShape === foundShape) {
                  selectedShape = null;
                  console.log("Shape deselected.");
              } else {
                  selectedShape = foundShape;
                  if (selectedShape) {
                      console.log("Shape selected for transformation.");
                  }
              }
              drawShapes();
          }
      });

      // ------------------------------------------------------------------
      // 8. Keyboard Event Listener for Transformations
      // ------------------------------------------------------------------
      document.addEventListener("keydown", (event) => {
          if (!selectedShape) return;

          if (event.key.toLowerCase() === "r") {
              transformationMode = "rotate";
              console.log("Rotate mode");
              return;
          } else if (event.key.toLowerCase() === "t") {
              transformationMode = "translate";
              console.log("Translate mode");
              return;
          } else if (event.key.toLowerCase() === "s") {
              transformationMode = "scale";
              console.log("Scale (zoom) mode");
              return;
          } else if (event.key === "Escape") {
              transformationMode = null;
              console.log("Transformation mode canceled");
              return;
          }

          if (!transformationMode) return;

          // Compute the effective centroid from the transformed vertices.
          let transformedVertices = [];
          for (let i = 0; i < selectedShape.vertices.length; i += 2) {
              let pt = [selectedShape.vertices[i], selectedShape.vertices[i + 1]];
              transformedVertices.push(transformPoint(selectedShape.matrix, pt));
          }
          let sumX = 0, sumY = 0;
          for (let pt of transformedVertices) {
              sumX += pt[0];
              sumY += pt[1];
          }
          const effectiveCentroid = [sumX / transformedVertices.length, sumY / transformedVertices.length];
          let transform = identityMatrix();

          if (transformationMode === "rotate") {
              let angleIncrement = 0;
              if (event.key === "ArrowLeft") {
                  angleIncrement = 0.1;
              } else if (event.key === "ArrowRight") {
                  angleIncrement = -0.1;
              }
              if (angleIncrement !== 0) {
                  const toOrigin = translationMatrix(-effectiveCentroid[0], -effectiveCentroid[1]);
                  const rotation = rotationMatrix(angleIncrement);
                  const back = translationMatrix(effectiveCentroid[0], effectiveCentroid[1]);
                  transform = multiplyMatrices(toOrigin, rotation);
                  transform = multiplyMatrices(transform, back);
              }
          } else if (transformationMode === "translate") {
              let dx = 0, dy = 0;
              if (event.key === "ArrowLeft") dx = -0.05;
              if (event.key === "ArrowRight") dx = 0.05;
              if (event.key === "ArrowUp") dy = 0.05;
              if (event.key === "ArrowDown") dy = -0.05;
              transform = translationMatrix(dx, dy);
          } else if (transformationMode === "scale") {
              let scaleFactor = 1;
              if (event.key === "ArrowUp") {
                  scaleFactor = 1.05;
              } else if (event.key === "ArrowDown") {
                  scaleFactor = 0.95;
              }
              const toOrigin = translationMatrix(-effectiveCentroid[0], -effectiveCentroid[1]);
              const scaleMat = scalingMatrix(scaleFactor);
              const back = translationMatrix(effectiveCentroid[0], effectiveCentroid[1]);
              transform = multiplyMatrices(toOrigin, scaleMat);
              transform = multiplyMatrices(transform, back);
          }

          selectedShape.matrix = multiplyMatrices(selectedShape.matrix, transform);
          drawShapes();
      });

      // ------------------------------------------------------------------
      // 9. Initial Draw
      // ------------------------------------------------------------------
      drawShapes();
//     </script>
//   </body>
// </html>