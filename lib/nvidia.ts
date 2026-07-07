export async function generateImage(prompt: string): Promise<string> {
  const res = await fetch("/api/images/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Image generation failed." }));
    throw new Error(data.error || `Server error (${res.status})`);
  }

  const data = await res.json();
  return data.url as string;
}

export async function editImage(prompt: string, sourceImage: string): Promise<string> {
  const res = await fetch("/api/images/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Image generation failed." }));
    throw new Error(data.error || `Server error (${res.status})`);
  }

  const data = await res.json();
  return data.url as string;
}
