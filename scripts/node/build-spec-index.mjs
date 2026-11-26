import { buildSpecIndex } from "../../dist/packages/workflows/src/build-spec-index.js";

buildSpecIndex().catch((error) => {
  console.error("Spec index build failed", error);
  process.exitCode = 1;
});
