// Copyright © 2024 Apple Inc. All rights reserved.
//
// Use of this source code is governed by a BSD-3-clause license that can
// be found in the LICENSE file or at https://opensource.org/licenses/BSD-3-Clause

import { inflate } from "pako";

export type TensorDType =
  | "float32"
  | "float64"
  | "int8"
  | "uint8"
  | "int16"
  | "uint16"
  | "int32"
  | "uint32";

export interface TensorJSON {
  shape: number[];
  data: string;
  dtype: TensorDType;
  shuffle?: number;
  compression?: "zlib";
}

function base64StringToUint8Array(string: string): Uint8Array {
  let binary = atob(string);
  let bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

type TensorStorage =
  | Float32Array
  | Float64Array
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array;

export interface TensorExtents {
  min: number;
  max: number;
  minPositive: number;
}

export class Tensor {
  public readonly shape: number[];
  public readonly strides: number[];
  public readonly dtype: TensorDType;
  public readonly storage: TensorStorage;

  /** Create a tensor.
   * @param shape the tensor's shape, e.g., [10, 10, 20, 10].
   * @param dtype the data type, e.g., float32.
   * @param buffer an ArrayBuffer-like object that stores the binary data of the tensor.
   */
  constructor(shape: number[], dtype: TensorDType, buffer?: ArrayBufferLike) {
    this.shape = shape;
    this.dtype = dtype;
    this.strides = [];
    let stride = 1;
    for (let i = shape.length - 1; i >= 0; i--) {
      this.strides.unshift(stride);
      stride *= this.shape[i];
    }
    let length = stride;
    switch (dtype) {
      case "int8":
        this.storage = buffer == null ? new Int8Array(length) : new Int8Array(buffer);
        break;
      case "uint8":
        this.storage = buffer == null ? new Uint8Array(length) : new Uint8Array(buffer);
        break;
      case "int16":
        this.storage = buffer == null ? new Int16Array(length) : new Int16Array(buffer);
        break;
      case "uint16":
        this.storage = buffer == null ? new Uint16Array(length) : new Uint16Array(buffer);
        break;
      case "int32":
        this.storage = buffer == null ? new Int32Array(length) : new Int32Array(buffer);
        break;
      case "uint32":
        this.storage = buffer == null ? new Uint32Array(length) : new Uint32Array(buffer);
        break;
      case "float32":
        this.storage = buffer == null ? new Float32Array(length) : new Float32Array(buffer);
        break;
      case "float64":
        this.storage = buffer == null ? new Float64Array(length) : new Float64Array(buffer);
        break;
      default:
        throw new Error("unknown data type " + dtype);
    }
  }

  /** Create a tensor from JSON data. */
  static fromJSON(json: TensorJSON): Tensor {
    let bytes = base64StringToUint8Array(json.data);
    switch (json.compression) {
      case "zlib":
        bytes = inflate(bytes);
        break;
    }
    if (json.shuffle != null) {
      let arrayData = new Uint8Array(bytes.length);
      let k = json.shuffle;
      let n = bytes.length / k;
      for (let i = 0; i < bytes.length; i += k) {
        let p = i / k;
        for (let j = 0; j < k; j++) {
          arrayData[i + j] = bytes[p + n * j];
        }
      }
      bytes = arrayData;
    }
    return new Tensor(json.shape, json.dtype, bytes.buffer);
  }

  offset(...indices: number[]) {
    let offset = 0;
    let strides = this.strides;
    for (let i = 0; i < strides.length; i++) {
      offset += indices[i] * strides[i];
    }
    return offset;
  }

  at(...indices: number[]): number {
    return this.storage[this.offset(...indices)];
  }

  get(...indices: number[]) {
    let result: Tensor = this;
    for (let index of indices) {
      result = result.sliceFirstDimension(index);
    }
    return result;
  }

  extents(): TensorExtents {
    let minPositive = 0;
    let min = Infinity;
    let max = -Infinity;
    let storage = this.storage;
    for (let i = 0; i < storage.length; i++) {
      let v = this.storage[i];
      if (v < min) {
        min = v;
      }
      if (v > 0 && v < minPositive) {
        minPositive = v;
      }
      if (v > max) {
        max = v;
      }
    }
    return { min, max, minPositive };
  }

  clone(): Tensor {
    let sliced = this.storage.slice();
    return new Tensor(this.shape.slice(), this.dtype, sliced.buffer);
  }

  private sliceFirstDimension(index: number): Tensor {
    let count = this.storage.length / this.shape[0];
    let start = index * count;
    return new Tensor(this.shape.slice(1), this.dtype, this.storage.subarray(start, start + count));
  }

  /** Perform a reduce operation at a given dimension, return the resulting tensor.
   * @param dimension the index to the dimension to reduce.
   * @param operation the reduce operation.
   * @returns a tensor where the given dimension is reduced.
   */
  reduce(
    dimension: number,
    operation: (a: number, b: number) => number,
    dtype?: TensorDType
  ): Tensor {
    let count = this.shape[dimension];
    let stride = 1;
    for (let i = this.shape.length - 1; i > dimension; i--) {
      stride *= this.shape[i];
    }
    let resultShape = this.shape.slice();
    resultShape[dimension] = 1;
    let result = new Tensor(resultShape, dtype ?? this.dtype);
    let destOffset = 0;
    let srcOffset = 0;
    while (destOffset < result.storage.length) {
      let target = result.storage.subarray(destOffset, destOffset + stride);
      for (let i = 0; i < count; i++) {
        let si = this.storage.subarray(srcOffset, srcOffset + stride);
        if (i == 0) {
          target.set(si);
        } else {
          for (let j = 0; j < stride; j++) {
            target[j] = operation(target[j], si[j]);
          }
        }
        srcOffset += stride;
      }
      destOffset += stride;
    }
    return result;
  }

  sum(dimension: number): Tensor {
    return this.reduce(dimension, (a, b) => a + b);
  }

  mean(dimension: number): Tensor {
    let len = this.shape[dimension];
    let result = this.sum(dimension);
    for (let i = 0; i < result.storage.length; i++) {
      result.storage[i] /= len;
    }
    return result;
  }

  min(dimension: number): Tensor {
    return this.reduce(dimension, (a, b) => Math.min(a, b));
  }

  max(dimension: number): Tensor {
    return this.reduce(dimension, (a, b) => Math.max(a, b));
  }
}
