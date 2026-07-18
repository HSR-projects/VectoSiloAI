package org.hsrprojects.kodaai.data

import kotlinx.serialization.Serializable

// ─── Auth ───────────────────────────────────────────────────────────────────

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class RegisterRequest(val name: String, val email: String, val password: String)

@Serializable
data class UserDto(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val plan: String = "free",
    val onboarded: Boolean = false,
    val emailVerified: Boolean = false,
    val credits: Int = 0,
    val avatarColor: String? = null,
)

@Serializable
data class AuthResponse(
    val user: UserDto? = null,
    val error: String? = null,
    val needsVerification: Boolean = false,
    val email: String? = null,
)

// ─── Models ─────────────────────────────────────────────────────────────────

@Serializable
data class ModelsResponse(
    val models: List<String> = emptyList(),
    val default: String? = null,
    val error: String? = null,
)

// ─── Router / search ────────────────────────────────────────────────────────

@Serializable
data class HistoryMsg(val role: String, val content: String)

@Serializable
data class RouteRequest(
    val query: String,
    val model: String,
    val history: List<HistoryMsg> = emptyList(),
)

@Serializable
data class RouteResponse(
    val needsSearch: Boolean = true,
    val searchQuery: String? = null,
    val reason: String? = null,
)

@Serializable
data class SearchRequest(val query: String)

@Serializable
data class SearchResultDto(
    val title: String = "",
    val url: String = "",
    val snippet: String = "",
    val content: String? = null,
)

@Serializable
data class SearchResponse(
    val results: List<SearchResultDto> = emptyList(),
    val unavailable: Boolean = false,
    val error: String? = null,
)

// ─── Chat ───────────────────────────────────────────────────────────────────

@Serializable
data class SourceDto(
    val url: String,
    val title: String,
    val content: String,
    val snippet: String? = null,
)

@Serializable
data class ChatRequest(
    val query: String,
    val threadHistory: List<HistoryMsg> = emptyList(),
    val model: String,
    val focusMode: String = "all",
    val sources: List<SourceDto> = emptyList(),
    val images: List<String> = emptyList(),
)

// ─── Threads (saved chats) ───────────────────────────────────────────────────

@Serializable
data class MessageDto(
    val id: String,
    val role: String,
    val content: String = "",
    val sources: List<SourceDto> = emptyList(),
    val followups: List<String> = emptyList(),
    val focusMode: String? = null,
    val createdAt: Long = 0,
)

@Serializable
data class ThreadDto(
    val id: String,
    val title: String,
    val messages: List<MessageDto> = emptyList(),
    val createdAt: Long = 0,
    val updatedAt: Long = 0,
)

@Serializable
data class ThreadsResponse(val threads: List<ThreadDto> = emptyList())

@Serializable
data class ThreadWrapper(val thread: ThreadDto)

/** A search source surfaced in the UI (maps from [SearchResultDto]). */
data class Source(
    val url: String,
    val title: String,
    val snippet: String,
)

/** Outcome of a login / register attempt. */
sealed interface AuthResult {
    data class Success(val user: UserDto) : AuthResult
    data class NeedsVerification(val email: String) : AuthResult
    data class Error(val message: String) : AuthResult
}

// ─── TTS / STT ──────────────────────────────────────────────────────────────

@Serializable
data class TtsRequest(val text: String, val voice: String? = null)

@Serializable
data class SttResponse(val text: String = "", val error: String? = null)

sealed class Attachment {
    abstract val name: String
    abstract val size: Long
}

data class ImageAttachment(
    override val name: String,
    override val size: Long,
    val base64Data: String // base64 stripped data string
) : Attachment()

data class DocumentAttachment(
    override val name: String,
    override val size: Long,
    val textContent: String // extracted text
) : Attachment()

