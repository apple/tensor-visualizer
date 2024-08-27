<!--
  Copyright © 2024 Apple Inc. All rights reserved.
  
  Use of this source code is governed by a BSD-3-clause license that can
  be found in the LICENSE file or at https://opensource.org/licenses/BSD-3-Clause
-->

<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Tensor } from "../utils/Tensor.js";
  import type { HeatmapSpec } from "../components/heatmap/renderer.js";
  import TensorSlicer, { type DimensionState } from "../components/TensorSlicer.svelte";

  let dispatcher = createEventDispatcher();

  // Widget properties:
  export let tensor: Tensor | undefined = undefined;
  export let names: (string | undefined)[] | undefined = undefined;
  export let labels: (string[] | undefined)[] | undefined = undefined;
  export let scale: HeatmapSpec["scale"] | undefined = undefined;
  export let defaultViews: (DimensionState["type"] | undefined)[] | undefined = undefined;

  function handleScale(e: CustomEvent) {
    dispatcher("scale", e.detail);
  }
</script>

<main>
  {#if tensor != null}
    <TensorSlicer
      tensor={tensor}
      names={names}
      labels={labels}
      scale={scale}
      defaultViews={defaultViews}
      on:scale={handleScale}
    />
  {:else}
    <p>Loading tensor data...</p>
  {/if}
</main>

<style>
  main {
    font-family: system-ui, sans-serif;
  }
</style>
