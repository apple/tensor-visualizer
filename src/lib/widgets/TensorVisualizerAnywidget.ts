// Copyright © 2024 Apple Inc. All rights reserved.
//
// Use of this source code is governed by a BSD-3-clause license that can
// be found in the LICENSE file or at https://opensource.org/licenses/BSD-3-Clause

import { Tensor } from "../utils/Tensor.js";
import TensorVisualizer from "./TensorVisualizer.svelte";

export interface AnywidgetModel {
  get(name: string): any;
  on(event: "msg:custom", callback: (content: any, buffers: DataView[]) => void): void;
  on<K extends `change:${string}`>(event: K, callback: () => void): void;
  send(content: any, callbacks?: any, buffers?: ArrayBuffer[] | ArrayBufferView[]): void;
}

export function renderTensorVisualizer(context: { model: AnywidgetModel; el: HTMLElement }) {
  let model = context.model;

  let getProps = () => ({
    names: model.get("names"),
    labels: model.get("labels"),
    defaultViews: model.get("default_views"),
    scale: {
      domain: model.get("scale_domain"),
      type: model.get("scale_type"),
      scheme: model.get("scale_scheme"),
    },
  });

  let component: TensorVisualizer = new TensorVisualizer({
    target: context.el,
    props: getProps(),
  });

  let updateProps = () => {
    component.$set(getProps());
  };

  model.on("change:scale_domain", updateProps);
  model.on("change:scale_type", updateProps);
  model.on("change:scale_scheme", updateProps);
  model.on("change:names", updateProps);
  model.on("change:labels", updateProps);

  // Tell the kernel when scale is changed.
  component.$on("scale", (e) => {
    model.send({ type: "scale", scale: e.detail });
  });

  // Ask for the tensor.
  model.on("msg:custom", (content, buffers) => {
    if (content.type == "prop") {
      let value = content.value;
      switch (content.valueType) {
        case "Tensor":
          value = Tensor.fromJSON(value);
          break;
      }
      component?.$set({ [content.name]: value });
    }
  });
  model.send({ type: "prop", name: "tensor" });

  return () => {
    component?.$destroy();
  };
}
