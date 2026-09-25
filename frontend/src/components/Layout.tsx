import type { ReactNode } from "react";
import Navbar from "./Navbar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({
  children,
}: LayoutProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",

        background: `
          radial-gradient(
            circle at top right,
            rgba(114,241,184,0.08),
            transparent 28%
          ),

          radial-gradient(
            circle at bottom left,
            rgba(96,165,250,0.06),
            transparent 32%
          ),

          linear-gradient(
            180deg,
            #040814 0%,
            #050816 35%,
            #060B1A 100%
          )
        `,

        color: "#F8FAFC",
      }}
    >
      {/* Top Ambient Light */}
      <div
        style={{
          position: "fixed",
          top: "-250px",
          right: "-150px",

          width: "700px",
          height: "700px",

          borderRadius: "50%",

          background:
            "rgba(114,241,184,0.08)",

          filter: "blur(140px)",

          pointerEvents: "none",

          zIndex: 0,
        }}
      />

      {/* Bottom Ambient Light */}
      <div
        style={{
          position: "fixed",
          bottom: "-300px",
          left: "-150px",

          width: "700px",
          height: "700px",

          borderRadius: "50%",

          background:
            "rgba(96,165,250,0.06)",

          filter: "blur(160px)",

          pointerEvents: "none",

          zIndex: 0,
        }}
      />

      {/* Center Light */}
      <div
        style={{
          position: "fixed",

          top: "20%",

          left: "50%",

          transform:
            "translateX(-50%)",

          width: "900px",

          height: "500px",

          background:
            "rgba(255,255,255,0.015)",

          filter: "blur(120px)",

          pointerEvents: "none",

          zIndex: 0,
        }}
      />

      {/* Noise Layer */}
      <div
        style={{
          position: "fixed",
          inset: 0,

          opacity: 0.015,

          backgroundImage: `
            radial-gradient(
              rgba(255,255,255,0.6) 1px,
              transparent 1px
            )
          `,

          backgroundSize:
            "24px 24px",

          pointerEvents: "none",

          zIndex: 0,
        }}
      />

      <Navbar />

      <main
        style={{
          position: "relative",
          zIndex: 2,

          width: "92%",

          maxWidth: "1700px",

          margin: "0 auto",

          padding:
            "60px 20px 80px",
        }}
      >
        {children}
      </main>
    </div>
  );
}