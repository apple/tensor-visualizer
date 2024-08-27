<!--
  Copyright © 2024 Apple Inc. All rights reserved.
  
  Use of this source code is governed by a BSD-3-clause license that can
  be found in the LICENSE file or at https://opensource.org/licenses/BSD-3-Clause
-->

<script lang="ts">
  import { afterUpdate } from "svelte";
  import { scaleLinear, scaleLog } from "d3-scale";
  import { DiscreteColorScheme, colorSchemeByName } from "../../utils/color_schemes.js";
  import type { ResolvedHeatmapScale } from "./renderer.js";

  export let scale: ResolvedHeatmapScale;
  export let padding: { left?: number; right?: number } | undefined;
  export let width: number = 300;
  export let height: number = 10;

  let canvas: HTMLCanvasElement;
  let desiredTickCount: number = 5;

  $: paddingLeft = padding?.left ?? 30;
  $: paddingRight = padding?.right ?? 30;
  let marginX = 20;
  $: discretizedScheme = new DiscreteColorScheme(
    colorSchemeByName(scale.scheme),
    Math.round(width),
  );
  $: pixelSize = width / discretizedScheme.length;
  $: xScale =
    scale.type == "linear"
      ? scaleLinear(scale.domain, [pixelSize / 2, width - pixelSize / 2])
      : scaleLog(scale.domain, [pixelSize / 2, width - pixelSize / 2]);
  $: ticks = xScale.ticks(desiredTickCount);
  $: tickFormat = xScale.tickFormat(desiredTickCount);

  afterUpdate(() => {
    let ctx = canvas.getContext("2d")!;
    let imageData = new ImageData(discretizedScheme.length, 1);
    let src = discretizedScheme.bytes();
    for (let i = 0; i < src.length; i++) {
      imageData.data[i] = src[i];
    }
    ctx.putImageData(imageData, 0, 0);
  });
</script>

<main>
  <div
    style:position="relative"
    style:width="{width + paddingLeft + paddingRight}px"
    style:height="{height + 30}px"
  >
    <canvas
      bind:this={canvas}
      width={discretizedScheme.length}
      height={1}
      style:width="{width}px"
      style:height="{height}px"
      style:left="{paddingLeft}px"
    />
    <svg
      width={width + paddingLeft + paddingRight + marginX * 2}
      height={height + 30}
      style:left="{-marginX}px"
    >
      <g transform="translate({paddingLeft + marginX}, 0)">
        {#each ticks as x}
          <line
            x1={xScale(x)}
            x2={xScale(x)}
            y1={height + 1}
            y2={height + 5}
            style:stroke="black"
          />
          <text
            x={xScale(x)}
            y={height + 7}
            style:fill="black"
            style:text-anchor="middle"
            style:dominant-baseline="hanging"
          >
            {tickFormat(x)}
          </text>
        {/each}
      </g>
    </svg>
  </div>
</main>

<style>
  main {
    font-family: sans-serif;
    user-select: none;
  }
  div {
    position: relative;
  }
  div svg,
  div canvas {
    position: absolute;
    left: 0;
    top: 0;
  }
  svg text {
    font-family: sans-serif;
    font-size: 10px;
  }
</style>
