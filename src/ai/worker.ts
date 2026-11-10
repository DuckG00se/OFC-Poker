/// <reference lib="webworker" />
import { runJob } from './jobs';
import type { AiRequest, AiResponse } from './protocol';

/** Runs the CPU's thinking (and the player's foul-risk estimate) off the main thread. */
self.onmessage = (event: MessageEvent<AiRequest>) => {
  const { id, job } = event.data;
  let response: AiResponse;
  try {
    response = { id, ok: true, result: runJob(job) };
  } catch (error) {
    response = { id, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  self.postMessage(response);
};
