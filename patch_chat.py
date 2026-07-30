import re

with open("hooks/useChat.ts", "r") as f:
    content = f.read()

# We need to replace the fetch block starting at:
#       try {
#         const res = await fetch("/api/chat", {
# ...
#         }

search_pattern = r"""      try \{
        const res = await fetch\("/api/chat", \{
          method: "POST",
          headers: \{ "Content-Type": "application/json" \},
          body: JSON\.stringify\(\{
            query: effectiveQuery,
            threadHistory: history,
            model,
            focusMode: githubInvoke \? "nosearch" : focusMode,
            githubInvoke,
            sources,
            images: \(\(\) => \{
              // Merge user-uploaded images with images crawled from pages\.
              const all = \[\.\.\.\(built\.images \|\| \[\]\), \.\.\.\(pageImages \|\| \[\]\)\]\.slice\(0, 8\);
              return all\.length \? all : undefined;
            \}\)\(\),
            provider: store\.getState\(\)\.provider,
            providerApiKey: store\.getState\(\)\.providerApiKey,
            providerBaseUrl: store\.getState\(\)\.providerBaseUrl,
            customInstructions: customAI\?\.instructions,
          \}\),
          signal: controller\.signal,
        \}\);

        if \(!res\.ok \|\| !res\.body\) \{
          // Free-tier usage limit \(429\) returns a JSON message; nudge to upgrade\.
          if \(res\.status === 429\) \{
            const data = await res\.json\(\)\.catch\(\(\) => null\);
            update(\{
              streaming: false,
              error: data\?\.error \|\| "You've reached your free usage limit\. Upgrade to continue\.",
            \}\);
            if \(typeof window !== "undefined"\) window\.location\.href = "/pricing";
            return;
          \}
          const text = await res\.text\(\)\.catch\(\(\) => ""\);
          update(\{ streaming: false, error: text \|\| "Chat request failed\." \}\);
          return;
        \}"""

replacement = """      let currentSources = sources;
      let currentHistory = history;
      let res: Response | null = null;
      let attempt = 0;
      let shouldRetry = true;

      while (shouldRetry && attempt < 2) {
        attempt++;
        shouldRetry = false;
        try {
          res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: effectiveQuery,
              threadHistory: currentHistory,
              model,
              focusMode: githubInvoke ? "nosearch" : focusMode,
              githubInvoke,
              sources: currentSources,
              images: (() => {
                const all = [...(built.images || []), ...(pageImages || [])].slice(0, 8);
                return all.length ? all : undefined;
              })(),
              provider: store.getState().provider,
              providerApiKey: store.getState().providerApiKey,
              providerBaseUrl: store.getState().providerBaseUrl,
              customInstructions: customAI?.instructions,
            }),
            signal: controller.signal,
          });

          if (!res.ok || !res.body) {
            if (res.status === 429) {
              const data = await res.json().catch(() => null);
              update({
                streaming: false,
                error: data?.error || "You've reached your free usage limit. Upgrade to continue.",
              });
              if (typeof window !== "undefined") window.location.href = "/pricing";
              return;
            }
            const text = await res.text().catch(() => "");
            
            const isContextError = text.toLowerCase().includes("prompt too long") || text.toLowerCase().includes("exceeded max context length") || text.toLowerCase().includes("context length");
            if (isContextError && attempt < 2) {
              shouldRetry = true;
              const compactStep = pushStep("Compacting context (memory limit reached)...", "active");
              
              currentSources = currentSources.map(s => ({
                ...s,
                content: s.content ? s.content.substring(0, 400) + "..." : s.content
              }));
              
              if (currentHistory.length > 2) {
                currentHistory = currentHistory.slice(-2);
              }
              
              await new Promise(r => setTimeout(r, 2000));
              setStep(compactStep, "done", "Context compacted");
              continue;
            }
            
            update({ streaming: false, error: text || "Chat request failed." });
            return;
          }
        } catch (e: any) {
          if (e.name === "AbortError") return;
          update({ streaming: false, error: "Network error during chat request." });
          return;
        }
      }
      
      if (!res || !res.body) return;"""

if not re.search(search_pattern, content):
    print("Pattern not found!")
else:
    new_content = re.sub(search_pattern, replacement, content)
    with open("hooks/useChat.ts", "w") as f:
        f.write(new_content)
    print("Successfully replaced.")
