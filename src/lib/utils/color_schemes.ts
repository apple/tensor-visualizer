// Copyright © 2024 Apple Inc. All rights reserved.
//
// Use of this source code is governed by a BSD-3-clause license that can
// be found in the LICENSE file or at https://opensource.org/licenses/BSD-3-Clause

import * as d3chromatic from "d3-scale-chromatic";
import { color } from "d3-color";

/** A color scheme, aka., a mapping from [0, 1] to [R,G,B,A] values, where RGBA are ranged in [0, 255]. */
type ColorScheme = (t: number) => { r: number; g: number; b: number; a: number };

/** Creates a color scheme from a d3 color scheme. */
export function colorSchemeFromD3(d3scheme: (t: number) => string): ColorScheme {
  return (t) => {
    let c = color(d3scheme(t))!.rgb();
    return { r: c.r, g: c.g, b: c.b, a: c.opacity * 255 };
  };
}

export let colorSchemeNames = [
  "Viridis",
  "Cividis",
  "Inferno",
  "Plasma",
  "Blues",
  "Turbo",
  "Greys",
  "RdBu",
  "BuRd",
];

/** Gets a color scheme by name. */
export function colorSchemeByName(name: string): ColorScheme {
  switch (name.toLowerCase()) {
    case "viridis":
      return colorSchemeFromD3(d3chromatic.interpolateViridis);
    case "cividis":
      return colorSchemeFromD3(d3chromatic.interpolateCividis);
    case "inferno":
      return colorSchemeFromD3(d3chromatic.interpolateInferno);
    case "plasma":
      return colorSchemeFromD3(d3chromatic.interpolatePlasma);
    case "blues":
      return colorSchemeFromD3(d3chromatic.interpolateBlues);
    case "turbo":
      return colorSchemeFromD3(d3chromatic.interpolateTurbo);
    case "greys":
      return colorSchemeFromD3(d3chromatic.interpolateGreys);
    case "rdbu":
      return colorSchemeFromD3(d3chromatic.interpolateRdBu);
    case "burd":
      return colorSchemeFromD3((t) => d3chromatic.interpolateRdBu(1 - t));
    default:
      console.warn(`Unknown color scheme '${name}', fall back to 'greys'.`);
      return colorSchemeFromD3(d3chromatic.interpolateGreys);
  }
}

/** A discretized color scheme, stored as an array of bytes [r0,g0,b0,a0,r1,g1,b1,a1,...]. */
export class DiscreteColorScheme {
  private data: Uint8Array;
  private count: number;
  private fallback: { r: number; g: number; b: number; a: number };

  constructor(
    scheme: ColorScheme,
    count: number = 256,
    fallback: { r: number; g: number; b: number; a: number } = { r: 0, g: 0, b: 0, a: 0 }
  ) {
    let data = new Uint8Array(count * 4);
    let p = 0;
    for (let i = 0; i < count; i++) {
      let t = i / (count - 1);
      let { r, g, b, a } = scheme(t);
      data[p++] = r;
      data[p++] = g;
      data[p++] = b;
      data[p++] = a;
    }
    this.count = count;
    this.data = data;
    this.fallback = fallback;
  }

  interpolate(t: number): { r: number; g: number; b: number; a: number } {
    let data = this.data;
    let count = this.count;
    // position in [0, count - 1] space.
    let pos = t * (count - 1);
    if (!isFinite(pos)) {
      return this.fallback;
    }
    // clamp to [0, count - 1].
    pos = Math.max(0, Math.min(pos, count - 1));
    let i1 = Math.floor(pos);
    let k = pos - i1;
    let i2 = Math.min(i1 + 1, count - 1);
    let k1 = 1 - k;
    let k2 = k;
    i1 *= 4;
    i2 *= 4;
    return {
      r: data[i1] * k1 + data[i2] * k2,
      g: data[i1 + 1] * k1 + data[i2 + 1] * k2,
      b: data[i1 + 2] * k1 + data[i2 + 2] * k2,
      a: data[i1 + 3] * k1 + data[i2 + 3] * k2,
    };
  }

  bytes(): Uint8Array {
    return this.data;
  }

  get length(): number {
    return this.count;
  }
}

export class ColormapTexture {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  texture: WebGLTexture;

  constructor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.gl = gl;
    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  setColormap(
    colormap: (t: number) => { r: number; g: number; b: number; a: number },
    resolution: number = 512
  ) {
    let gl = this.gl;
    let pixels = new DiscreteColorScheme(colormap, resolution).bytes();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, resolution, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  setNamedColormap(name: string, resolution: number = 512) {
    this.setColormap(colorSchemeByName(name), resolution);
  }
}
