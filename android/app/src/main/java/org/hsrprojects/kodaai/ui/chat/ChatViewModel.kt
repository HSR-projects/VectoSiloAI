package org.hsrprojects.kodaai.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.hsrprojects.kodaai.data.ChatRequest
import org.hsrprojects.kodaai.data.HistoryMsg
import org.hsrprojects.kodaai.data.KodaClient
import org.hsrprojects.kodaai.data.MessageDto
import org.hsrprojects.kodaai.data.Source
import org.hsrprojects.kodaai.data.SourceDto
import org.hsrprojects.kodaai.data.ThreadDto
import java.util.UUID

/** A single turn rendered in the conversation. */
data class ChatMessage(
    val id: String,
    val role: String, // "user" | "assistant"
    val content: String,
    val streaming: Boolean = false,
    val error: String? = null,
    val sources: List<Source> = emptyList(),
    val followups: List<String> = emptyList(),
    val createdAt: Long = System.currentTimeMillis(),
)

/** Lightweight row for the saved-chats drawer. */
data class ThreadSummary(val id: String, val title: String, val updatedAt: Long)

class ChatViewModel : ViewModel() {

    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages: StateFlow<List<ChatMessage>> = _messages.asStateFlow()

    private val _models = MutableStateFlow<List<String>>(emptyList())
    val models: StateFlow<List<String>> = _models.asStateFlow()

    private val _selectedModel = MutableStateFlow<String?>(null)
    val selectedModel: StateFlow<String?> = _selectedModel.asStateFlow()

    private val _searchEnabled = MutableStateFlow(true)
    val searchEnabled: StateFlow<Boolean> = _searchEnabled.asStateFlow()

    private val _sending = MutableStateFlow(false)
    val sending: StateFlow<Boolean> = _sending.asStateFlow()

    private val _threads = MutableStateFlow<List<ThreadSummary>>(emptyList())
    val threads: StateFlow<List<ThreadSummary>> = _threads.asStateFlow()

    // Full thread cache so opening a saved chat is instant.
    private var threadCache: List<ThreadDto> = emptyList()
    private var currentThreadId: String? = null
    private var currentThreadCreatedAt: Long = 0
    private var currentTitle: String = "New chat"

    init {
        viewModelScope.launch {
            val m = KodaClient.models()
            _models.value = m.models
            _selectedModel.value = m.default ?: m.models.firstOrNull()
        }
        loadThreads()
    }

    fun setModel(model: String) { _selectedModel.value = model }
    fun toggleSearch() { _searchEnabled.value = !_searchEnabled.value }

    private fun loadThreads() {
        viewModelScope.launch {
            threadCache = KodaClient.listThreads().sortedByDescending { it.updatedAt }
            _threads.value = threadCache.map { ThreadSummary(it.id, it.title, it.updatedAt) }
        }
    }

    fun newChat() {
        currentThreadId = null
        currentThreadCreatedAt = 0
        currentTitle = "New chat"
        _messages.value = emptyList()
    }

    fun openThread(id: String) {
        val thread = threadCache.firstOrNull { it.id == id } ?: return
        currentThreadId = thread.id
        currentThreadCreatedAt = thread.createdAt
        currentTitle = thread.title
        _messages.value = thread.messages
            .filter { it.role == "user" || it.role == "assistant" }
            .map { dto ->
                ChatMessage(
                    id = dto.id,
                    role = dto.role,
                    content = dto.content,
                    sources = dto.sources.map { Source(it.url, it.title, it.snippet ?: it.content) },
                    followups = dto.followups,
                    createdAt = dto.createdAt,
                )
            }
    }

    fun deleteThread(id: String) {
        viewModelScope.launch { KodaClient.deleteThread(id) }
        threadCache = threadCache.filterNot { it.id == id }
        _threads.value = _threads.value.filterNot { it.id == id }
        if (currentThreadId == id) newChat()
    }

    fun send(text: String) {
        val q = text.trim()
        if (q.isEmpty() || _sending.value) return
        val model = _selectedModel.value ?: return

        // Start a fresh thread on the first message of a conversation.
        if (currentThreadId == null) {
            currentThreadId = UUID.randomUUID().toString()
            currentThreadCreatedAt = System.currentTimeMillis()
            currentTitle = q.take(60)
        }

        val priorHistory = _messages.value
            .filter { it.error == null && it.content.isNotBlank() }
            .takeLast(10)
            .map { HistoryMsg(it.role, it.content) }

        val assistantId = UUID.randomUUID().toString()
        _messages.value = _messages.value +
            ChatMessage(UUID.randomUUID().toString(), "user", q) +
            ChatMessage(assistantId, "assistant", "", streaming = true)

        val useSearch = _searchEnabled.value
        _sending.value = true
        viewModelScope.launch {
            try {
                var sources = emptyList<SourceDto>()
                if (useSearch) {
                    val decision = KodaClient.routeDecision(q, model, priorHistory)
                    if (decision.needsSearch) {
                        val results = KodaClient.search(decision.searchQuery ?: q)
                        sources = results.map {
                            SourceDto(
                                url = it.url,
                                title = it.title.ifBlank { it.url },
                                content = it.content ?: it.snippet,
                                snippet = it.snippet,
                            )
                        }
                        val uiSources = results.map {
                            Source(it.url, it.title.ifBlank { it.url }, it.snippet)
                        }
                        update(assistantId) { it.copy(sources = uiSources) }
                    }
                }

                KodaClient.chat(
                    request = ChatRequest(
                        query = q,
                        threadHistory = priorHistory,
                        model = model,
                        focusMode = if (useSearch) "all" else "nosearch",
                        sources = sources,
                    ),
                    onToken = { delta ->
                        update(assistantId) { it.copy(content = it.content + delta) }
                    },
                    onFollowups = { qs ->
                        update(assistantId) { it.copy(followups = qs) }
                    },
                )
                update(assistantId) { it.copy(streaming = false) }
            } catch (e: Exception) {
                update(assistantId) {
                    it.copy(streaming = false, error = e.message ?: "Something went wrong.")
                }
            } finally {
                _sending.value = false
                persistCurrentThread()
            }
        }
    }

    /** Save the current conversation to the backend and refresh the drawer list. */
    private fun persistCurrentThread() {
        val id = currentThreadId ?: return
        val now = System.currentTimeMillis()
        val thread = ThreadDto(
            id = id,
            title = currentTitle,
            createdAt = if (currentThreadCreatedAt > 0) currentThreadCreatedAt else now,
            updatedAt = now,
            messages = _messages.value
                .filter { !it.streaming }
                .map { m ->
                    MessageDto(
                        id = m.id,
                        role = m.role,
                        content = m.content,
                        sources = m.sources.map { SourceDto(it.url, it.title, it.snippet, it.snippet) },
                        followups = m.followups,
                        createdAt = m.createdAt,
                    )
                },
        )
        viewModelScope.launch {
            KodaClient.saveThread(thread)
            // Update caches optimistically so the drawer reflects it immediately.
            threadCache = (listOf(thread) + threadCache.filterNot { it.id == id })
                .sortedByDescending { it.updatedAt }
            _threads.value = threadCache.map { ThreadSummary(it.id, it.title, it.updatedAt) }
        }
    }

    private fun update(id: String, transform: (ChatMessage) -> ChatMessage) {
        _messages.value = _messages.value.map { if (it.id == id) transform(it) else it }
    }
}
