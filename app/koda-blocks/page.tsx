"use client";

import { useEffect } from "react";

export default function VectoSiloBlocksRedirect() {
  useEffect(() => {
    window.location.href = "/vectosiloblocks/index.html";
  }, []);
  return null;
}
