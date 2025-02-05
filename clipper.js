export function isConvex(a, b, c) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) >= 0;
}

export function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
    const area = 0.5 * (-by * cx + ay * (-bx + cx) + ax * (by - cy) + bx * cy);
    const s = (ay * cx - ax * cy + (cy - ay) * px + (ax - cx) * py) / (2 * area);
    const t = (ax * by - ay * bx + (ay - by) * px + (bx - ax) * py) / (2 * area);
    const u = 1 - s - t;
    return s >= 0 && t >= 0 && u >= 0;
}

export function computeSignedArea(vertices) {
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
        let [x1, y1] = vertices[i];
        let [x2, y2] = vertices[(i + 1) % vertices.length];
        area += (x2 - x1) * (y2 + y1);
    }
    return area * 0.5;
}


export function earClippingTriangulation(vertices) {
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
