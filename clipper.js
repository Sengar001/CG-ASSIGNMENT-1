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

export function earClippingTriangulation(vertices) {
    let polygon = [];
    for (let i = 0; i < vertices.length; i += 2) {
        polygon.push([vertices[i], vertices[i + 1]]);
    }
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
    triangles.push(...remaining.flat());
    return triangles;
}
