<!--
  Copyright © 2024 Apple Inc. All rights reserved.
  
  Use of this source code is governed by a BSD-3-clause license that can
  be found in the LICENSE file or at https://opensource.org/licenses/BSD-3-Clause
-->

<script lang="ts">
  export let labels: (string | undefined)[];
  export let index: number;

  $: beforeText = labels.slice(Math.max(0, index - 5), index).join(", ");
  $: afterText = labels.slice(index + 1, index + 6).join(", ");
</script>

<span class="container">
  <span class="is-before"><span>{beforeText}</span></span>
  <span class="is-center">{labels[index] ?? index}</span>
  <span class="is-after"><span>{afterText}</span></span>
</span>

<style>
  .container {
    white-space: nowrap;
  }

  span.is-before,
  span.is-after {
    position: relative;
    color: #888;
    font-size: 0.7em;
    width: 8em;
    height: 1em;
    line-height: 1em;
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
  }

  span.is-before {
    position: relative;
  }

  span.is-after > span,
  span.is-before > span {
    display: inline-block;
    position: absolute;
    bottom: 0;
    top: 0;
  }
  span.is-before > span {
    right: 0;
  }
  span.is-after > span {
    left: 0;
  }

  span.is-center {
    padding: 2px 5px;
    margin-left: 2px;
    margin-right: 2px;
    background: #f0f0f0;
    color: #000;
    font-size: 1em;
  }
</style>
