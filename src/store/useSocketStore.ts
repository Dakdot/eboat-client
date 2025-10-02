/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

type WebSocketState = {
  data: any[];
  logs: any[];
  alarms: any[];
  latencies: any[];
  ws: WebSocket | null;
  connect: () => void;
  disconnect: () => void;
};

export const useSocketStore = create<WebSocketState>((set, get) => ({
  data: [],
  logs: [],
  alarms: [],
  latencies: [],
  ws: null,

  connect: () => {
    if (get().ws) return;

    const ws = new WebSocket("wss://eboat.thiagoja.com/api");

    // send a ping object every 3 seconds (include timestamp so server can pong back)
    const ping = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "ping",
            timestamp: Date.now().toString(),
          })
        );
      }
    };
    const pingInterval = setInterval(ping, 3000);

    // ensure the interval is cleared and store cleared when the socket closes
    ws.addEventListener("close", () => {
      clearInterval(pingInterval);
      set({ ws: null });
    });

    ws.onopen = () => {
      console.log(`Connected to WebSocket on ${ws.url}`);
      ping();
      ws.send(
        JSON.stringify({
          type: "ident",
          message: "client",
        })
      );
    };

    ws.onmessage = (e) => {
      const parsed = JSON.parse(e.data);

      const type = parsed.type;

      if (type === "pong") {
        const startTime = parseInt(parsed.timestamp);
        const delta = Date.now() - startTime;
        set((state) => ({
          latencies: [delta, ...state.latencies].slice(0, 30),
        }));
      }

      if (type === "data") {
        set((state) => ({ data: [parsed.payload, ...state.data].slice(-500) }));
      }

      if (type === "alarm") {
        const alarm = {
          ...parsed.payload,
          acknowledged: false,
          timestamp: new Date(parsed.payload.timestamp),
        };
        set((state) => ({
          alarms: [alarm, ...state.alarms].slice(-300),
        }));
      }

      if (type === "log") {
        const parsedAgain = parsed.payload.map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp),
          id: uuidv4(),
        }));
        console.log(JSON.stringify(parsedAgain));
        set((state) => ({ logs: [...parsedAgain, ...state.logs] }));
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    // expose the socket in the store
    set({ ws });
  },

  disconnect: () => {
    const ws = get().ws;
    if (ws) {
      ws.close();
      set({ ws: null });
    }
  },
}));
