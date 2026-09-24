import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uFade: { value: 1 },
    uAberration: { value: 0.0022 },
    uVignette: { value: 0.55 },
    uGrain: { value: 0.05 },
    uShadowTint: { value: new THREE.Vector3(0.9, 1.0, 1.12) },
    uHighlightTint: { value: new THREE.Vector3(1.1, 1.0, 0.9) },
    uResolution: { value: new THREE.Vector2(1280, 720) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uFade;
    uniform float uAberration;
    uniform float uVignette;
    uniform float uGrain;
    uniform vec3 uShadowTint;
    uniform vec3 uHighlightTint;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 offset = c * uAberration * r2 * 4.0;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + offset).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - offset).b;

      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col *= mix(uShadowTint, uHighlightTint, smoothstep(0.02, 0.9, luma));
      col *= 1.0 - uVignette * smoothstep(0.12, 0.62, r2 * 2.6);
      col *= 1.0 + (hash(vUv * uResolution + fract(uTime) * 91.7) - 0.5) * uGrain;
      col *= uFade;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export type PostChain = {
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  grade: ShaderPass;
  setSize: (width: number, height: number, pixelRatio: number) => void;
  dispose: () => void;
};

export function createPostChain(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, width: number, height: number): PostChain {
  const target = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.6, 0.75, 0.92);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  return {
    composer,
    bloom,
    grade,
    setSize(w, h, pixelRatio) {
      composer.setPixelRatio(pixelRatio);
      composer.setSize(w, h);
      grade.uniforms.uResolution.value.set(w * pixelRatio, h * pixelRatio);
    },
    dispose() {
      composer.dispose();
      target.dispose();
    },
  };
}
