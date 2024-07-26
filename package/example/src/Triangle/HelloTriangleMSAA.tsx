import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Canvas, gpu } from "react-native-webgpu";
import type { CanvasRef } from "react-native-webgpu";

import { redFragWGSL, triangleVertWGSL } from "./triangle";

export function HelloTriangleMSAA() {
  const ref = useRef<CanvasRef>(null);

  async function demo() {
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      throw new Error("No adapter");
    }
    const device = await adapter.requestDevice();
    const presentationFormat = gpu.getPreferredCanvasFormat();

    const context = ref.current!.getContext("webgpu")!;
    const { canvas } = context;
    if (!context) {
      throw new Error("No context");
    }
    context.configure({
      device,
      format: presentationFormat,
      alphaMode: "premultiplied",
    });

    const sampleCount = 4;

    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: device.createShaderModule({
          code: triangleVertWGSL,
        }),
      },
      fragment: {
        module: device.createShaderModule({
          code: redFragWGSL,
        }),
        targets: [
          {
            format: presentationFormat,
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
      },
      multisample: {
        count: sampleCount,
      },
    });

    const texture = device.createTexture({
      size: [canvas.width, canvas.height],
      sampleCount,
      format: presentationFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const view = texture.createView();

    function frame() {
      const commandEncoder = device.createCommandEncoder();

      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            view,
            resolveTarget: context.getCurrentTexture().createView(),
            clearValue: [0, 0, 0, 1],
            loadOp: "clear",
            storeOp: "discard",
          },
        ],
      };

      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(pipeline);
      passEncoder.draw(3);
      passEncoder.end();

      device.queue.submit([commandEncoder.finish()]);
    }

    frame();
    context.present();
  }

  useEffect(() => {
    demo();
  }, [ref]);

  return (
    <View style={style.container}>
      <Canvas ref={ref} style={style.webgpu} />
    </View>
  );
}

const style = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "red",
  },
  webgpu: {
    flex: 1,
  },
});
