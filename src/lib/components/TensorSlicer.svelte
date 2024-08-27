<!--
  Copyright © 2024 Apple Inc. All rights reserved.
  
  Use of this source code is governed by a BSD-3-clause license that can
  be found in the LICENSE file or at https://opensource.org/licenses/BSD-3-Clause
-->

<script lang="ts" context="module">
  export interface DimensionSpec {
    /** The title of the dimension. */
    title?: string;
    labels?: string[];
  }
  export interface DimensionState {
    name: string;
    type: "slice" | "small-multiples" | "max" | "mean" | "min";
    labels?: string[];
    slice: number;
  }

  let cachedDisplayTensors = new WeakMap<Tensor, { key: string; result: Tensor }>();

  function computeDisplayTensor(tensor: Tensor, dimensionStates: DimensionState[]): Tensor {
    let result = tensor;
    let key = dimensionStates.map((x) => x.type).join(",");
    if (cachedDisplayTensors.has(tensor)) {
      let r = cachedDisplayTensors.get(tensor)!;
      if (r.key == key) {
        return r.result;
      }
    }
    for (let i = 0; i < dimensionStates.length; i++) {
      switch (dimensionStates[i].type) {
        case "max":
          result = result.max(i);
          break;
        case "mean":
          result = result.mean(i);
          break;
        case "min":
          result = result.min(i);
          break;
        case "slice":
          break;
        case "small-multiples":
          break;
      }
    }
    cachedDisplayTensors.set(tensor, { key, result });
    return result;
  }
</script>

<script lang="ts">
  import { afterUpdate, beforeUpdate, createEventDispatcher } from "svelte";
  import type { Tensor } from "../utils/Tensor.js";
  import { colorSchemeNames } from "../utils/color_schemes.js";
  import { defaultHeatmapScale, type HeatmapSpec } from "./heatmap/renderer.js";
  import HeatmapLegend from "./heatmap/HeatmapLegend.svelte";
  import HeatmapLabelDisplay from "./heatmap/HeatmapLabelDisplay.svelte";
  import TensorSlicerDisplay from "./TensorSlicerDisplay.svelte";

  export let tensor: Tensor;
  export let names: (string | undefined)[] | undefined = undefined;
  export let labels: (string[] | undefined)[] | undefined = undefined;
  export let defaultViews: (DimensionState["type"] | undefined)[] | undefined = undefined;
  export let scale: HeatmapSpec["scale"] | undefined = undefined;

  let currentScheme: string | undefined = undefined;
  let currentScaleType: "linear" | "log" = "linear";
  let showAxes: boolean = true;

  export let dimensionStates: DimensionState[] = [];

  if (dimensionStates == undefined || dimensionStates.length != tensor.shape.length - 2) {
    dimensionStates = new Array(tensor.shape.length - 2);
    for (let i = 0; i < dimensionStates.length; i++) {
      let name = names?.[i] ?? `Dimension ${i}`;
      dimensionStates[i] = {
        name: name,
        labels: labels?.[i],
        type: defaultViews?.[i] ?? "slice",
        slice: 0,
      };
    }
  }

  $: displayTensor = computeDisplayTensor(tensor, dimensionStates);
  $: heatmapScale = defaultHeatmapScale(tensor, {
    ...scale,
    scheme: currentScheme,
    type: currentScaleType,
  });
  $: hasSmallMultiples = dimensionStates.some((x) => x.type == "small-multiples");

  beforeUpdate(() => {
    if (scale?.type != undefined) {
      currentScaleType = scale?.type;
    }
    if (scale?.scheme != undefined) {
      currentScheme = scale?.scheme;
    }
  });

  const dispatch = createEventDispatcher();
  afterUpdate(() => {
    dispatch("scale", heatmapScale);
  });
</script>

<main>
  {#each dimensionStates as dimension, index}
    <div style="margin-bottom: 0.25em">
      <label style="display: flex; flex-direction: row; gap: 0.25em; align-items: center;">
        <span style:width="100px">{dimension.name}</span>
        <select bind:value={dimension.type}>
          <option value="slice">Slice</option>
          <option value="small-multiples">Small Multiples</option>
          <option value="mean">Mean</option>
          <option value="min">Min</option>
          <option value="max">Max</option>
        </select>
        {#if dimension.type == "slice"}
          <input
            type="range"
            min={0}
            max={tensor.shape[index] - 1}
            style="width: 20em"
            bind:value={dimension.slice}
          />
          <span style:display="inline-block" style:width="40px">{dimension.slice}</span>
          {#if dimension.labels}
            <HeatmapLabelDisplay labels={dimension.labels} index={dimension.slice} />
          {/if}
        {/if}
      </label>
    </div>
  {/each}

  <div
    style="margin-bottom: 0.25em; display: flex; flex-direction: row; gap: 0.25em; align-items: center; user-select: none;"
  >
    {#if scale?.scheme == undefined}
      <label style="display: flex; gap: 0.25em; align-items: center;">
        <span>Scheme:</span>
        <select bind:value={currentScheme}>
          <option value={null}>Auto</option>
          {#each colorSchemeNames as name}
            <option value={name.toLowerCase()}>{name}</option>
          {/each}
        </select>
      </label>
    {/if}
    {#if scale?.type == undefined}
      <label style="display: flex; gap: 0.25em; align-items: center;">
        <span>Scale:</span>
        <select bind:value={currentScaleType}>
          <option value={null}>Auto</option>
          <option value="linear">Linear</option>
          <option value="log">Log</option>
        </select>
      </label>
    {/if}
    <label style="display: flex; gap: 0.25em; align-items: center;">
      <span>Axes:</span>
      <input type="checkbox" bind:checked={showAxes} />
    </label>
  </div>

  <div>
    <TensorSlicerDisplay
      tensor={displayTensor}
      dimensions={dimensionStates}
      spec={{
        scale: heatmapScale,
        ...(hasSmallMultiples ? { width: 200, height: 200, legend: null } : {}),
        xAxis: showAxes
          ? {
              title: hasSmallMultiples ? null : names?.[names.length - 1] ?? undefined,
            }
          : null,
        yAxis: showAxes
          ? {
              title: hasSmallMultiples ? null : names?.[names.length - 2] ?? undefined,
            }
          : null,
        xLabels: labels?.[tensor.shape.length - 1],
        yLabels: labels?.[tensor.shape.length - 2],
      }}
    />
    {#if hasSmallMultiples}
      <HeatmapLegend
        scale={heatmapScale}
        padding={{ left: 30, right: 30 }}
        width={Math.min(300, 200)}
      />
    {/if}
  </div>
</main>
