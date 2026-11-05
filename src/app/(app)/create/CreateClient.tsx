"use client";
import dynamic from "next/dynamic";

// Konva needs the browser, so the editor is never rendered on the server.
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-[14px] bg-lilac" />,
});

export default function CreateClient() {
  return <Editor />;
}
