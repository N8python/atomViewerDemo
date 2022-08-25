import * as THREE from 'https://cdn.skypack.dev/three@0.142.0';

class Trail extends THREE.Mesh {
    constructor(target, {
        length,
        size,
        update,
        count,
        color
    }) {
        super(new THREE.BufferGeometry(), new THREE.ShaderMaterial({
            uniforms: {
                time: { value: performance.now() / 1000 },
                trailLength: { value: length },
                color: { value: color }
            },
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false,
            vertexShader: /*glsl*/ `
            attribute vec3 center;
            attribute float birth;
            uniform float time;
            uniform float trailLength;
            varying float vBirth;
            void main() {
                vBirth = birth;
                gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(mix(position, center, clamp((1.0 / trailLength) * (time - birth), 0.0, 1.0)), 1.0);
            }
        `,
            fragmentShader: /*glsl*/ `
            varying float vBirth;
            uniform float time;
            uniform float trailLength;
            uniform vec3 color;
            void main() {
                gl_FragColor = vec4(color, 0.5 * (1.0 - clamp((1.0 / trailLength) * (time - vBirth), 0.0, 1.0)));
            }
    `
        }));
        this.length = length;
        this.color = color;
        this.size = size;
        this.target = target;
        this.lastPos = target.position;
        this.count = count;
        this.geometry.setIndex(new THREE.BufferAttribute(new Uint32Array((this.count - 1) * 24 + 6), 1));
        this.geometry.index.setUsage(THREE.DynamicDrawUsage);
        this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.count * 4 * 3), 3));
        this.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
        this.geometry.setAttribute('center', new THREE.BufferAttribute(new Float32Array(this.count * 4 * 3), 3));
        this.geometry.attributes.center.setUsage(THREE.DynamicDrawUsage);
        this.geometry.setAttribute('birth', new THREE.BufferAttribute(new Float32Array(this.count * 4), 1));
        this.geometry.attributes.birth.setUsage(THREE.DynamicDrawUsage);
        this.positions = [];
        this.tickSplit = update;
        this.fireOn = Math.floor(Math.random() * this.tickSplit);
        this.tick = 0;
        this.geometry.computeBoundingBox();
        this.castShadow = false;
        this.frustumCulled = false;
    }
    onAfterRender() {
        this.geometry.computeBoundingBox();
        this.tick++;
        const currentOrientation = this.target.quaternion.clone();
        const center = this.target.getWorldPosition(new THREE.Vector3());
        const away = center.clone().sub(this.lastPos);
        if (away.length() === 0) {
            this.lastPos = this.target.getWorldPosition(new THREE.Vector3());
            return;
        }
        this.target.up = new THREE.Vector3(0, 1, 0);
        if (away.clone().normalize().dot(this.target.up) > 0.75 || away.clone().normalize().dot(this.target.up) < 0.75) {
            this.target.up = new THREE.Vector3(0, 0, 1);
        }
        if (away.clone().normalize().dot(this.target.up) > 0.75 || away.clone().normalize().dot(this.target.up) < 0.75) {
            this.target.up = new THREE.Vector3(1, 0, 0);
        }
        this.target.lookAt(center.clone().add(away));
        this.target.updateMatrixWorld();
        const poses = [ /*sphere.getWorldPosition(new THREE.Vector3())*/
            new THREE.Vector3(-this.size, -this.size, 0).applyMatrix4(this.target.matrixWorld),
            new THREE.Vector3(-this.size, this.size, 0).applyMatrix4(this.target.matrixWorld),
            new THREE.Vector3(this.size, this.size, 0).applyMatrix4(this.target.matrixWorld),
            new THREE.Vector3(this.size, -this.size, 0).applyMatrix4(this.target.matrixWorld),
            center,
            performance.now() / 1000
        ];
        this.positions.push(poses);
        if ((1 / this.length) * ((performance.now() / 1000) - this.positions[0][5]) > 1.0) {
            this.positions.shift();
        }
        const positions = this.positions;
        const pos = this.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i++) {
            pos[i * 12] = positions[i][0].x;
            pos[i * 12 + 1] = positions[i][0].y;
            pos[i * 12 + 2] = positions[i][0].z;
            pos[i * 12 + 3] = positions[i][1].x;
            pos[i * 12 + 4] = positions[i][1].y;
            pos[i * 12 + 5] = positions[i][1].z;
            pos[i * 12 + 6] = positions[i][2].x;
            pos[i * 12 + 7] = positions[i][2].y;
            pos[i * 12 + 8] = positions[i][2].z;
            pos[i * 12 + 9] = positions[i][3].x;
            pos[i * 12 + 10] = positions[i][3].y;
            pos[i * 12 + 11] = positions[i][3].z;
        }
        const centers = this.geometry.attributes.center.array;
        for (let i = 0; i < positions.length; i++) {
            centers[i * 12] = positions[i][4].x;
            centers[i * 12 + 1] = positions[i][4].y;
            centers[i * 12 + 2] = positions[i][4].z;
            centers[i * 12 + 3] = positions[i][4].x;
            centers[i * 12 + 4] = positions[i][4].y;
            centers[i * 12 + 5] = positions[i][4].z;
            centers[i * 12 + 6] = positions[i][4].x;
            centers[i * 12 + 7] = positions[i][4].y;
            centers[i * 12 + 8] = positions[i][4].z;
            centers[i * 12 + 9] = positions[i][4].x;
            centers[i * 12 + 10] = positions[i][4].y;
            centers[i * 12 + 11] = positions[i][4].z;
        }
        const times = this.geometry.attributes.birth.array;
        for (let i = 0; i < positions.length; i++) {
            times[i * 4] = positions[i][5];
            times[i * 4 + 1] = positions[i][5];
            times[i * 4 + 2] = positions[i][5];
            times[i * 4 + 3] = positions[i][5];
        }
        const indices = this.geometry.index.array;
        let iIndx = 0;
        for (let i = 0; i < positions.length - 1; i++) {
            const start = i * 4;
            indices[iIndx++] = start;
            indices[iIndx++] = start + 4;
            indices[iIndx++] = start + 5;
            indices[iIndx++] = start + 5;
            indices[iIndx++] = start + 1;
            indices[iIndx++] = start;
            indices[iIndx++] = start + 1;
            indices[iIndx++] = start + 5;
            indices[iIndx++] = start + 6;
            indices[iIndx++] = start + 6;
            indices[iIndx++] = start + 2;
            indices[iIndx++] = start + 1;
            indices[iIndx++] = start + 2;
            indices[iIndx++] = start + 6;
            indices[iIndx++] = start + 7;
            indices[iIndx++] = start + 7;
            indices[iIndx++] = start + 3;
            indices[iIndx++] = start + 2;
            indices[iIndx++] = start + 3;
            indices[iIndx++] = start + 7;
            indices[iIndx++] = start + 4;
            indices[iIndx++] = start + 4;
            indices[iIndx++] = start;
            indices[iIndx++] = start + 3;
        }
        indices[iIndx++] = (positions.length - 1) * 4;
        indices[iIndx++] = (positions.length - 1) * 4 + 1;
        indices[iIndx++] = (positions.length - 1) * 4 + 2;
        indices[iIndx++] = (positions.length - 1) * 4 + 2;
        indices[iIndx++] = (positions.length - 1) * 4 + 3;
        indices[iIndx++] = (positions.length - 1) * 4;
        /* bufferGeo.setIndex(new THREE.BufferAttribute(indices, 1));
         bufferGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
         bufferGeo.setAttribute('center', new THREE.BufferAttribute(centers, 3));
         bufferGeo.setAttribute('birth', new THREE.BufferAttribute(times, 1));*/
        if (this.tick % this.tickSplit === this.fireOn) {
            this.geometry.attributes.position.needsUpdate = true;
            this.geometry.attributes.center.needsUpdate = true;
            this.geometry.attributes.birth.needsUpdate = true;
            this.geometry.index.needsUpdate = true;
        }
        this.target.quaternion.copy(currentOrientation);
        this.material.uniforms.time.value = performance.now() / 1000;
        this.lastPos = this.target.getWorldPosition(new THREE.Vector3());
    }
}
export { Trail };