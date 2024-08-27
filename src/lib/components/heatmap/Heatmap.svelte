<!--
  Copyright © 2024 Apple Inc. All rights reserved.
  
  Use of this source code is governed by a BSD-3-clause license that can
  be found in the LICENSE file or at https://opensource.org/licenses/BSD-3-Clause
-->

<script lang="ts" context="module">
  import type { ScaleLinear } from "d3-scale";

  function measureLabelText(text: string): TextMetrics {
    return measureText(text, "12px system-ui,sans-serif");
  }

  /** Estimate maximum axis label width and height.
   * @param count the number of rows/columns.
   * @param minWidth minimum width.
   * @param minHeight minimum height.
   */
  function maximumLabelDimensions(
    count: number,
    minWidth: number,
    minHeight: number,
  ): { width: number; height: number } {
    let width: number = minWidth;
    let height: number = minHeight;
    // Round up to nearest 999s, with the assumption that 9 is the widest digit.
    let placeholder = (Math.pow(10, Math.ceil(Math.log10(count - 1))) - 1).toFixed(0);
    let m = measureLabelText(placeholder);
    width = Math.max(width, m.width);
    height = Math.max(height, m.actualBoundingBoxAscent - m.actualBoundingBoxDescent);
    width = Math.ceil(width);
    height = Math.ceil(height);
    return { width, height };
  }

  /** Returns nicely rounded integer ticks for the given scale.
   * @param plotDimension the length of the plot.
   * @param scale the scale, should be a d3 linear scale.
   */
  function ticksForScale(
    plotDimension: number,
    scale: ScaleLinear<number, number, never>,
  ): number[] {
    let ticks = scale.ticks(Math.round(plotDimension / 40)).filter((x) => Number.isInteger(x));
    if (ticks.length > 2) {
      let end = scale.domain()[1] - 0.5;
      let stepSize = ticks[1] - ticks[0];
      if (end - ticks[ticks.length - 1] < stepSize / 2) {
        ticks[ticks.length - 1] = end;
      } else {
        ticks.push(end);
      }
    }
    return ticks;
  }
</script>

<script lang="ts">
  import { scaleLinear } from "d3-scale";
  import type { Tensor } from "../../utils/Tensor.js";
  import { defaultHeatmapScale, defaultHeatmapSize, type HeatmapSpec } from "./renderer.js";
  import HeatmapCanvas from "./HeatmapCanvas.svelte";
  import HeatmapLegend from "./HeatmapLegend.svelte";
  import HeatmapLabelDisplay from "./HeatmapLabelDisplay.svelte";
  import { measureText } from "../../utils/text_measurements.js";

  export let matrix: Tensor;
  export let spec: HeatmapSpec | undefined = undefined;

  const tickLength = 4; // Tick length.
  const tickPreGap = 1; // Gap between matrix and tick.
  const tickPostGap = 3; // Gap between label and tick.
  const tickTotal = tickLength + tickPreGap + tickPostGap;

  $: labelDimensions = maximumLabelDimensions(matrix.shape[0], 30, 0);

  $: hasXAxis = spec?.xAxis !== null;
  $: hasYAxis = spec?.yAxis !== null;
  $: hasXAxisTitle = spec?.xAxis?.title !== null;
  $: hasYAxisTitle = spec?.yAxis?.title !== null;
  $: paddingForYAxis = hasYAxis
    ? labelDimensions.width + tickTotal + 4 + (hasYAxisTitle ? labelDimensions.height + 4 : 0)
    : 0;
  $: paddingForXAxis = hasXAxis
    ? labelDimensions.height + tickTotal + 4 + (hasXAxisTitle ? labelDimensions.height + 4 : 0)
    : 0;

  $: paddingLeft = spec?.padding?.left ?? paddingForYAxis;
  $: paddingTop = spec?.padding?.top ?? paddingForXAxis;

  $: paddingRight = spec?.padding?.right ?? Math.max(4, Math.ceil(labelDimensions.width / 2));
  $: paddingBottom = spec?.padding?.bottom ?? Math.max(12, Math.ceil(labelDimensions.height / 2));

  $: defaultPlotSize = defaultHeatmapSize(matrix.shape);
  $: plotWidth = spec?.width ?? defaultPlotSize.width;
  $: plotHeight = spec?.height ?? defaultPlotSize.height;

  $: viewWidth = plotWidth + paddingLeft + paddingRight;
  $: viewHeight = plotHeight + paddingTop + paddingBottom;

  $: heatmapScale = defaultHeatmapScale(matrix, spec?.scale);

  $: xScale = scaleLinear([-0.5, matrix.shape[1] - 0.5], [0, plotWidth]);
  $: yScale = scaleLinear([-0.5, matrix.shape[0] - 0.5], [0, plotHeight]);

  $: xTicks = ticksForScale(plotWidth, xScale);
  $: yTicks = ticksForScale(plotHeight, yScale);

  let canvasContainer: HTMLDivElement;
  let cursor: { x: number; y: number } | null = null;
  let cursorFreeze: boolean = false;

  function coordinates(e: MouseEvent): { x: number; y: number } | null {
    let x = e.clientX - canvasContainer.getBoundingClientRect().x - paddingLeft;
    let y = e.clientY - canvasContainer.getBoundingClientRect().y - paddingTop;
    x = Math.round(xScale.invert(x));
    y = Math.round(yScale.invert(y));
    if (x >= 0 && x < matrix.shape[1] && y >= 0 && y < matrix.shape[0]) {
      return { x, y };
    } else {
      return null;
    }
  }

  function canvasMouseMove(e: MouseEvent) {
    if (!cursorFreeze) {
      cursor = coordinates(e);
    }
  }

  function canvasMouseEnter(e: MouseEvent) {
    if (!cursorFreeze) {
      cursor = coordinates(e);
    }
  }

  function canvasMouseLeave(e: MouseEvent) {
    if (!cursorFreeze) {
      cursor = null;
    }
  }

  function canvasMouseDown(e: MouseEvent) {
    if (cursorFreeze) {
      cursor = null;
      cursorFreeze = false;
    } else if (cursor != null) {
      cursorFreeze = true;
    }
  }
</script>

<main>
  <div
    class="heatmap"
    style:width="{viewWidth}px"
    style:height="{viewHeight}px"
    style:position="relative"
  >
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div
      bind:this={canvasContainer}
      role="figure"
      style:width="{plotWidth}px"
      style:height="{plotHeight}px"
      style:padding="{paddingTop}px {paddingRight}px {paddingBottom}px {paddingLeft}px"
      on:mousemove={canvasMouseMove}
      on:mouseenter={canvasMouseEnter}
      on:mouseleave={canvasMouseLeave}
      on:mousedown={canvasMouseDown}
    >
      <HeatmapCanvas matrix={matrix} width={plotWidth} height={plotHeight} scale={heatmapScale} />
    </div>
    <svg
      width={viewWidth}
      height={viewHeight}
      style:position="absolute"
      style:left="0"
      style:top="0"
      style:pointer-events="none"
      style:user-select="none"
    >
      <g transform="translate({paddingLeft},{paddingTop})">
        <!-- Axes -->
        <g>
          {#if hasXAxis}
            {#each xTicks as value}
              {@const x = xScale(value)}
              <line
                x1={x}
                x2={x}
                y1={-tickPreGap}
                y2={-tickPreGap - tickLength}
                style:stroke="black"
              />
              <text
                x={x}
                y={-tickTotal}
                style:text-anchor="middle"
                style:dominant-baseline="bottom"
              >
                {value}
              </text>
            {/each}
            {#if hasXAxisTitle}
              <text
                x={plotWidth / 2}
                y={-tickTotal - labelDimensions.height - 4}
                style:text-anchor="middle"
              >
                {spec?.xAxis?.title ?? "column"}
              </text>
            {/if}
          {/if}
          {#if hasYAxis}
            {#each yTicks as value}
              {@const y = yScale(value)}
              <line
                x1={-tickPreGap}
                x2={-tickPreGap - tickLength}
                y1={y}
                y2={y}
                style:stroke="black"
              />
              <text
                x={-tickPreGap - tickLength - tickPostGap}
                y={y}
                style:text-anchor="end"
                style:dominant-baseline="middle"
              >
                {value}
              </text>
            {/each}
            {#if hasYAxisTitle}
              <text
                x={-plotHeight / 2}
                y={-tickTotal - labelDimensions.width - 4}
                transform="rotate(-90)"
                style:text-anchor="middle"
                style:dominant-baseline="hanging"
              >
                {spec?.yAxis?.title ?? "row"}
              </text>
            {/if}
          {/if}
        </g>
        <!-- Cursor -->
        {#if cursor != null}
          {@const x = xScale(cursor.x)}
          {@const y = yScale(cursor.y)}
          <line x1={x} x2={x} y1={0} y2={plotHeight} style:stroke="white" />
          <line
            x1={x}
            x2={x}
            y1={0}
            y2={plotHeight}
            style:stroke="black"
            style:stroke-dasharray="1 1"
          />
          <line x1={0} x2={plotWidth} y1={y} y2={y} style:stroke="white" />
          <line
            x1={0}
            x2={plotWidth}
            y1={y}
            y2={y}
            style:stroke="black"
            style:stroke-dasharray="1 1"
          />
          {#if hasXAxis && hasYAxis}
            {@const xLabel = cursor.x.toFixed(0)}
            {@const yLabel = cursor.y.toFixed(0)}
            {@const xBoxWidth = Math.max(12, measureLabelText(xLabel).width) + 8}
            {@const yBoxWidth = Math.max(12, measureLabelText(yLabel).width) + tickTotal + 2}
            <rect
              x={x - xBoxWidth / 2}
              y={-labelDimensions.height - tickTotal - 4}
              width={xBoxWidth}
              height={labelDimensions.height + tickTotal + 4}
              style:fill="#f0f0f0"
            />
            <rect
              x={-yBoxWidth - 1}
              y={y - 10}
              width={yBoxWidth}
              height={20}
              style:fill="#f0f0f0"
            />
            <line
              x1={x}
              x2={x}
              y1={-tickPreGap}
              y2={-tickPreGap - tickLength}
              style:stroke="black"
            />
            <text
              x={x}
              y={-tickTotal}
              style:font-weight="bold"
              style:text-anchor="middle"
              style:dominant-baseline="bottom"
            >
              {xLabel}
            </text>
            <line
              x1={-tickPreGap}
              x2={-tickPreGap - tickLength}
              y1={y}
              y2={y}
              style:stroke="black"
            />
            <text
              x={-tickTotal}
              y={y}
              style:font-weight="bold"
              style:text-anchor="end"
              style:dominant-baseline="middle"
            >
              {yLabel}
            </text>
          {/if}
        {/if}
      </g>
    </svg>
    {#if cursor != null}
      <div
        class="tooltip"
        style:left="{xScale(cursor.x) + paddingLeft + 5}px"
        style:bottom="{plotHeight - yScale(cursor.y) + paddingBottom + 10}px"
      >
        <div>
          {spec?.xAxis?.title ?? "column"}: {cursor.x}
          {#if spec?.xLabels}
            <HeatmapLabelDisplay labels={spec?.xLabels ?? []} index={cursor.x} />
          {/if}
        </div>
        <div>
          {spec?.yAxis?.title ?? "row"}: {cursor.y}
          {#if spec?.yLabels}
            <HeatmapLabelDisplay labels={spec?.yLabels ?? []} index={cursor.y} />
          {/if}
        </div>
        <div>value: {matrix.at(cursor.y, cursor.x).toFixed(5)}</div>
      </div>
    {/if}
  </div>
  {#if spec?.legend !== null}
    <HeatmapLegend
      scale={heatmapScale}
      padding={{ left: paddingLeft, right: paddingRight }}
      width={Math.min(200, plotWidth)}
    />
  {/if}
</main>

<style>
  main {
    font-family: system-ui, sans-serif;
    font-size: 12px;
  }

  .heatmap .tooltip {
    position: absolute;
    background: white;
    border: 1px solid black;
    padding: 3px;
    pointer-events: none;
    min-width: 250px;
    max-width: 400px;
    z-index: 10;
    line-height: 20px;
  }

  svg text {
    font-family: system-ui, sans-serif;
    font-size: 12px;
  }
</style>
