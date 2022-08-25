import * as THREE from 'https://cdn.skypack.dev/three@0.142.0';
import { EffectComposer } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/SMAAPass.js';
import { GammaCorrectionShader } from 'https://unpkg.com/three@0.142.0/examples/jsm/shaders/GammaCorrectionShader.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'https://unpkg.com/three@0.142.0/examples/jsm/postprocessing/OutlinePass.js';
import { EffectShader } from "./EffectShader.js";
import { EffectCompositer } from "./EffectCompositer.js";
import { OrbitControls } from 'https://unpkg.com/three@0.142.0/examples/jsm/controls/OrbitControls.js';
import { AssetManager } from './AssetManager.js';
import { Stats } from "./stats.js";
import { Trail } from "./Trail.js";
async function main() {
    // Setup basic renderer, controls, and profiler
    const elements = (await (await fetch("elements.json")).json()).elements;
    const elementNames = elements.map(e => e.name);
    document.getElementById("atomToView").innerHTML = elementNames.map(name => `<option>${name}</option>`).join("\n");
    const clientWidth = window.innerWidth;
    const clientHeight = window.innerHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, clientWidth / clientHeight, 0.1, 1000);
    camera.position.set(10, 15, 10);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(clientWidth, clientHeight);
    document.body.appendChild(renderer.domElement);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    const stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
    // Setup scene
    // Skybox
    const environment = new THREE.CubeTextureLoader().load([
        "skybox/Box_Right.bmp",
        "skybox/Box_Left.bmp",
        "skybox/Box_Top.bmp",
        "skybox/Box_Bottom.bmp",
        "skybox/Box_Front.bmp",
        "skybox/Box_Back.bmp"
    ]);
    environment.encoding = THREE.sRGBEncoding;
    //scene.background = environment;
    const stars = new THREE.CubeTextureLoader().load([
        "starSkybox/StarSkybox041.png",
        "starSkybox/StarSkybox042.png",
        "starSkybox/StarSkybox043.png",
        "starSkybox/StarSkybox044.png",
        "starSkybox/StarSkybox045.png",
        "starSkybox/StarSkybox046.png"
    ]);
    stars.encoding = THREE.sRGBEncoding;
    // scene.background = stars;
    // Lighting
    scene.background = new THREE.Color(75 / (255 * 2), 68 / (255 * 2), 68 / (255 * 2)).convertSRGBToLinear();
    const ambientLight = new THREE.AmbientLight(new THREE.Color(1.0, 1.0, 1.0), 0.25);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.35);
    directionalLight.position.set(15, 20, 5);
    // Shadows
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.bias = -0.0001;
    directionalLight.shadow.blurSamples = 8;
    directionalLight.shadow.radius = 4;
    const helper = new THREE.CameraHelper(directionalLight.shadow.camera);
    //scene.add(helper);
    scene.add(directionalLight);
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.15);
    directionalLight2.color.setRGB(1.0, 1.0, 1.0);
    directionalLight2.position.set(-50, -200, -150);
    scene.add(directionalLight2);
    // Objects
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100).applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2)), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }));
    ground.castShadow = true;
    ground.receiveShadow = true;
    // scene.add(ground);
    const box = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, color: new THREE.Color(1.0, 0.0, 0.0) }));
    box.castShadow = true;
    box.receiveShadow = true;
    box.position.y = 5.01;
    // scene.add(box);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(6.25, 32, 32), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, envMap: environment, metalness: 1.0, roughness: 0.25 }));
    sphere.position.y = 7.5;
    sphere.position.x = 25;
    sphere.position.z = 25;
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    // scene.add(sphere);
    const torusKnot = new THREE.Mesh(new THREE.TorusKnotGeometry(5, 1.5, 200, 32), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, envMap: environment, metalness: 0.5, roughness: 0.5, color: new THREE.Color(0.0, 1.0, 0.0) }));
    torusKnot.position.y = 10;
    torusKnot.position.x = -25;
    torusKnot.position.z = -25;
    torusKnot.castShadow = true;
    torusKnot.receiveShadow = true;
    //scene.add(torusKnot);
    // Build postprocessing stack
    // Render Targets
    const masterPositions = [];
    const maxSubatomics = Math.round(elements[elements.length - 1].atomic_mass);
    for (let i = 0; i < maxSubatomics; i++) {
        masterPositions.push(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(Math.random() * Math.sqrt(maxSubatomics) / Math.PI));
    }
    for (let i = 0; i < 2000; i++) {
        masterPositions.forEach(position => {
            position.multiplyScalar(0.99);
            position.add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(0.01));
            masterPositions.forEach(position2 => {
                if (position !== position2) {
                    const d = position.distanceTo(position2);
                    if (d < 1) {
                        position.add(position.clone().sub(position2).normalize().multiplyScalar(1 - d));
                    }
                }
            });
        })
    }
    masterPositions.sort((a, b) => a.length() - b.length());
    let initialPositions = [];
    let electrons = [];
    let nucleus;

    function loadAtom(name) {
        const elementToRender = name;
        const elementInfo = elements.find(e => e.name === elementToRender);
        const subamtoicsNucleus = Math.round(elementInfo.atomic_mass);
        initialPositions = masterPositions.slice(0, subamtoicsNucleus);
        nucleus = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshStandardMaterial({ dithering: true }), subamtoicsNucleus);
        const dummy = new THREE.Object3D();
        for (let i = 0; i < subamtoicsNucleus; i++) {
            dummy.position.copy(initialPositions[i]);
            dummy.updateMatrix();
            nucleus.setMatrixAt(i, dummy.matrix);
            nucleus.setColorAt(i, new THREE.Color(0.0, 1.0, 0.0));
        }
        for (let i = 0; i < elementInfo.number; i++) {
            const randomIdx = Math.floor(Math.random() * subamtoicsNucleus);
            initialPositions[randomIdx].proton = true;
            nucleus.setColorAt(randomIdx, new THREE.Color(1.0, 0.0, 0.0));
        }
        nucleus.castShadow = true;
        nucleus.receiveShadow = true;
        scene.add(nucleus);
        const nucleusSize = Math.max(...initialPositions.map(x => x.length()));
        electrons = [];
        const electronMat = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            dithering: true,
            transparent: true,
            depthWrite: false,
            vertexShader: /*glsl*/ `
    varying vec3 worldPos;
    varying vec4 sph;
    varying mat4 imat;
    void main() {
        vec3 center = (modelMatrix * vec4(0.0,0.0,0.0, 1.0)).xyz;
        vec3 up = vec3(0.0, 1.0, 0.0);
        vec3 forward = normalize(cameraPosition - center);
        vec3 right = normalize(cross(forward, up));
        up = cross(right, forward);
        mat3 rotMat = mat3(right, up, forward);
        vec3 scale = vec3(
            length(vec3(modelMatrix[0][0], modelMatrix[1][0], modelMatrix[2][0])),
            length(vec3(modelMatrix[0][1], modelMatrix[1][1], modelMatrix[2][1])),
            length(vec3(modelMatrix[0][2], modelMatrix[1][2], modelMatrix[2][2]))
          );
          float maxScale = max(abs(scale.x), max(abs(scale.y), abs(scale.z)));
          float maxRadius = maxScale * 0.5;          
        float sinAngle = maxRadius / length(cameraPosition - center);
        float cosAngle = sqrt(1.0 - sinAngle * sinAngle);
        float tanAngle = sinAngle / cosAngle;
        float quadScale = tanAngle * length(cameraPosition - center) * 2.0;
        vec3 wPos = (rotMat * (position * quadScale)) + center;
        worldPos = wPos;
        sph = vec4(center, maxRadius);
        imat = modelMatrix;
        gl_Position = projectionMatrix * viewMatrix * vec4(wPos, 1.0);
    }
    `,
            fragmentShader: /*glsl*/ `
        uniform mat4 projectionMatrix;
        varying vec3 worldPos;
        varying vec4 sph;
        varying mat4 imat;
        #include <common>
        #include <dithering_pars_fragment>
        float sphIntersect( vec3 ro, vec3 rd, vec4 sph )
{
    vec3 oc = ro - sph.xyz;
    float b = dot( oc, rd );
    float c = dot( oc, oc ) - sph.w*sph.w;
    float h = b*b - c;
    if( h<0.0 ) return -1.0;
    h = sqrt( h );
    return -b - h;
}
        void main() {
          vec3 origin = cameraPosition;
            vec3 rayDir =normalize(worldPos - origin);
            float intersection = sphIntersect(origin, rayDir, sph);
            if (intersection < 0.0) {
                discard;
            }
            intersection = intersection < 0.0 ? dot(rayDir, sph.xyz - origin) : intersection;
            vec3 intersectionPoint = origin + rayDir * intersection;
            vec3 backOrigin = cameraPosition + 2.0 * length(sph.xyz - cameraPosition) * rayDir;
            float backIntersection = sphIntersect(backOrigin, -rayDir, sph);
            float distThroughSphere = distance(backOrigin - rayDir * backIntersection, intersectionPoint);
            vec4 projectPoint = projectionMatrix * viewMatrix * vec4(intersectionPoint, 1.0);
            projectPoint.xyz /= projectPoint.w;
            gl_FragDepth = 0.5 + 0.5 * projectPoint.z;
            vec3 normal =  normalize((imat * vec4(normalize(intersectionPoint - sph.xyz), 0.0)).xyz);
            vec3 worldNormal = normalize(intersectionPoint - sph.xyz);
            float phi = atan(normal.x, normal.z) / (PI * 2.0);
            float phi_frac = fract(phi);
            float theta = acos(-normal.y) / PI;
            vec2 uv = vec2(
                phi + 0.5,
                theta
            );
            float phi_dx = dFdx(phi);
            float phi_dy = dFdy(phi);
            float phi_frac_dx = dFdx(phi_frac);
            float phi_frac_dy = dFdy(phi_frac);
            vec2 dx = vec2(
                abs(phi_dx) - 0.0001 < abs(phi_frac_dx) ? phi_dx : phi_frac_dx,
                dFdx(theta)
              );
              vec2 dy = vec2(
                abs(phi_dy) - 0.0001 < abs(phi_frac_dy) ? phi_dy : phi_frac_dy,
                dFdy(theta)
              );
              vec3 lightDir = normalize(vec3(150.0, 200.0, 50.0));
            float diffuse = 0.25 + 0.35 * max(dot(worldNormal, lightDir), 0.0);
            gl_FragColor = vec4(vec3(0.0, 1.0, 1.0)/**textureGrad(map, uv, dx, dy).rgb*/, pow(distThroughSphere, 3.0));
            #include <dithering_fragment>
        }
        `
        });
        const ups = [
            0,
            2,
            3,
            4,
            8,
            9,
            10,
            11,
            12,
            18,
            19,
            20,
            21,
            22,
            23,
            24
        ]
        elementInfo.shells.forEach((shell, j) => {
            for (let i = 0; i < shell; i++) {
                electrons.push({
                    mesh: new THREE.Mesh(new THREE.PlaneGeometry(1, 1), electronMat),
                    phi: Math.PI * 2 * Math.random(),
                    theta: Math.PI * 2 * Math.random(),
                    radius: nucleusSize + 2 + j * 2.5,
                    shell: j,
                    subshell: (i < 2 ? "s" : (i < 8 ? "p" : (i < 18 ? "d" : "f"))),
                    spin: ups.includes(i) ? "Up" : "Down"
                });
            }
        });
        const shellColors = [
            new THREE.Color(1.0, 0.0, 1.0),
            new THREE.Color(0.0, 1.0, 1.0),
            new THREE.Color(1.0, 1.0, 0.0),
            new THREE.Color(1.0, 0.5, 0.5),
            new THREE.Color(0.5, 1.0, 0.5),
            new THREE.Color(0.5, 0.5, 1.0),
            new THREE.Color(1.0, 0.5, 1.0),
            new THREE.Color(0.5, 1.0, 1.0),
            new THREE.Color(1.0, 1.0, 0.5)
        ]
        electrons.forEach(electron => {
            //electron.mesh.castShadow = true;
            //electron.mesh.receiveShadow = true;
            scene.add(electron.mesh);
            if (electron.shell < 10) {
                const t = new Trail(electron.mesh, {
                    length: 1.0,
                    size: 0.25,
                    update: 1 + Math.floor(electrons.length / 33),
                    count: 62,
                    color: shellColors[electron.shell]
                });
                electron.trail = t;
                scene.add(t);
            }
            electron.mesh.renderOrder = -10000;
        });
    }

    function clearAtom() {
        outlineMeshes = [];
        if (nucleus) {
            scene.remove(nucleus);
            nucleus.material.dispose();
            nucleus.geometry.dispose();
        }
        if (electrons && electrons.length > 0) {
            electrons.forEach(e => {
                scene.remove(e.mesh);
                scene.remove(e.trail);
                e.mesh.geometry.dispose();
                e.mesh.material.dispose();
                e.trail.geometry.dispose();
                e.trail.material.dispose();
            });
        }
        electrons = [];
        nucleus = null;
        initialPositions = [];
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function onPointerMove(event) {

        // calculate pointer position in normalized device coordinates
        // (-1 to +1) for both components

        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    }
    window.addEventListener('pointermove', onPointerMove);
    let outlineMeshes = [];
    const sphereOutline = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshBasicMaterial({}));

    document.getElementById("atomToView").onchange = () => {
        document.getElementById("atomInfo").innerHTML = "Atom Info: " + elements.find(e => e.name === document.getElementById("atomToView").value).summary;
        clearAtom();
        loadAtom(document.getElementById("atomToView").value);
    }
    document.getElementById("atomInfo").innerHTML = "Atom Info: " + elements.find(e => e.name === document.getElementById("atomToView").value).summary;
    clearAtom();
    loadAtom(document.getElementById("atomToView").value);
    document.onmousedown = () => {
        raycaster.setFromCamera(pointer, camera);
        const ray = raycaster.ray;
        let currDist = Infinity;
        let chosen = null;
        initialPositions.forEach(pos => {
            if (ray.intersectsSphere(new THREE.Sphere(pos, 0.5)) && pos.distanceTo(camera.position) < currDist) {
                currDist = pos.distanceTo(camera.position);
                chosen = pos;
            }
        });
        electrons.forEach(electron => {
            /*if (raycaster.intersectObjects([electron.mesh, electron.trail]).length > 0) {
                console.log(electron);
            }*/
            if (ray.intersectsSphere(new THREE.Sphere(electron.mesh.position, 0.5)) ||
                (!(chosen instanceof THREE.Vector3) && electron.trail.positions.some(pos => ray.distanceToPoint(pos[4]) < 0.5))) {
                const d = Math.min(
                    electron.mesh.position.distanceTo(camera.position),
                    electron.trail.positions.find(pos => ray.distanceToPoint(pos[4]) < 0.5)[4].distanceTo(camera.position)
                );
                if (d < currDist) {
                    currDist = d;
                    chosen = electron;
                }
            }
        });
        let type = "electron";
        if (chosen && !chosen.trail) {
            if (chosen.proton) {
                type = "proton";
            } else {
                type = "neutron";
            }
        }
        if (chosen !== null) {
            document.getElementById("info").style.display = "block";
            if (type === "electron") {
                document.getElementById("name").innerHTML = "Electron";
                document.getElementById("type").innerHTML = "Fermion (Fundamental Particle)";
                document.getElementById("img").src = "electron.png";
                document.getElementById("pars").innerHTML = /*html*/ `
            <p>Energy Level/Shell: <strong>${chosen.shell + 1}</strong></p>
            <p>Subshell: <strong>${chosen.subshell}</strong></p>
            <p>Spin: <strong>${chosen.spin}</strong></p>
            <p>Charge: -1</p>
            `;
            } else if (type === "proton") {
                document.getElementById("name").innerHTML = "Proton";
                document.getElementById("type").innerHTML = "Baryon";
                document.getElementById("img").src = "proton.png";
                document.getElementById("pars").innerHTML = /*html*/ `
                <p>Charge: +1</p>
                <p>Mass: ~1 amu</p>
                <p>Made of: 2 up quarks, 1 down quark, many gluons</p>
                `;
            } else if (type === "neutron") {
                document.getElementById("name").innerHTML = "Neutron";
                document.getElementById("type").innerHTML = "Baryon";
                document.getElementById("img").src = "neutron.png";
                document.getElementById("pars").innerHTML = /*html*/ `
                <p>Charge: 0</p>
                <p>Mass: ~1 amu</p>
                <p>Made of: 1 up quark, 2 down quarks, many gluons</p>
                `;
            }
            if (type === "neutron" || type === "proton") {
                outlineMeshes = [sphereOutline];
                sphereOutline.position.copy(chosen);
                sphereOutline.updateMatrixWorld();

            } else if (type === "electron") {
                outlineMeshes = [chosen.trail, chosen.mesh];
            }
        } else {
            outlineMeshes = [];
            document.getElementById("info").style.display = "none";
        }
    }
    const defaultTexture = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter
    });
    defaultTexture.depthTexture = new THREE.DepthTexture(clientWidth, clientHeight, THREE.FloatType);
    const outlineTexture = new THREE.WebGLRenderTarget(clientWidth, clientHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter
    });
    outlineTexture.depthTexture = new THREE.DepthTexture(clientWidth, clientHeight, THREE.FloatType);
    // Post Effects
    const composer = new EffectComposer(renderer);
    const smaaPass = new SMAAPass(clientWidth, clientHeight);
    const effectPass = new ShaderPass(EffectShader);
    const effectCompositer = new ShaderPass(EffectCompositer);
    composer.addPass(effectPass);
    composer.addPass(effectCompositer);
    composer.addPass(new ShaderPass(GammaCorrectionShader));
    composer.addPass(smaaPass);

    function animate() {
        electrons.forEach(electron => {
            electron.mesh.position.x = (-Math.sin(electron.phi) * Math.cos(electron.theta)) * electron.radius;
            electron.mesh.position.y = (Math.cos(electron.phi)) * electron.radius;
            electron.mesh.position.z = (Math.sin(electron.phi) * Math.sin(electron.theta)) * electron.radius;
            electron.phi += 0.025;
        })
        renderer.setRenderTarget(defaultTexture);
        renderer.clear();
        renderer.render(scene, camera);
        renderer.setRenderTarget(outlineTexture);
        renderer.clear();
        const outlineGroup = new THREE.Group();
        outlineMeshes.forEach(mesh => {
            let ogValue = mesh.material.depthWrite;
            mesh.material.depthWrite = true;
            mesh.ogValue = ogValue;
            mesh.oldParent = mesh.parent;
            outlineGroup.add(mesh);
        });
        renderer.render(outlineGroup, camera);
        outlineMeshes.forEach(mesh => {
            mesh.material.depthWrite = mesh.ogValue;
            if (mesh.oldParent) {
                mesh.oldParent.add(mesh);
            }
        });
        effectCompositer.uniforms["sceneDiffuse"].value = defaultTexture.texture;
        effectCompositer.uniforms["sceneDepth"].value = defaultTexture.depthTexture;
        effectCompositer.uniforms["outlineDepth"].value = outlineTexture.depthTexture;
        effectPass.uniforms["sceneDiffuse"].value = defaultTexture.texture;
        effectPass.uniforms["sceneDepth"].value = defaultTexture.depthTexture;
        effectPass.uniforms["projMat"].value = camera.projectionMatrix;
        effectPass.uniforms["viewMat"].value = camera.matrixWorldInverse;
        effectPass.uniforms["projViewMat"].value = camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse.clone());
        effectPass.uniforms["projectionMatrixInv"].value = camera.projectionMatrixInverse;
        effectPass.uniforms["viewMatrixInv"].value = camera.matrixWorld;
        effectPass.uniforms["cameraPos"].value = camera.position;
        effectPass.uniforms['resolution'].value = new THREE.Vector2(clientWidth, clientHeight);
        effectPass.uniforms['time'].value = performance.now() / 1000;
        effectCompositer.uniforms["resolution"].value = new THREE.Vector2(clientWidth, clientHeight);
        composer.render();
        controls.update();
        stats.update();
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}
main();