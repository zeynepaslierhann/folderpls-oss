"use client";

import { useMemo } from "react";
import { buildGraphModel, type GraphModel } from "@/lib/graph";
import type { GraphPanelProps } from "./types";

type ModelInputProps = Pick<
  GraphPanelProps,
  "files" | "taggedItems" | "labels" | "properties" | "rootFolderId" | "rootFolderName"
>;

/** Memoized wrapper around the pure `buildGraphModel` — recomputes only when an input actually changes. */
export function useGraphModel(props: ModelInputProps): GraphModel {
  return useMemo(
    () =>
      buildGraphModel({
        files: props.files,
        taggedItems: props.taggedItems,
        labels: props.labels,
        properties: props.properties,
        rootFolderId: props.rootFolderId,
        rootFolderName: props.rootFolderName,
      }),
    [
      props.files,
      props.taggedItems,
      props.labels,
      props.properties,
      props.rootFolderId,
      props.rootFolderName,
    ]
  );
}
