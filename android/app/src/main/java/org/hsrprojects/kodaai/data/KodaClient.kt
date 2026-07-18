package org.hsrprojects.kodaai.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.Cookie
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.hsrprojects.kodaai.BuildConfig
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.coroutineContext

/**
 * The single HTTP entry point to the KodaAI backend. Holds an OkHttp client with
 * a persistent cookie jar (so the session survives restarts) and exposes typed
 * suspend calls for every endpoint the app uses.
 */
object KodaClient {

    private const val JSON_MEDIA = "application/json; charset=utf-8"
    private val jsonMediaType = JSON_MEDIA.toMediaType()

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    private lateinit var base: String
    private lateinit var cookieJar: SessionCookieJar
    private lateinit var http: OkHttpClient

    fun init(context: Context) {
        if (::http.isInitialized) return
        base = BuildConfig.API_BASE_URL.trimEnd('/')
        cookieJar = SessionCookieJar(context.applicationContext)
        http = OkHttpClient.Builder()
            .cookieJar(cookieJar)
            // Chat is a long-lived stream — no read timeout, generous connect.
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(0, TimeUnit.SECONDS)
            .build()
    }

    private fun bodyOf(payload: String) = payload.toRequestBody(jsonMediaType)

    /** Base API origin, e.g. for kicking off the Google OAuth WebView flow. */
    fun baseUrl(): String = base

    /**
     * Adopt the `koda_session` cookie captured from the WebView's CookieManager
     * after the Google OAuth redirect, so OkHttp requests are authenticated.
     * Returns true if a session cookie was found in the header.
     */
    fun adoptSessionCookie(cookieHeader: String): Boolean {
        val value = cookieHeader.split(";")
            .map { it.trim() }
            .firstOrNull { it.startsWith("koda_session=") }
            ?.substringAfter("koda_session=")
            ?: return false
        return adoptToken(value)
    }

    /**
     * Adopt a session token directly (e.g., from a deep link OAuth flow).
     */
    fun adoptToken(token: String): Boolean {
        val url = base.toHttpUrlOrNull() ?: return false
        val cookie = Cookie.Builder()
            .name("koda_session")
            .value(token)
            .domain(url.host)
            .path("/")
            .expiresAt(System.currentTimeMillis() + 30L * 24 * 60 * 60 * 1000)
            .secure()
            .httpOnly()
            .build()
        cookieJar.store(url, cookie)
        return true
    }

    // ─── Auth ────────────────────────────────────────────────────────────────

    suspend fun me(): UserDto? = withContext(Dispatchers.IO) {
        runCatching {
            http.newCall(Request.Builder().url("$base/api/auth/me").get().build())
                .execute().use { resp ->
                    if (!resp.isSuccessful) return@use null
                    val text = resp.body?.string().orEmpty()
                    json.decodeFromString<AuthResponse>(text).user
                }
        }.getOrNull()
    }

    suspend fun login(email: String, password: String): AuthResult =
        postAuth("$base/api/auth/login", json.encodeToString(LoginRequest.serializer(), LoginRequest(email, password)))

    suspend fun register(name: String, email: String, password: String): AuthResult =
        postAuth(
            "$base/api/auth/register",
            json.encodeToString(RegisterRequest.serializer(), RegisterRequest(name, email, password)),
        )

    private suspend fun postAuth(url: String, payload: String): AuthResult =
        withContext(Dispatchers.IO) {
            try {
                http.newCall(Request.Builder().url(url).post(bodyOf(payload)).build())
                    .execute().use { resp ->
                        val text = resp.body?.string().orEmpty()
                        val parsed = runCatching {
                            json.decodeFromString<AuthResponse>(text)
                        }.getOrNull()
                        when {
                            parsed?.user != null -> AuthResult.Success(parsed.user)
                            parsed?.needsVerification == true ->
                                AuthResult.NeedsVerification(parsed.email ?: "")
                            parsed?.error != null -> AuthResult.Error(parsed.error)
                            !resp.isSuccessful -> AuthResult.Error("Request failed (${resp.code}).")
                            else -> AuthResult.Error("Unexpected response.")
                        }
                    }
            } catch (e: SocketTimeoutException) {
                AuthResult.Error("Connection timed out. Please check your network and try again.")
            } catch (e: UnknownHostException) {
                AuthResult.Error("Cannot reach the server. Please check your internet connection.")
            } catch (e: IOException) {
                AuthResult.Error(e.message ?: "Network error. Check your connection.")
            }
        }

    suspend fun logout() = withContext(Dispatchers.IO) {
        runCatching {
            http.newCall(Request.Builder().url("$base/api/auth/logout").post(bodyOf("{}")).build())
                .execute().close()
        }
        cookieJar.clear()
    }

    @kotlinx.serialization.Serializable
    private data class AccountPatch(
        val name: String? = null,
        val avatarColor: String? = null,
    )

    suspend fun updateAccount(name: String? = null, avatarColor: String? = null): UserDto? = withContext(Dispatchers.IO) {
        runCatching {
            val payload = json.encodeToString(AccountPatch.serializer(), AccountPatch(name, avatarColor))
            http.newCall(Request.Builder().url("$base/api/account").post(bodyOf(payload)).build())
                .execute().use { resp ->
                    if (!resp.isSuccessful) return@use null
                    val text = resp.body?.string().orEmpty()
                    json.decodeFromString<AuthResponse>(text).user
                }
        }.getOrNull()
    }

    // ─── Models ──────────────────────────────────────────────────────────────

    suspend fun models(): ModelsResponse = withContext(Dispatchers.IO) {
        runCatching {
            http.newCall(Request.Builder().url("$base/api/ollama/models").get().build())
                .execute().use { resp ->
                    json.decodeFromString<ModelsResponse>(resp.body?.string().orEmpty())
                }
        }.getOrElse { ModelsResponse(error = it.message) }
    }

    // ─── Search pipeline ─────────────────────────────────────────────────────

    suspend fun routeDecision(query: String, model: String, history: List<HistoryMsg>): RouteResponse =
        withContext(Dispatchers.IO) {
            runCatching {
                val payload = json.encodeToString(
                    RouteRequest.serializer(), RouteRequest(query, model, history)
                )
                http.newCall(Request.Builder().url("$base/api/route").post(bodyOf(payload)).build())
                    .execute().use { resp ->
                        if (!resp.isSuccessful) error("route failed")
                        json.decodeFromString<RouteResponse>(resp.body?.string().orEmpty())
                    }
            }.getOrElse {
                // Fail open — default to searching, like the web client.
                RouteResponse(needsSearch = true, searchQuery = query, reason = "router unavailable")
            }
        }

    suspend fun search(query: String): List<SearchResultDto> = withContext(Dispatchers.IO) {
        runCatching {
            val payload = json.encodeToString(SearchRequest.serializer(), SearchRequest(query))
            http.newCall(Request.Builder().url("$base/api/search").post(bodyOf(payload)).build())
                .execute().use { resp ->
                    if (!resp.isSuccessful) return@use emptyList<SearchResultDto>()
                    val data = json.decodeFromString<SearchResponse>(resp.body?.string().orEmpty())
                    if (data.unavailable) emptyList() else data.results
                }
        }.getOrElse { emptyList() }
    }

    // ─── Threads (saved chats) ───────────────────────────────────────────────

    suspend fun listThreads(): List<ThreadDto> = withContext(Dispatchers.IO) {
        runCatching {
            http.newCall(Request.Builder().url("$base/api/threads").get().build())
                .execute().use { resp ->
                    if (!resp.isSuccessful) return@use emptyList<ThreadDto>()
                    json.decodeFromString<ThreadsResponse>(resp.body?.string().orEmpty()).threads
                }
        }.getOrElse { emptyList() }
    }

    suspend fun saveThread(thread: ThreadDto) = withContext(Dispatchers.IO) {
        runCatching {
            val payload = json.encodeToString(ThreadWrapper.serializer(), ThreadWrapper(thread))
            http.newCall(Request.Builder().url("$base/api/threads").post(bodyOf(payload)).build())
                .execute().close()
        }
        Unit
    }

    suspend fun deleteThread(id: String) = withContext(Dispatchers.IO) {
        runCatching {
            http.newCall(Request.Builder().url("$base/api/threads/$id").delete().build())
                .execute().close()
        }
        Unit
    }

    // ─── Chat (SSE stream) ───────────────────────────────────────────────────

    /**
     * Streams a chat answer. [onToken] fires for each delta, [onFollowups] once
     * (if the model produced them). Throws [IOException] on an error event or
     * transport failure so the caller can surface a message.
     *
     * The call is cancellation-safe: if the coroutine is cancelled, the underlying
     * OkHttp call is cancelled immediately so the socket is cleaned up.
     */
    suspend fun chat(
        request: ChatRequest,
        onToken: (String) -> Unit,
        onFollowups: (List<String>) -> Unit,
        onThinking: ((String) -> Unit)? = null,
    ) = withContext(Dispatchers.IO) {
        val payload = json.encodeToString(ChatRequest.serializer(), request)
        val call = http.newCall(
            Request.Builder()
                .url("$base/api/chat")
                .header("Accept", "text/event-stream")
                .post(bodyOf(payload))
                .build()
        )
        try {
            call.execute().use { resp ->
                if (!resp.isSuccessful) {
                    val text = resp.body?.string().orEmpty()
                    val msg = runCatching {
                        json.parseToJsonElement(text).jsonObject["error"]?.jsonPrimitive?.content
                    }.getOrNull()
                    throw IOException(msg ?: "Chat request failed (${resp.code}).")
                }
                val source = resp.body?.source() ?: throw IOException("Empty response.")
                while (!source.exhausted()) {
                    // Check for coroutine cancellation between lines
                    coroutineContext.ensureActive()

                    val line = source.readUtf8Line() ?: break
                    // Use removePrefix to safely handle both "data: {...}" and "data:{...}"
                    if (!line.startsWith("data:")) continue
                    val data = line.removePrefix("data:").trim()
                    if (data.isEmpty()) continue
                    val obj = runCatching { json.parseToJsonElement(data).jsonObject }.getOrNull() ?: continue
                    when (obj["type"]?.jsonPrimitive?.content) {
                        "token" -> obj["content"]?.jsonPrimitive?.content?.let(onToken)
                        "thinking" -> obj["content"]?.jsonPrimitive?.content?.let { t ->
                            onThinking?.invoke(t)
                        }
                        "followups" -> {
                            val qs = obj["questions"]?.jsonArray
                                ?.mapNotNull { it.jsonPrimitive.content }
                                .orEmpty()
                            if (qs.isNotEmpty()) onFollowups(qs)
                        }
                        "done" -> return@use
                        "error" -> throw IOException(
                            obj["message"]?.jsonPrimitive?.content ?: "Model error."
                        )
                    }
                }
            }
        } catch (e: kotlinx.coroutines.CancellationException) {
            // If the coroutine was cancelled (e.g. user started a new chat),
            // cancel the underlying HTTP call to free the socket immediately.
            call.cancel()
            throw e
        }
    }

    // ─── TTS (text-to-speech) ────────────────────────────────────────────────

    /**
     * Synthesise speech for the given text via the backend's `/api/tts` endpoint.
     * Returns the raw audio bytes (WAV or MP3 depending on server config).
     */
    suspend fun textToSpeech(text: String, voice: String? = null): ByteArray =
        withContext(Dispatchers.IO) {
            val payload = json.encodeToString(
                TtsRequest.serializer(), TtsRequest(text, voice)
            )
            val resp = http.newCall(
                Request.Builder()
                    .url("$base/api/tts")
                    .post(bodyOf(payload))
                    .build()
            ).execute()
            try {
                if (!resp.isSuccessful) throw IOException("TTS failed (${resp.code}).")
                resp.body?.bytes() ?: throw IOException("Empty TTS response.")
            } finally {
                resp.close()
            }
        }

    // ─── STT (speech-to-text) ────────────────────────────────────────────────

    /**
     * Transcribe audio via the backend's `/api/stt` endpoint.
     * [audioData] is the raw audio bytes (webm/ogg/wav), [mimeType] is the
     * content-type (e.g. "audio/webm" or "audio/wav").
     */
    suspend fun speechToText(audioData: ByteArray, mimeType: String = "audio/webm"): String =
        withContext(Dispatchers.IO) {
            val body = audioData.toRequestBody(mimeType.toMediaType())
            val resp = http.newCall(
                Request.Builder()
                    .url("$base/api/stt")
                    .post(body)
                    .build()
            ).execute()
            try {
                if (!resp.isSuccessful) throw IOException("STT failed (${resp.code}).")
                val text = resp.body?.string().orEmpty()
                json.decodeFromString<SttResponse>(text).text
            } finally {
                resp.close()
            }
        }
}
