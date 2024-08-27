<!--
  Copyright © 2024 Apple Inc. All rights reserved.
  
  Use of this source code is governed by a BSD-3-clause license that can
  be found in the LICENSE file or at https://opensource.org/licenses/BSD-3-Clause
-->

<script lang="ts">
  import type { Tensor } from "../utils/Tensor.js";
  import type { HeatmapSpec } from "./heatmap/index.js";
  import type { DimensionState } from "./TensorSlicer.svelte";
  import Heatmap from "./heatmap/Heatmap.svelte";

  export let tensor: Tensor;
  export let dimensions: DimensionState[];
  export let spec: HeatmapSpec;
</script>

{#if dimensions.length == 0}
  <Heatmap matrix={tensor} spec={spec} />
{:else if dimensions[0].type == "slice"}
  <figure>
    <svelte:self
      tensor={tensor.get(dimensions[0].slice)}
      dimensions={dimensions.slice(1)}
      spec={spec}
    />
  </figure>
{:else if dimensions[0].type == "max" || dimensions[0].type == "min" || dimensions[0].type == "mean"}
  <figure>
    <svelte:self tensor={tensor.get(0)} dimensions={dimensions.slice(1)} spec={spec} />
  </figure>
{:else if dimensions[0].type == "small-multiples"}
  <ul
    class:is-small-multiples={true}
    class:has-nested-small-multiples={dimensions.slice(1).some((x) => x.type == "small-multiples")}
  >
    {#each { length: tensor.shape[0] } as _, index}
      <li>
        <h4>{dimensions[0].name}: {index}</h4>
        <figure>
          <svelte:self tensor={tensor.get(index)} dimensions={dimensions.slice(1)} spec={spec} />
        </figure>
      </li>
    {/each}
  </ul>
{/if}

<style>
  figure {
    padding: 0;
    margin: 0;
  }

  ul {
    list-style-type: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
  }

  h4 {
    font-weight: normal;
    font-size: 14px;
    font-family: sans-serif;
    margin: 0;
    padding: 0;
  }

  ul.is-small-multiples {
    display: flex;
    flex-direction: row;
    gap: 10px;
  }

  ul.has-nested-small-multiples > li > figure {
    padding: 4px;
  }

  ul.has-nested-small-multiples > li > h4 {
    font-weight: bold;
    background: rgba(0, 0, 0, 0.1);
    padding: 4px;
  }
</style>
