import * as THREE from 'https://cdn.skypack.dev/three@0.142.0';
const EffectCompositer = {
    uniforms: {

        'sceneDiffuse': { value: null },
        'sceneDepth': { value: null },
        'tDiffuse': { value: null },
        'projMat': { value: new THREE.Matrix4() },
        'viewMat': { value: new THREE.Matrix4() },
        'projectionMatrixInv': { value: new THREE.Matrix4() },
        'viewMatrixInv': { value: new THREE.Matrix4() },
        'cameraPos': { value: new THREE.Vector3() },
        'resolution': { value: new THREE.Vector2() },
        'time': { value: 0.0 },
        'outlineDepth': { value: null }
    },
    vertexShader: /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,
    fragmentShader: /* glsl */ `
		uniform sampler2D sceneDiffuse;
    uniform sampler2D sceneDepth;
    uniform sampler2D tDiffuse;
    uniform sampler2D outlineDepth;
    uniform vec2 resolution;
    varying vec2 vUv;
    highp float linearize_depth(highp float d, highp float zNear,highp float zFar)
    {
        highp float z_n = 2.0 * d - 1.0;
        return 2.0 * zNear * zFar / (zFar + zNear - z_n * (zFar - zNear));
    }
    void main() {
        const float directions = 16.0;
        const float quality = 6.0;
        const float pi = 3.14159;
        float size = 12.0;//1000.0 * (1.0 - texture2D(sceneDepth, vUv).x);
        vec2 radius = vec2(size) / resolution;
        vec3 texel = vec3(0.0);
        float depth = linearize_depth(texture2D(sceneDepth, vUv).x, 0.1, 1000.0);
        float count = 0.0;
        for(float d =0.0; d < pi * 2.0; d+=(pi * 2.0) / directions) {
            for(float i = 1.0/quality; i<=1.0; i+=1.0/quality) {
                vec2 sampleUv = vUv+vec2(cos(d), sin(d)) * radius * i;
                vec3 occlusion = texture2D(tDiffuse, sampleUv).rgb;
                float depthSample = linearize_depth(texture2D(sceneDepth, sampleUv).x, 0.1, 1000.0);
                float weight = min(1.0 / abs(depth - depthSample), 10.0);
                texel += weight * occlusion;
                count += weight;
            }
        }
        texel /= count;
        gl_FragColor = vec4(texture2D(sceneDiffuse, vUv).rgb * vec3(pow(texel.x, 2.0)), 1.0);
        float od = texture2D(outlineDepth, vUv).x;
        if (od == 1.0) {
            for(float i = -2.0; i <= 2.0; i++) {
                for(float j = -2.0; j <= 2.0; j++) {
                    vec2 samplePoint = vUv + vec2(i, j) / resolution;
                    if (texture2D(outlineDepth, samplePoint).x < 1.0) {
                        //gl_FragColor = vec4(vec3(texture2D(outlineDepth, samplePoint).x < texture2D(sceneDepth, samplePoint).x + 0.001 ? 1.0: 0.2), 1.0);
                        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), linearize_depth(texture2D(outlineDepth, samplePoint).x, 0.1, 1000.0) < linearize_depth(texture2D(sceneDepth, samplePoint).x, 0.1, 1000.0) + 0.01 ? 1.0: 0.1);
                        return;
                    }
                }
            }
        }
    }
    `

}
export { EffectCompositer };