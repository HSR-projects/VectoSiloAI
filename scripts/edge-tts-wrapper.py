#!/usr/bin/env python3
"""Edge TTS wrapper — reads text from stdin, writes WAV/MP3 to stdout."""
import asyncio, os, sys, tempfile
from edge_tts import Communicate, VoicesManager

async def main():
    text = sys.stdin.buffer.read().decode("utf-8", errors="replace").strip()
    if not text:
        sys.exit(1)

    voices = await VoicesManager.create()
    voice = voices.find(Gender="Female", Locale="en-US")[0]["Name"]

    tmp = os.path.join(tempfile.gettempdir(), "edge-tts-out.mp3")
    communicate = Communicate(text, voice, rate="+0%", pitch="+0Hz")
    await communicate.save(tmp)

    with open(tmp, "rb") as f:
        sys.stdout.buffer.write(f.read())

    os.unlink(tmp)

asyncio.run(main())
