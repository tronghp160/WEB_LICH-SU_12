// Vẽ "ảnh thật có chiều sâu" bằng WebGL thuần (không cần Three.js): một hình chữ nhật phủ khung, shader lệch từng điểm ảnh
// theo bản đồ độ sâu. Công thức khớp với projectPoint() trong lib/photo3d/parallax.ts.

import { BASE_ZOOM, FOCUS_DEPTH, PARALLAX_STRENGTH, type Vec2 } from "@/lib/photo3d/parallax";

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform vec2 uOffset;
uniform vec2 uCenter;
uniform float uZoom;
varying vec2 vUv;
void main() {
  vec2 base = uCenter + (vUv - 0.5) / uZoom;
  vec2 p = base;
  // Lặp điểm bất động: tìm điểm ảnh p mà sau khi lệch theo độ sâu của chính nó thì rơi đúng vào vị trí đang vẽ.
  for (int i = 0; i < 6; i++) {
    float d = texture2D(uDepth, p).r;
    p = base + uOffset * (d - ${FOCUS_DEPTH.toFixed(3)});
  }
  gl_FragColor = texture2D(uImage, clamp(p, 0.001, 0.999));
}`;

export type DepthRenderer = {
  draw: (tilt: Vec2, zoom: number, center: Vec2) => void;
  resize: () => void;
  dispose: () => void;
};

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  return shader;
}

function texture(gl: WebGLRenderingContext, image: TexImageSource, unit: number): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  // Ảnh không phải lũy thừa của 2 → không dùng mipmap, kẹp mép.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/** Tạo bộ vẽ; trả null nếu trình duyệt không có WebGL. */
export function createDepthRenderer(canvas: HTMLCanvasElement, image: HTMLImageElement, depth: HTMLImageElement): DepthRenderer | null {
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) return null;

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "program");
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const textures = [texture(gl, image, 0), texture(gl, depth, 1)];
  gl.uniform1i(gl.getUniformLocation(program, "uImage"), 0);
  gl.uniform1i(gl.getUniformLocation(program, "uDepth"), 1);
  const uOffset = gl.getUniformLocation(program, "uOffset");
  const uCenter = gl.getUniformLocation(program, "uCenter");
  const uZoom = gl.getUniformLocation(program, "uZoom");

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();

  return {
    resize,
    draw(tilt, zoom, center) {
      gl.uniform2f(uOffset, tilt.x * PARALLAX_STRENGTH, tilt.y * PARALLAX_STRENGTH);
      gl.uniform2f(uCenter, center.x, center.y);
      gl.uniform1f(uZoom, zoom * BASE_ZOOM);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      for (const tex of textures) gl.deleteTexture(tex);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

/** Đọc độ sâu (0…1) tại các điểm cho trước từ ảnh bản đồ độ sâu (để đặt điểm chú thích theo đúng lớp). */
export function sampleDepths(depth: HTMLImageElement, points: Vec2[]): number[] {
  const canvas = document.createElement("canvas");
  canvas.width = depth.naturalWidth;
  canvas.height = depth.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return points.map(() => FOCUS_DEPTH);
  context.drawImage(depth, 0, 0);
  return points.map((point) => {
    const x = Math.min(canvas.width - 1, Math.max(0, Math.round(point.x * (canvas.width - 1))));
    const y = Math.min(canvas.height - 1, Math.max(0, Math.round(point.y * (canvas.height - 1))));
    return context.getImageData(x, y, 1, 1).data[0] / 255;
  });
}
