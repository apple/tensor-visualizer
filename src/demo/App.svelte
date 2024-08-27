<!--
  Copyright © 2024 Apple Inc. All rights reserved.
  
  Use of this source code is governed by a BSD-3-clause license that can
  be found in the LICENSE file or at https://opensource.org/licenses/BSD-3-Clause
-->

<script lang="ts">
  import { Tensor } from "../lib/utils/Tensor.js";
  import TensorVisualizer from "../lib/widgets/TensorVisualizer.svelte";

  let rows: number = 10;
  let cols: number = 10;

  function makeRandomTensor(shape: number[]) {
    let length = shape.reduce((a, b) => a * b, 1);
    let data = new Float32Array(length);
    let v = 0.5;
    for (let i = 0; i < data.length; i++) {
      v = v * 0.9 + Math.random() * 0.1;
      data[i] = v;
    }
    return new Tensor(shape, "float32", data);
  }

  function makeNumberedList(prefix: string, count: number): string[] {
    let result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(`${prefix}${i}`);
    }
    return result;
  }
</script>

<h1>TensorVisualizer</h1>

<input type="range" min={1} max={1000} bind:value={rows} />
<input type="range" min={1} max={1000} bind:value={cols} />

<TensorVisualizer
  tensor={makeRandomTensor([20, 10, rows, cols])}
  names={["batch", "trial", "height", "width"]}
  labels={[
    makeNumberedList("b", 20),
    makeNumberedList("t", 10),
    makeNumberedList("row ", rows),
    makeNumberedList("col ", cols),
  ]}
/>
