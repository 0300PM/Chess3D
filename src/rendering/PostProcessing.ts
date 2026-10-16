import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export type PostFX = {
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  grade: ShaderPass;
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    vignette: { value: 1.18 },
    contrast: { value: 1.055 },
    saturation: { value: 1.06 },
    warmth: { value: 0.055 },
    lift: { value: 0.006 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float vignette;
    uniform float contrast;
    uniform float saturation;
    uniform float warmth;
    uniform float lift;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;

      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, saturation);
      color = (color - 0.5) * contrast + 0.5;

      vec3 shadowTint = vec3(-0.02, 0.0, 0.05);
      vec3 highlightTint = vec3(0.06, 0.025, -0.02);
      color += mix(shadowTint, highlightTint, smoothstep(0.0, 1.0, luma)) * warmth * 4.0;
      color += lift;

      vec2 centered = vUv - 0.5;
      float radius = length(centered * vec2(1.0, 1.06));
      float falloff = smoothstep(0.32, 0.78, radius);
      color *= mix(1.0, 1.0 - 0.42 * vignette, falloff);

      float dither = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) / 255.0;
      color += dither;

      gl_FragColor = vec4(max(color, vec3(0.0)), texel.a);
    }
  `
};

export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  size: THREE.Vector2
): PostFX {
  const target = new THREE.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), {
    type: THREE.HalfFloatType,
    samples: 4
  });

  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(size, 0.34, 0.62, 0.86);
  composer.addPass(bloom);

  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  composer.addPass(new OutputPass());

  return { composer, bloom, grade };
}
