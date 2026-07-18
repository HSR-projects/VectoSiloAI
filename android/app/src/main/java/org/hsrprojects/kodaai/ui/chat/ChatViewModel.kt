package org.hsrprojects.kodaai.ui.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
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
    val thinking: String? = null,
    val thinkingMs: Long? = null,
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

    // Guards against rapid double-send and tracks the streaming job for cancellation.
    private val sendMutex = Mutex()
    private var streamingJob: Job? = null

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
        // Cancel any in-flight streaming so tokens don't leak into the new chat.
        streamingJob?.cancel()
        streamingJob = null
        currentThreadId = null
        currentThreadCreatedAt = 0
        currentTitle = "New chat"
        _messages.value = emptyList()
        _sending.value = false
    }

    fun openThread(id: String) {
        // Cancel any in-flight streaming first.
        streamingJob?.cancel()
        streamingJob = null
        _sending.value = false

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

    /** Retry a failed assistant message by re-sending the user query that preceded it. */
    fun retry(failedMessageId: String) {
        val msgs = _messages.value
        val failedIdx = msgs.indexOfFirst { it.id == failedMessageId }
        if (failedIdx < 1) return
        val userMsg = msgs[failedIdx - 1]
        if (userMsg.role != "user") return
        // Remove the failed assistant message and re-send
        _messages.value = msgs.filterNot { it.id == failedMessageId }
        _messages.value = _messages.value.filterNot { it.id == userMsg.id }
        send(userMsg.content)
    }

    /** Drop the assistant message and re-send the preceding user message. */
    fun regenerate(messageId: String) {
        retry(messageId)
    }

    /** Truncate the conversation at the given user message, replace its content, and resend. */
    fun editAndResend(messageId: String, newText: String) {
        val msgs = _messages.value
        val idx = msgs.indexOfFirst { it.id == messageId }
        if (idx == -1) return
        val userMsg = msgs[idx]
        if (userMsg.role != "user") return
        
        // Truncate at the message we're editing
        _messages.value = msgs.take(idx)
        send(newText)
    }

    fun send(text: String, attachments: List<org.hsrprojects.kodaai.data.Attachment> = emptyList()) {
        var q = text.trim()
        if ((q.isEmpty() && attachments.isEmpty()) || _sending.value) return
        val model = _selectedModel.value ?: return

        val images = mutableListOf<String>()
        val textBlocks = mutableListOf<String>()

        for (a in attachments) {
            when (a) {
                is org.hsrprojects.kodaai.data.ImageAttachment -> images.add(a.base64Data)
                is org.hsrprojects.kodaai.data.DocumentAttachment -> textBlocks.add("--- File: ${a.name} ---\n${a.textContent.take(20000)}")
            }
        }

        if (textBlocks.isNotEmpty()) {
            q = "${textBlocks.joinToString("\n\n")}\n\n${q.ifBlank { "Please review the attached file(s)." }}"
        }

        if (q.isBlank() && images.isNotEmpty()) {
            q = "Please describe and analyze the attached image(s)."
        }

        // Start a fresh thread on the first message of a conversation.
        if (currentThreadId == null) {
            currentThreadId = UUID.randomUUID().toString()
            currentThreadCreatedAt = System.currentTimeMillis()
            currentTitle = q.take(60).ifBlank { "Attached file(s)" }
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

        streamingJob = viewModelScope.launch {
            // Use mutex to prevent overlapping sends
            sendMutex.withLock {
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
                            withContext(Dispatchers.Main) {
                                update(assistantId) { it.copy(sources = uiSources) }
                            }
                        }
                    }

                    val startTime = System.currentTimeMillis()

                    KodaClient.chat(
                        request = ChatRequest(
                            query = q,
                            threadHistory = priorHistory,
                            model = model,
                            focusMode = if (useSearch) "all" else "nosearch",
                            sources = sources,
                            images = images,
                        ),
                        onToken = { delta ->
                            // StateFlow updates from IO — dispatch to Main for safety
                            viewModelScope.launch(Dispatchers.Main.immediate) {
                                update(assistantId) { it.copy(content = it.content + delta) }
                            }
                        },
                        onThinking = { delta ->
                            viewModelScope.launch(Dispatchers.Main.immediate) {
                                update(assistantId) { 
                                    it.copy(
                                        thinking = (it.thinking ?: "") + delta,
                                        thinkingMs = System.currentTimeMillis() - startTime
                                    ) 
                                }
                            }
                        },
                        onFollowups = { qs ->
                            viewModelScope.launch(Dispatchers.Main.immediate) {
                                update(assistantId) { it.copy(followups = qs) }
                            }
                        },
                    )
                    withContext(Dispatchers.Main) {
                        update(assistantId) { it.copy(streaming = false) }
                    }
                } catch (e: kotlinx.coroutines.CancellationException) {
                    // Coroutine was cancelled (new chat / new thread opened) — mark whatever
                    // content we have as complete so it doesn't stay in "streaming" state.
                    withContext(Dispatchers.Main.immediate + kotlinx.coroutines.NonCancellable) {
                        update(assistantId) { it.copy(streaming = false) }
                    }
                    throw e
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        update(assistantId) {
                            it.copy(streaming = false, error = e.message ?: "Something went wrong.")
                        }
                    }
                } finally {
                    _sending.value = false
                    persistCurrentThread()
                }
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
