// Copyright © 2024 Apple Inc. All rights reserved.
//
// Use of this source code is governed by a BSD-3-clause license that can
// be found in the LICENSE file or at https://opensource.org/licenses/BSD-3-Clause

let canvas = document.createElement("canvas");
let context = canvas.getContext("2d")!;

export function measureText(text: string, font: string): TextMetrics {
  context.font = font;
  return context.measureText(text)!;
}
