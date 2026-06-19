"use client";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("CLIENT_HYDRATION_ERROR:", error);
  }, [error]);

  return (
    <div style={{
      padding: 40,
      fontFamily: "monospace",
      background: "#1A1A1A",
      color: "#F0EAD6",
      minHeight: "100vh"
    }}>
      <h2>Client Error Caught</h2>
      <pre style={{
        whiteSpace: "pre-wrap",
        color: "#DC143C"
      }}>
        {error.message}
        {"\n\n"}
        {error.stack}
      </pre>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
