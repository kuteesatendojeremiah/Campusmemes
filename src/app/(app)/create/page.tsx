import { Suspense } from "react";
import Page from "@/components/Page";
import CreateClient from "./CreateClient";

export default function Create() {
  return (
    <Page title="Create meme">
      <Suspense fallback={<div className="h-80 animate-pulse rounded-[14px] bg-lilac" />}>
        <CreateClient />
      </Suspense>
    </Page>
  );
}
