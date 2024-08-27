<!--
  Copyright © 2024 Apple Inc. All rights reserved.
  
  Use of this source code is governed by a BSD-3-clause license that can
  be found in the LICENSE file or at https://opensource.org/licenses/BSD-3-Clause
-->

<script lang="ts">
  import { afterUpdate } from "svelte";
  import { renderHeatmapIntoCanvas, type ResolvedHeatmapScale } from "./renderer.js";
  import type { Tensor } from "../../utils/Tensor.js";

  export let matrix: Tensor;
  export let width: number = 500;
  export let height: number = 500;
  export let scale: ResolvedHeatmapScale;

  let canvas: HTMLCanvasElement;

  afterUpdate(() => {
    renderHeatmapIntoCanvas(canvas, matrix, scale);
  });
</script>

<canvas
  bind:this={canvas}
  width={matrix.shape[1]}
  height={matrix.shape[0]}
  style:width="{width}px"
  style:height="{height}px"
  style:image-rendering="pixelated"
  style:background="gray"
/>
