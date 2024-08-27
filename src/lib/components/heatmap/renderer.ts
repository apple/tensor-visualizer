// Copyright © 2024 Apple Inc. All rights reserved.
//
// Use of this source code is governed by a BSD-3-clause license that can
// be found in the LICENSE file or at https://opensource.org/licenses/BSD-3-Clause

import type { Tensor, TensorExtents } from "../../utils/Tensor.js";
import { DiscreteColorScheme, colorSchemeByName } from "../../utils/color_schemes.js";

export interface HeatmapAxis {
  title?: string | null;
}

export interface HeatmapSpec {
  width?: number;
  height?: number;
  padding?: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
  scale?: {
    type?: "linear" | "log";
    domain?: [number, number];
    scheme?: string;
  };
  tooltip?: {} | null;
  legend?: {} | null;
  xAxis?: HeatmapAxis | null;
  yAxis?: HeatmapAxis | null;
  xLabels?: (string | undefined)[] | null;
  yLabels?: (string | undefined)[] | null;
}

export interface ResolvedHeatmapScale {
  type: "linear" | "log";
  domain: [number, number];
  scheme: string;
}

export function defaultHeatmapSize(shape: number[]): {
  width: number;
  height: number;
} {
  let maxWidth = 800;
  let maxHeight = 600;
  let maxCellSize = 20;
  let minSize = 480;

  let width = shape[shape.length - 1];
  let height = shape[shape.length - 2];

  let scaler = 1;
  if (width < minSize) {
    scaler = Math.max(scaler, minSize / width);
  }
  if (height < minSize) {
    scaler = Math.max(scaler, minSize / height);
  }
  if (scaler > maxCellSize) {
    scaler = maxCellSize;
  }
  scaler = Math.floor(scaler);
  width *= scaler;
  height *= scaler;

  width = Math.min(maxWidth, width);
  height = Math.min(maxHeight, height);

  return { width, height };
}

function defaultHeatmapScaleDomain(
  extents: TensorExtents,
  type: "linear" | "log"
): [number, number] {
  if (extents.min < 0 && extents.max > 0) {
    let maxAbs = Math.max(-extents.min, extents.max);
    return [-maxAbs, maxAbs];
  } else {
    let includeZero = false;
    let domainMin = extents.min;
    let domainMax = extents.max;
    if (type == "linear" && Math.abs(domainMax - domainMin) > Math.abs(domainMax) * 0.1) {
      includeZero = true;
    }
    if (type == "log") {
      domainMin = extents.minPositive > 0 ? extents.minPositive : domainMax * 1e-4;
    }
    if (includeZero) {
      if (domainMax < 0) {
        domainMax = 0;
      } else if (domainMin > 0) {
        domainMin = 0;
      }
    }
    return [domainMin, domainMax];
  }
}

function defaultHeatmapScaleScheme(domain: [number, number]): string {
  return domain[0] < 0 ? "burd" : "turbo";
}

export function defaultHeatmapScale(
  data: Tensor,
  scale: HeatmapSpec["scale"] | undefined = undefined
): ResolvedHeatmapScale {
  let type = scale?.type ?? "linear";
  let domain = scale?.domain ?? defaultHeatmapScaleDomain(data.extents(), type);
  let scheme = scale?.scheme ?? defaultHeatmapScaleScheme(domain);
  return { type, domain, scheme };
}

function writeHeatmapPixels(
  input: ArrayLike<number>,
  output: Uint8ClampedArray,
  cmap: DiscreteColorScheme,
  sk: number,
  sb: number,
  isLog: boolean
) {
  let pw = 0;
  for (let pr = 0; pr < input.length; pr++) {
    let value = input[pr];
    let scaledValue = (isLog ? Math.log(value) : value) * sk + sb;
    let rgba = cmap.interpolate(scaledValue);
    output[pw++] = rgba.r;
    output[pw++] = rgba.g;
    output[pw++] = rgba.b;
    output[pw++] = rgba.a;
  }
}

export function renderHeatmapIntoCanvas(
  canvas: HTMLCanvasElement,
  matrix: Tensor,
  scale: ResolvedHeatmapScale
) {
  let ctx = canvas.getContext("2d")!;
  let width = matrix.shape[1];
  let height = matrix.shape[0];
  let imageData = new ImageData(width, height);
  let cmap = new DiscreteColorScheme(colorSchemeByName(scale.scheme), 128);
  let isLog = scale.type == "log";
  let sk: number, sb: number;
  let [domainMin, domainMax] = scale.domain;
  if (isLog) {
    sk = 1 / (Math.log(domainMax) - Math.log(domainMin));
    sb = -Math.log(domainMin) * sk;
  } else {
    sk = 1 / (domainMax - domainMin);
    sb = -domainMin * sk;
  }
  writeHeatmapPixels(matrix.storage, imageData.data, cmap, sk, sb, isLog);
  ctx.putImageData(imageData, 0, 0);
}
