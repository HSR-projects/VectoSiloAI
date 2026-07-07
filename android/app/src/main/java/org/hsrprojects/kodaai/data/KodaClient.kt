package org.hsrprojects.kodaai.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
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
import java.util.concurrent.TimeUnit

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
        val url = base.toHttpUrlOrNull() ?: return false
        val cookie = Cookie.Builder()
            .name("koda_session")
            .value(value)
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
     */
    suspend fun chat(
        request: ChatRequest,
        onToken: (String) -> Unit,
        onFollowups: (List<String>) -> Unit,
    ) = withContext(Dispatchers.IO) {
        val payload = json.encodeToString(ChatRequest.serializer(), request)
        val call = http.newCall(
            Request.Builder()
                .url("$base/api/chat")
                .header("Accept", "text/event-stream")
                .post(bodyOf(payload))
                .build()
        )
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
                val line = source.readUtf8Line() ?: break
                if (!line.startsWith("data:")) continue
                val data = line.substring(5).trim()
                if (data.isEmpty()) continue
                val obj = runCatching { json.parseToJsonElement(data).jsonObject }.getOrNull() ?: continue
                when (obj["type"]?.jsonPrimitive?.content) {
                    "token" -> obj["content"]?.jsonPrimitive?.content?.let(onToken)
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
    }
}
