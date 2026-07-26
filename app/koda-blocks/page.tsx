"use client";

import { useEffect } from "react";

export default function IncogniBlocksRedirect() {
  useEffect(() => {
    window.location.href = "/incogniblocks/index.html";
  }, []);
  return null;
}
