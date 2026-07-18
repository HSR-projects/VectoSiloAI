package org.hsrprojects.kodaai.ui.voice

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaPlayer
import android.media.MediaRecorder
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.hsrprojects.kodaai.data.ChatRequest
import org.hsrprojects.kodaai.data.HistoryMsg
import org.hsrprojects.kodaai.data.KodaClient
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream

enum class VoiceStep { IDLE, LISTENING, TRANSCRIBING, THINKING, SPEAKING, ERROR }

class VoiceModeViewModel : ViewModel() {

    private val _step = MutableStateFlow(VoiceStep.IDLE)
    val step: StateFlow<VoiceStep> = _step.asStateFlow()

    private val _transcript = MutableStateFlow("")
    val transcript: StateFlow<String> = _transcript.asStateFlow()

    private val _reply = MutableStateFlow("")
    val reply: StateFlow<String> = _reply.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    /** Index of the word currently being "spoken" for word-highlight animation. */
    private val _highlightIndex = MutableStateFlow(-1)
    val highlightIndex: StateFlow<Int> = _highlightIndex.asStateFlow()

    /** Amplitude from the microphone (0..1f) for the animated orb. */
    private val _amplitude = MutableStateFlow(0f)
    val amplitude: StateFlow<Float> = _amplitude.asStateFlow()

    private val history = mutableListOf<HistoryMsg>()
    private var recordingJob: Job? = null
    private var audioRecord: AudioRecord? = null
    private var mediaPlayer: MediaPlayer? = null
    private var wordAnimJob: Job? = null
    private var isActive = false

    fun startSession(model: String?) {
        if (isActive) return
        isActive = true
        _error.value = null
        _reply.value = ""
        _transcript.value = ""
        _highlightIndex.value = -1
        history.clear()
        startListening(model)
    }

    fun stopSession() {
        isActive = false
        stopRecording()
        stopPlaying()
        wordAnimJob?.cancel()
        _step.value = VoiceStep.IDLE
        _highlightIndex.value = -1
        _amplitude.value = 0f
    }

    /** Tap the orb during idle to restart listening. */
    fun tapOrb(model: String?) {
        when (_step.value) {
            VoiceStep.IDLE, VoiceStep.ERROR -> {
                _error.value = null
                if (!isActive) isActive = true
                startListening(model)
            }
            VoiceStep.SPEAKING -> {
                // Interrupt playback and listen again
                stopPlaying()
                wordAnimJob?.cancel()
                _highlightIndex.value = -1
                startListening(model)
            }
            else -> {} // ignore taps during other states
        }
    }

    @Suppress("MissingPermission") // Permission is requested from the UI layer
    private fun startListening(model: String?) {
        _step.value = VoiceStep.LISTENING
        _transcript.value = ""
        _reply.value = ""
        _highlightIndex.value = -1

        recordingJob = viewModelScope.launch(Dispatchers.IO) {
            val sampleRate = 16000
            val bufferSize = AudioRecord.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
            ).coerceAtLeast(4096)

            val recorder = try {
                AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    sampleRate,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    bufferSize,
                )
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    _error.value = "Microphone not available. Please grant audio permission."
                    _step.value = VoiceStep.ERROR
                }
                return@launch
            }

            audioRecord = recorder
            recorder.startRecording()

            val buffer = ShortArray(bufferSize / 2)
            val allSamples = ByteArrayOutputStream()
            var silenceFrames = 0
            val silenceThreshold = 8 // frames of ~100ms each = ~0.8s silence to stop
            val maxFrames = 300       // max ~30s of recording

            var frameCount = 0
            while (isActive && frameCount < maxFrames) {
                val read = recorder.read(buffer, 0, buffer.size)
                if (read <= 0) break

                // Compute RMS amplitude for the animated orb
                var sum = 0.0
                for (i in 0 until read) {
                    val s = buffer[i].toDouble() / Short.MAX_VALUE
                    sum += s * s
                }
                val rms = kotlin.math.sqrt(sum / read).toFloat().coerceIn(0f, 1f)
                _amplitude.value = rms

                // Write raw PCM
                for (i in 0 until read) {
                    val v = buffer[i].toInt()
                    allSamples.write(v and 0xFF)
                    allSamples.write((v shr 8) and 0xFF)
                }

                // Simple Voice Activity Detection
                if (rms < 0.015f) silenceFrames++ else silenceFrames = 0
                if (silenceFrames > silenceThreshold && allSamples.size() > sampleRate * 2) {
                    // At least 1s of audio and 1.2s of silence — stop
                    break
                }
                frameCount++
            }

            recorder.stop()
            recorder.release()
            audioRecord = null
            _amplitude.value = 0f

            if (!isActive) return@launch

            val pcmBytes = allSamples.toByteArray()
            if (pcmBytes.size < sampleRate) {
                // Less than 0.5s of audio — too short, restart
                withContext(Dispatchers.Main) {
                    if (isActive) startListening(model)
                }
                return@launch
            }

            // Convert PCM to WAV in memory
            val wavBytes = pcmToWav(pcmBytes, sampleRate, 1, 16)

            // Transcribe
            withContext(Dispatchers.Main) { _step.value = VoiceStep.TRANSCRIBING }

            try {
                val text = KodaClient.speechToText(wavBytes, "audio/wav")
                if (text.isBlank()) {
                    // Silence — restart listening
                    withContext(Dispatchers.Main) {
                        if (isActive) startListening(model)
                    }
                    return@launch
                }

                withContext(Dispatchers.Main) {
                    _transcript.value = text
                    _step.value = VoiceStep.THINKING
                }

                // Get AI response
                history.add(HistoryMsg("user", text))
                var answer = ""

                KodaClient.chat(
                    request = ChatRequest(
                        query = text,
                        threadHistory = history.takeLast(10),
                        model = model ?: "auto",
                        focusMode = "nosearch",
                    ),
                    onToken = { delta ->
                        answer += delta
                        _reply.value = answer
                    },
                    onFollowups = { /* ignore in voice mode */ },
                )

                if (answer.isBlank()) {
                    withContext(Dispatchers.Main) {
                        if (isActive) startListening(model)
                    }
                    return@launch
                }

                history.add(HistoryMsg("assistant", answer))

                // Speak the response
                withContext(Dispatchers.Main) {
                    _reply.value = answer
                    _step.value = VoiceStep.SPEAKING
                }

                try {
                    val audioBytes = KodaClient.textToSpeech(answer)
                    playAudio(audioBytes, answer, model)
                } catch (_: Exception) {
                    // TTS failed — just show the text and move on
                    withContext(Dispatchers.Main) {
                        delay(2000)
                        if (isActive) startListening(model)
                    }
                }
            } catch (e: Exception) {
                if (!isActive) return@launch
                withContext(Dispatchers.Main) {
                    _error.value = e.message ?: "Something went wrong."
                    _step.value = VoiceStep.ERROR
                }
            }
        }
    }

    private suspend fun playAudio(audioBytes: ByteArray, reply: String, model: String?) {
        // Animate word highlights during playback
        val words = reply.split("\\s+".toRegex())
        val estimatedDurationMs = (words.size * 170L).coerceIn(1000, 30000)

        wordAnimJob = viewModelScope.launch(Dispatchers.Main) {
            val perWord = estimatedDurationMs / words.size.coerceAtLeast(1)
            for (i in words.indices) {
                _highlightIndex.value = i
                delay(perWord)
            }
            _highlightIndex.value = -1
        }

        withContext(Dispatchers.IO) {
            // Write to temp file for MediaPlayer
            val tempFile = File.createTempFile("koda_tts_", ".wav")
            tempFile.deleteOnExit()
            FileOutputStream(tempFile).use { it.write(audioBytes) }

            val player = MediaPlayer()
            mediaPlayer = player
            try {
                player.setDataSource(tempFile.absolutePath)
                player.prepare()
                player.start()

                // Wait for completion
                val completionJob = viewModelScope.launch(Dispatchers.IO) {
                    while (player.isPlaying) {
                        delay(100)
                    }
                }
                completionJob.join()
            } catch (_: Exception) {
                // Playback error — non-fatal
            } finally {
                try { player.release() } catch (_: Exception) {}
                mediaPlayer = null
                tempFile.delete()
            }
        }

        wordAnimJob?.cancel()
        _highlightIndex.value = -1

        // Loop back to listening
        if (isActive) {
            _step.value = VoiceStep.IDLE
            delay(300) // small pause between turns
            if (isActive) startListening(model)
        }
    }

    private fun stopRecording() {
        recordingJob?.cancel()
        recordingJob = null
        try { audioRecord?.stop() } catch (_: Exception) {}
        try { audioRecord?.release() } catch (_: Exception) {}
        audioRecord = null
    }

    private fun stopPlaying() {
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
        } catch (_: Exception) {}
        mediaPlayer = null
    }

    override fun onCleared() {
        super.onCleared()
        stopSession()
    }

    companion object {
        /** Wrap raw PCM data in a WAV header. */
        fun pcmToWav(pcm: ByteArray, sampleRate: Int, channels: Int, bitsPerSample: Int): ByteArray {
            val byteRate = sampleRate * channels * bitsPerSample / 8
            val blockAlign = channels * bitsPerSample / 8
            val dataSize = pcm.size
            val totalSize = 36 + dataSize

            val wav = ByteArray(44 + dataSize)
            // RIFF header
            wav[0] = 'R'.code.toByte(); wav[1] = 'I'.code.toByte()
            wav[2] = 'F'.code.toByte(); wav[3] = 'F'.code.toByte()
            writeInt(wav, 4, totalSize)
            wav[8] = 'W'.code.toByte(); wav[9] = 'A'.code.toByte()
            wav[10] = 'V'.code.toByte(); wav[11] = 'E'.code.toByte()
            // fmt chunk
            wav[12] = 'f'.code.toByte(); wav[13] = 'm'.code.toByte()
            wav[14] = 't'.code.toByte(); wav[15] = ' '.code.toByte()
            writeInt(wav, 16, 16) // chunk size
            writeShort(wav, 20, 1) // PCM format
            writeShort(wav, 22, channels)
            writeInt(wav, 24, sampleRate)
            writeInt(wav, 28, byteRate)
            writeShort(wav, 32, blockAlign)
            writeShort(wav, 34, bitsPerSample)
            // data chunk
            wav[36] = 'd'.code.toByte(); wav[37] = 'a'.code.toByte()
            wav[38] = 't'.code.toByte(); wav[39] = 'a'.code.toByte()
            writeInt(wav, 40, dataSize)
            pcm.copyInto(wav, 44)
            return wav
        }

        private fun writeInt(buf: ByteArray, off: Int, v: Int) {
            buf[off] = (v and 0xFF).toByte()
            buf[off + 1] = ((v shr 8) and 0xFF).toByte()
            buf[off + 2] = ((v shr 16) and 0xFF).toByte()
            buf[off + 3] = ((v shr 24) and 0xFF).toByte()
        }

        private fun writeShort(buf: ByteArray, off: Int, v: Int) {
            buf[off] = (v and 0xFF).toByte()
            buf[off + 1] = ((v shr 8) and 0xFF).toByte()
        }
    }
}
