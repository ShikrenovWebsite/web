"use client";

import { Color, Mesh, Program, Renderer, Triangle } from "ogl";
import { type HTMLAttributes, useEffect, useMemo, useRef } from "react";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";
import "./faulty-terminal.css";

type Vec2 = [number, number];

export interface FaultyTerminalProps extends HTMLAttributes<HTMLDivElement> {
  scale?: number;
  gridMul?: Vec2;
  digitSize?: number;
  timeScale?: number;
  pause?: boolean;
  scanlineIntensity?: number;
  glitchAmount?: number;
  flickerAmount?: number;
  noiseAmp?: number;
  chromaticAberration?: number;
  dither?: number | boolean;
  curvature?: number;
  tint?: string;
  mouseReact?: boolean;
  mouseStrength?: number;
  dpr?: number;
  pageLoadAnimation?: boolean;
  brightness?: number;
  enabled?: boolean;
}

type TerminalSettings = {
  scale: number;
  gridMul: Vec2;
  digitSize: number;
  timeScale: number;
  pause: boolean;
  scanlineIntensity: number;
  glitchAmount: number;
  flickerAmount: number;
  noiseAmp: number;
  chromaticAberration: number;
  dither: number | boolean;
  curvature: number;
  tint: string;
  mouseReact: boolean;
  mouseStrength: number;
  pageLoadAnimation: boolean;
  brightness: number;
};

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision mediump float;

varying vec2 vUv;

uniform float iTime;
uniform vec3 iResolution;
uniform float uScale;
uniform vec2 uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uNoiseAmp;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3 uTint;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform float uBrightness;

float time;

float hash21(vec2 p) {
  p = fract(p * 234.56);
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2;
}

mat2 rotate(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float fbm(vec2 p) {
  p *= 1.1;
  float f = 0.0;
  float amp = 0.5 * uNoiseAmp;

  mat2 modify0 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify0 * p * 2.0;
  amp *= 0.454545;

  mat2 modify1 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify1 * p * 2.0;
  amp *= 0.454545;

  mat2 modify2 = rotate(time * 0.08);
  f += amp * noise(p);

  return f;
}

float pattern(vec2 p, out vec2 q, out vec2 r) {
  vec2 offset1 = vec2(1.0);
  vec2 offset0 = vec2(0.0);
  mat2 rot01 = rotate(0.1 * time);
  mat2 rot1 = rotate(0.1);

  q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));
  r = vec2(fbm(rot1 * q + offset0), fbm(q + offset0));
  return fbm(p + r);
}

float digit(vec2 p) {
  vec2 grid = uGridMul * 15.0;
  vec2 s = floor(p * grid) / grid;
  p *= grid;
  vec2 q;
  vec2 r;
  float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;

  if (uUseMouse > 0.5) {
    vec2 mouseWorld = uMouse * uScale;
    float distToMouse = distance(s, mouseWorld);
    float mouseInfluence =
      exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
    intensity += mouseInfluence;
    intensity +=
      sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
  }

  if (uUsePageLoadAnimation > 0.5) {
    float cellRandom =
      fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
    float cellDelay = cellRandom * 0.8;
    float cellProgress =
      clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);
    intensity *= smoothstep(0.0, 1.0, cellProgress);
  }

  p = fract(p) * uDigitSize;
  float px5 = p.x * 5.0;
  float py5 = (1.0 - p.y) * 5.0;
  float x = fract(px5);
  float y = fract(py5);
  float i = floor(py5) - 2.0;
  float j = floor(px5) - 2.0;
  float n = i * i + j * j;
  float isOn = step(0.1, intensity - n * 0.0625);
  float value = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);

  return
    step(0.0, p.x) *
    step(p.x, 1.0) *
    step(0.0, p.y) *
    step(p.y, 1.0) *
    value;
}

float onOff(float a, float b, float c) {
  return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;
}

float displace(vec2 look) {
  float y = look.y - mod(iTime * 0.25, 1.0);
  float window = 1.0 / (1.0 + 50.0 * y * y);
  return
    sin(look.y * 20.0 + iTime) *
    0.0125 *
    onOff(4.0, 2.0, 0.8) *
    (1.0 + cos(iTime * 60.0)) *
    window;
}

vec3 getColor(vec2 p) {
  float bar =
    (step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0) *
    uScanlineIntensity;
  float displacement = displace(p) * uGlitchAmount;
  p.x += displacement;

  float middle = digit(p);
  const float off = 0.002;
  float sum =
    digit(p + vec2(-off, -off)) +
    digit(p + vec2(0.0, -off)) +
    digit(p + vec2(off, -off)) +
    digit(p + vec2(-off, 0.0)) +
    digit(p) +
    digit(p + vec2(off, 0.0)) +
    digit(p + vec2(-off, off)) +
    digit(p + vec2(0.0, off)) +
    digit(p + vec2(off, off));

  return vec3(0.9) * middle + sum * 0.1 * vec3(1.0) * bar;
}

vec2 barrel(vec2 uv) {
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + uCurvature * r2;
  return c * 0.5 + 0.5;
}

void main() {
  time = iTime * 0.333333;
  vec2 uv = uCurvature == 0.0 ? vUv : barrel(vUv);
  vec2 p = uv * uScale;
  vec3 col = getColor(p);

  if (uChromaticAberration != 0.0) {
    vec2 ca = vec2(uChromaticAberration) / iResolution.xy;
    col.r = getColor(p + ca).r;
    col.b = getColor(p - ca).b;
  }

  col *= uTint;
  float signal = max(col.r, max(col.g, col.b));
  col *= uBrightness;

  if (uDither > 0.0) {
    col += (hash21(gl_FragCoord.xy) - 0.5) * (uDither * 0.003922);
  }

  float alpha = clamp(signal * 1.35, 0.0, 0.86);
  gl_FragColor = vec4(col, alpha);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  let normalized = hex.replace("#", "").trim();
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((character) => character + character)
      .join("");
  }
  const value = Number.parseInt(normalized.slice(0, 6), 16);
  if (Number.isNaN(value)) return [1, 1, 1];
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

function getWebGlSupport() {
  return typeof window.WebGLRenderingContext !== "undefined";
}

export function FaultyTerminal({
  scale = 1,
  gridMul = [2, 1],
  digitSize = 1.5,
  timeScale = 0.3,
  pause = false,
  scanlineIntensity = 0.3,
  glitchAmount = 1,
  flickerAmount = 1,
  noiseAmp = 1,
  chromaticAberration = 0,
  dither = 0,
  curvature = 0.2,
  tint = "#ffffff",
  mouseReact = true,
  mouseStrength = 0.2,
  dpr,
  pageLoadAnimation = true,
  brightness = 1,
  enabled = true,
  className,
  style,
  ...rest
}: FaultyTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const programRef = useRef<Program | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothMouseRef = useRef({ x: 0.5, y: 0.5 });
  const frozenTimeRef = useRef(0);

  const settings = useMemo<TerminalSettings>(
    () => ({
      scale,
      gridMul,
      digitSize,
      timeScale,
      pause,
      scanlineIntensity,
      glitchAmount,
      flickerAmount,
      noiseAmp,
      chromaticAberration,
      dither,
      curvature,
      tint,
      mouseReact,
      mouseStrength,
      pageLoadAnimation,
      brightness,
    }),
    [
      brightness,
      chromaticAberration,
      curvature,
      digitSize,
      dither,
      flickerAmount,
      glitchAmount,
      gridMul,
      mouseReact,
      mouseStrength,
      noiseAmp,
      pageLoadAnimation,
      pause,
      scale,
      scanlineIntensity,
      timeScale,
      tint,
    ]
  );
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const program = programRef.current;
    if (!program) return;

    const tintVector = hexToRgb(tint);
    program.uniforms.uScale.value = scale;
    program.uniforms.uGridMul.value = new Float32Array(gridMul);
    program.uniforms.uDigitSize.value = digitSize;
    program.uniforms.uScanlineIntensity.value = scanlineIntensity;
    program.uniforms.uGlitchAmount.value = glitchAmount;
    program.uniforms.uFlickerAmount.value = flickerAmount;
    program.uniforms.uNoiseAmp.value = noiseAmp;
    program.uniforms.uChromaticAberration.value = chromaticAberration;
    program.uniforms.uDither.value =
      typeof dither === "boolean" ? (dither ? 1 : 0) : dither;
    program.uniforms.uCurvature.value = curvature;
    program.uniforms.uTint.value = new Color(...tintVector);
    program.uniforms.uMouseStrength.value = mouseStrength;
    program.uniforms.uUseMouse.value = mouseReact ? 1 : 0;
    program.uniforms.uBrightness.value = brightness;
  }, [
    brightness,
    chromaticAberration,
    curvature,
    digitSize,
    dither,
    flickerAmount,
    glitchAmount,
    gridMul,
    mouseReact,
    mouseStrength,
    noiseAmp,
    scale,
    scanlineIntensity,
    tint,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    if (!getWebGlSupport()) {
      container.dataset.webgl = "unsupported";
      return;
    }

    let renderer: Renderer | null = null;
    let animationFrame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let destroyed = false;
    let loadAnimationStart = 0;
    let lastTimestamp = 0;
    let lastRenderTimestamp = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    try {
      const resolvedDpr = Math.min(
        Math.max(dpr ?? window.devicePixelRatio ?? 1, 1),
        1.5
      );
      renderer = new Renderer({
        alpha: true,
        antialias: false,
        depth: false,
        dpr: resolvedDpr,
      });
      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);

      const geometry = new Triangle(gl);
      const current = settingsRef.current;
      const tintVector = hexToRgb(current.tint);
      const program = new Program(gl, {
        vertex: vertexShader,
        fragment: fragmentShader,
        transparent: true,
        uniforms: {
          iTime: { value: 0 },
          iResolution: {
            value: new Color(
              gl.canvas.width,
              gl.canvas.height,
              gl.canvas.width / Math.max(gl.canvas.height, 1)
            ),
          },
          uScale: { value: current.scale },
          uGridMul: { value: new Float32Array(current.gridMul) },
          uDigitSize: { value: current.digitSize },
          uScanlineIntensity: { value: current.scanlineIntensity },
          uGlitchAmount: { value: current.glitchAmount },
          uFlickerAmount: { value: current.flickerAmount },
          uNoiseAmp: { value: current.noiseAmp },
          uChromaticAberration: { value: current.chromaticAberration },
          uDither: {
            value:
              typeof current.dither === "boolean"
                ? current.dither
                  ? 1
                  : 0
                : current.dither,
          },
          uCurvature: { value: current.curvature },
          uTint: { value: new Color(...tintVector) },
          uMouse: { value: new Float32Array([0.5, 0.5]) },
          uMouseStrength: { value: current.mouseStrength },
          uUseMouse: { value: current.mouseReact ? 1 : 0 },
          uPageLoadProgress: {
            value: current.pageLoadAnimation ? 0 : 1,
          },
          uUsePageLoadAnimation: {
            value: current.pageLoadAnimation ? 1 : 0,
          },
          uBrightness: { value: current.brightness },
        },
      });
      programRef.current = program;
      const mesh = new Mesh(gl, { geometry, program });
      const canvas = gl.canvas as HTMLCanvasElement;
      canvas.setAttribute("aria-hidden", "true");

      const resize = () => {
        if (destroyed || !renderer) return;
        const width = Math.max(container.clientWidth, 1);
        const height = Math.max(container.clientHeight, 1);
        renderer.setSize(width, height);
        program.uniforms.iResolution.value = new Color(
          gl.canvas.width,
          gl.canvas.height,
          gl.canvas.width / Math.max(gl.canvas.height, 1)
        );
      };

      const draw = (timestamp: number) => {
        if (destroyed || !renderer || document.hidden) return;
        const latest = settingsRef.current;
        const shouldAnimate = !latest.pause && !reducedMotion.matches;
        if (
          shouldAnimate &&
          lastRenderTimestamp &&
          timestamp - lastRenderTimestamp < 32
        ) {
          animationFrame = window.requestAnimationFrame(draw);
          return;
        }
        lastRenderTimestamp = timestamp;

        if (latest.pageLoadAnimation && loadAnimationStart === 0) {
          loadAnimationStart = timestamp;
        }

        if (!latest.pause && !reducedMotion.matches) {
          const delta = lastTimestamp
            ? Math.min((timestamp - lastTimestamp) * 0.001, 0.1)
            : 0;
          frozenTimeRef.current += delta * latest.timeScale;
        }
        lastTimestamp = timestamp;
        program.uniforms.iTime.value = frozenTimeRef.current;

        if (latest.pageLoadAnimation) {
          program.uniforms.uPageLoadProgress.value = reducedMotion.matches
            ? 1
            : Math.min((timestamp - loadAnimationStart) / 2000, 1);
        }

        if (latest.mouseReact && !reducedMotion.matches) {
          const smoothMouse = smoothMouseRef.current;
          const mouse = mouseRef.current;
          smoothMouse.x += (mouse.x - smoothMouse.x) * 0.08;
          smoothMouse.y += (mouse.y - smoothMouse.y) * 0.08;
          const mouseUniform = program.uniforms.uMouse.value as Float32Array;
          mouseUniform[0] = smoothMouse.x;
          mouseUniform[1] = smoothMouse.y;
        }

        renderer.render({ scene: mesh });
        if (!latest.pause && !reducedMotion.matches) {
          animationFrame = window.requestAnimationFrame(draw);
        }
      };

      const start = () => {
        window.cancelAnimationFrame(animationFrame);
        lastTimestamp = 0;
        lastRenderTimestamp = 0;
        if (!document.hidden) {
          animationFrame = window.requestAnimationFrame(draw);
        }
      };

      const handleVisibilityChange = () => {
        if (document.hidden) {
          window.cancelAnimationFrame(animationFrame);
        } else {
          start();
        }
      };

      const handleMotionChange = () => {
        start();
      };

      const handlePointerMove = (event: PointerEvent) => {
        mouseRef.current = {
          x: event.clientX / Math.max(window.innerWidth, 1),
          y: 1 - event.clientY / Math.max(window.innerHeight, 1),
        };
      };

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      resize();

      const existingCanvas = container.querySelector("canvas");
      if (existingCanvas) {
        existingCanvas
          .getContext("webgl")
          ?.getExtension("WEBGL_lose_context")
          ?.loseContext();
        existingCanvas.remove();
      }
      container.appendChild(canvas);
      container.dataset.webgl = "ready";

      document.addEventListener("visibilitychange", handleVisibilityChange);
      reducedMotion.addEventListener("change", handleMotionChange);
      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      start();

      return () => {
        destroyed = true;
        window.cancelAnimationFrame(animationFrame);
        resizeObserver?.disconnect();
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
        reducedMotion.removeEventListener("change", handleMotionChange);
        window.removeEventListener("pointermove", handlePointerMove);
        if (canvas.parentElement === container) canvas.remove();
        programRef.current = null;
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
    } catch {
      renderer?.gl.getExtension("WEBGL_lose_context")?.loseContext();
      container.dataset.webgl = "failed";
    }
  }, [dpr, enabled]);

  return (
    <div
      {...rest}
      aria-hidden="true"
      className={cn("faulty-terminal", className)}
      data-webgl="idle"
      ref={containerRef}
      style={style}
    />
  );
}

export function PublicFaultyTerminalBackground() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <>
      <div
        aria-hidden="true"
        className="public-terminal-layer pointer-events-none fixed inset-0 z-0"
      >
        <FaultyTerminal
          scale={2.4}
          gridMul={[2, 1]}
          digitSize={1}
          timeScale={0.1}
          pause={false}
          scanlineIntensity={2}
          glitchAmount={1}
          flickerAmount={1}
          noiseAmp={1}
          chromaticAberration={0}
          dither={0}
          curvature={0.1}
          tint="#1cff00"
          mouseReact
          mouseStrength={0.2}
          pageLoadAnimation
          brightness={1}
        />
      </div>
    </>
  );
}
