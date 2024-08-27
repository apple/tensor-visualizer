# Copyright © 2024 Apple Inc. All rights reserved.
#
# Use of this source code is governed by a BSD-3-clause license that can
# be found in the LICENSE file or at https://opensource.org/licenses/BSD-3-Clause

"""A module that provides the TensorVisualizer widget"""

import base64
import zlib
import sys

import numpy as np
import anywidget
import traitlets
import pathlib
from typing import Optional

bundle_script_path = pathlib.Path(__file__).parent / "static" / "bundle.js"
with open(bundle_script_path, encoding="utf-8") as f:
    BUNDLE_URL = "data:text/javascript;base64," + base64.b64encode(
        f.read().encode("utf-8")
    ).decode("ascii")

dtype_mapping = {
    np.dtype("float16"): (np.dtype("float32"), "float32", "zlib", 4),
    np.dtype("float32"): (np.dtype("float32"), "float32", "zlib", 4),
    np.dtype("float64"): (np.dtype("float64"), "float64", "zlib", 8),
    np.dtype("int8"): (np.dtype("int8"), "int8", "zlib", None),
    np.dtype("uint8"): (np.dtype("uint8"), "uint8", "zlib", None),
    np.dtype("int16"): (np.dtype("int16"), "int16", "zlib", 2),
    np.dtype("int32"): (np.dtype("int32"), "int32", "zlib", 4),
    np.dtype("int64"): (np.dtype("int64"), "int64", "zlib", 8),
}


def tensor_to_numpy(tensor):
    if "torch" in sys.modules:
        import torch

        if isinstance(tensor, torch.Tensor):
            tensor = tensor.detach().cpu().numpy()
    if "mlx.core" in sys.modules:
        import mlx.core as mx

        if isinstance(tensor, mx.array):
            tensor = np.array(tensor)
    if "tensorflow" in sys.modules:
        import tensorflow as tf

        if isinstance(tensor, tf.Tensor):
            tensor = tensor.numpy()

    if not isinstance(tensor, np.ndarray):
        raise ValueError("expect input to be numpy array or torch tensor")

    return tensor


def tensor_to_json(input, permute):
    if input is None:
        return None
    input = tensor_to_numpy(input)
    if permute is not None:
        if len(permute) != len(input.shape):
            raise ValueError("permute must be the same length as the tensor's shape")
        input = np.transpose(input, permute)
    if input.dtype in dtype_mapping:
        target_dtype, dtype, compression, shuffle = dtype_mapping[input.dtype]
    else:
        raise ValueError(f"unsupported dtype {input.dtype}")
    binary_data = input.astype(target_dtype).flatten().tobytes()
    if shuffle is not None:
        binary_data = (
            np.frombuffer(binary_data, dtype=np.byte)
            .reshape(-1, shuffle)
            .T.flatten()
            .tobytes()
        )
    if compression == "zlib":
        binary_data = zlib.compress(binary_data, level=zlib.Z_BEST_SPEED)
    return {
        "shape": [int(x) for x in input.shape],
        "compression": compression,
        "shuffle": shuffle,
        "dtype": dtype,
        "data": base64.b64encode(binary_data).decode("ascii"),
    }


def apply_permute(array: Optional[list], permute: list[int]):
    """Apply permute to the given array"""
    if array is None:
        return None
    return [array[i] if i < len(array) else None for i in permute]


class TensorVisualizer(anywidget.AnyWidget):
    """A widget to visualize tensors as heatmaps."""

    _esm = """
    import { renderTensorVisualizer } from "__bundle_url__";
    const render = renderTensorVisualizer;
    export default { render };
    """.replace(
        "__bundle_url__", BUNDLE_URL
    )

    def __init__(
        self,
        tensor,
        names: Optional[list[str]] = None,
        labels: Optional[list[list[str]]] = None,
        default_views: Optional[list[str]] = None,
        scale_domain: Optional[list[float]] = None,
        scale_type: Optional[str] = None,
        scale_scheme: Optional[str] = None,
        permute: Optional[list[int]] = None,
    ):
        """
        Creates a tensor visualizer widget.

        @param tensor: the tensor to visualize
        @param names: the names for dimensions in the tensor
        @param labels: lists of labels for dimensions in the tensor
        @param default_views: specify the default views for each dimension, supported options are: `slice`, `small-multiples`, `min`, `max`, and `mean`
        @param scale_domain: specify the scale domain. If unspecified, the widget will infer the domain automatically.
        @param scale_type: specify the scale type (linear or log). The default is linear.
        @param scale_scheme: specify the scale color scheme. If unspecified, the widget will infer the scheme automatically.
        @param permute: permute the order of the tensor's dimensions.
        """

        tensor_data = tensor_to_json(tensor, permute=permute)
        if permute is not None:
            names = apply_permute(names, permute)
            labels = apply_permute(labels, permute)
            default_views = apply_permute(default_views, permute)

        super().__init__(
            names=names,
            labels=labels,
            scale_domain=scale_domain,
            scale_type=scale_type,
            scale_scheme=scale_scheme,
            default_views=default_views,
        )

        self.tensor_data = tensor_data

    def _handle_custom_msg(self, content: dict, buffers: list):
        """Handle custom message"""

        if content["type"] == "prop" and content["name"] == "tensor":
            self.send(
                {
                    "type": "prop",
                    "valueType": "Tensor",
                    "name": "tensor",
                    "value": self.tensor_data,
                }
            )
        elif content["type"] == "scale":
            scale = content.get("scale")
            self.current_scale_domain = scale.get("domain")
            self.current_scale_type = scale.get("type")
            self.current_scale_scheme = scale.get("scheme")

    names = traitlets.List(default_value=None, allow_none=True).tag(sync=True)
    labels = traitlets.List(default_value=None, allow_none=True).tag(sync=True)
    scale_domain = traitlets.List(default_value=None, allow_none=True).tag(sync=True)
    scale_type = traitlets.Unicode(default_value=None, allow_none=True).tag(sync=True)
    scale_scheme = traitlets.Unicode(default_value=None, allow_none=True).tag(sync=True)
    default_views = traitlets.List(default_value=None, allow_none=True).tag(sync=True)

    # Read the current scale domain (only available after the widget is shown).
    current_scale_domain = traitlets.List(default_value=None, allow_none=True).tag(
        sync=True
    )
    # Read the current scale type (only available after the widget is shown).
    current_scale_type = traitlets.Unicode(default_value=None, allow_none=True).tag(
        sync=True
    )
    # Read the current scale scheme (only available after the widget is shown).
    current_scale_scheme = traitlets.Unicode(default_value=None, allow_none=True).tag(
        sync=True
    )
