/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const hook = body.hook?.trim();

    if (!hook) {
      return NextResponse.json(
        { error: "Missing required field: hook" },
        { status: 400 }
      );
    }
    
    const replicateToken = process.env.REPLICATE_API_TOKEN;

    // 1. Create the prediction
    const createRes = await fetch("https://api.replicate.com/v1/models/tencent/hunyuan-video/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          prompt: "Cinematic 2-3 second vertical video 9:16, dynamic motion, no text, vibrant colors: " + hook,
          width: 544,
          height: 960,
          num_frames: 61,
          fps: 24
        }
      })
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => null);
      throw new Error(err?.detail || "Failed to create Replicate prediction.");
    }

    const prediction = await createRes.json();
    const pollUrl = prediction.urls.get;

    // 2. Poll the prediction
    let status = prediction.status;
    let outputUrl = null;
    let pollCount = 0;
    const maxPolls = 60; // 3 mins max

    while (status !== "succeeded" && status !== "failed" && status !== "canceled" && pollCount < maxPolls) {
      pollCount++;
      
      // Wait 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));

      const pollRes = await fetch(pollUrl, {
        headers: {
          Authorization: `Token ${replicateToken}`,
        }
      });

      if (!pollRes.ok) {
        throw new Error("Failed to poll Replicate prediction status.");
      }

      const pollData = await pollRes.json();
      status = pollData.status;

      if (status === "succeeded") {
        outputUrl = pollData.output[0];
      }
    }

    if (status !== "succeeded") {
      throw new Error(`Prediction timed out or ended with status: ${status}`);
    }

    // Return exact specified response
    return NextResponse.json({ videoUrl: outputUrl });

  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}
