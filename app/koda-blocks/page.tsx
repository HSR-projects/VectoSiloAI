"use client";

import { useEffect } from "react";

export default function KodaBlocksRedirect() {
  useEffect(() => {
    window.location.href = "/kodablocks/index.html";
  }, []);
  return null;
}
