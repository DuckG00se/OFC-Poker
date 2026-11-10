/// <reference lib="webworker" />
import { chooseTurn } from './choose';
import type { AiRequest, AiResponse } from './protocol';

/** Runs the CPU's thinking off the main thread so the UI never freezes. */
self.onmessage = (event: MessageEvent<AiRequest>) => {
  const { id, view, difficulty, seed } = event.data;
  let response: AiResponse;
  try {
    response = { id, ok: true, plan: chooseTurn(view, { difficulty, seed }) };
  } catch (error) {
    response = { id, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  self.postMessage(response);
};
