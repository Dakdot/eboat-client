"use client";

import { useEffect, useState } from "react";
import { useSocketStore } from "@/store/useSocketStore";

export const StatusBar = () => {
  const [now, setNow] = useState(new Date());
  const { alarms, ws, latencies } = useSocketStore();

  const [isFailed, setIsFailed] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    if (ws) {
      ws.addEventListener("open", () => {
        setIsConnecting(false);
      });

      ws.addEventListener("error", () => {
        setIsFailed(true);
        setIsConnecting(false);
      });

      ws.addEventListener("close", () => {
        setIsFailed(true);
        setIsConnecting(false);
      });
    }

    const handle = setInterval(() => {
      setNow(new Date());
    }, 200);
    return () => {
      clearInterval(handle);
    };
  }, [ws]);

  const isError = alarms.filter((e) => e.type === "error").length > 0;

  const connectionColor = () => {
    const green = "from-lime-200 to-lime-500";
    const yellow = "from-yellow-100 to-yellow-300";
    const red = "from-red-300 to-red-600 text-white";

    if (isFailed) return red;
    if (isConnecting) return yellow;
    if ((latencies[0]?.value || 0) > 1000) return yellow;

    return green;
  };

  const connectionText = () => {
    if (isConnecting) return "CONNECTING";
    if (isFailed) return "CONNECTION ERR";
    return "CONNECTION OK";
  };

  return (
    <div className="flex px-2 border-b-1 shadow-md bg-gradient-to-b from-blue-100 to-blue-300">
      <div className="lg:flex flex-1 hidden">
        <p>SIT Electric Boatworks</p>
      </div>

      <div className="flex flex-1/2 justify-center gap-2">
        <div className="bg-gradient-to-b from-lime-200 to-lime-500 px-2 border-x">
          <p className="">CAN BUS ON</p>
        </div>

        {isError ? (
          <div className="bg-gradient-to-b from-red-300 to-red-600 text-white border-black px-2 border-x">
            <p>ACTIVE FAULTS</p>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-lime-200 to-lime-500 px-2 border-x">
            <p>SYSTEMS OK</p>
          </div>
        )}

        <div
          className={`px-2 border-x bg-gradient-to-b  border-black
            ${connectionColor()}
            `}
        >
          <p>
            {connectionText()}{" "}
            {latencies[0] ? `[${latencies[0].value} ms]` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-1 justify-end">
        <p suppressHydrationWarning>{now.toLocaleString()}</p>
      </div>
    </div>
  );
};
