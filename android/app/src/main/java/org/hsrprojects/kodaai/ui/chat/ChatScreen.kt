package org.hsrprojects.kodaai.ui.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch
import org.hsrprojects.kodaai.data.Source
import org.hsrprojects.kodaai.data.UserDto
import org.hsrprojects.kodaai.ui.theme.KodaAccent
import org.hsrprojects.kodaai.ui.theme.KodaAccentSoft
import org.hsrprojects.kodaai.ui.theme.KodaBorder
import org.hsrprojects.kodaai.ui.theme.KodaMuted
import org.hsrprojects.kodaai.ui.theme.KodaSurface
import org.hsrprojects.kodaai.ui.theme.KodaSurface2

@Composable
fun ChatScreen(
    user: UserDto,
    onLogout: () -> Unit,
    vm: ChatViewModel = viewModel(),
) {
    val messages by vm.messages.collectAsStateWithLifecycle()
    val models by vm.models.collectAsStateWithLifecycle()
    val selectedModel by vm.selectedModel.collectAsStateWithLifecycle()
    val searchEnabled by vm.searchEnabled.collectAsStateWithLifecycle()
    val sending by vm.sending.collectAsStateWithLifecycle()
    val threads by vm.threads.collectAsStateWithLifecycle()

    val listState = rememberLazyListState()
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    LaunchedEffect(messages.size, messages.lastOrNull()?.content) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.size - 1)
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(Modifier.widthIn(max = 300.dp)) {
                ThreadDrawer(
                    threads = threads,
                    email = user.email,
                    onNew = { vm.newChat(); scope.launch { drawerState.close() } },
                    onOpen = { id -> vm.openThread(id); scope.launch { drawerState.close() } },
                    onDelete = vm::deleteThread,
                    onLogout = onLogout,
                )
            }
        },
    ) {
        Column(Modifier.fillMaxSize().statusBarsPadding()) {
            TopBar(
                models = models,
                selectedModel = selectedModel,
                onSelectModel = vm::setModel,
                onMenu = { scope.launch { drawerState.open() } },
                onNewChat = vm::newChat,
            )

            Box(Modifier.weight(1f).fillMaxWidth()) {
                if (messages.isEmpty()) {
                    EmptyState(onPick = vm::send)
                } else {
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        items(messages, key = { it.id }) { msg ->
                            if (msg.role == "user") UserBubble(msg.content)
                            else AssistantBlock(msg, onFollowup = vm::send, sending = sending)
                        }
                    }
                }
            }

            InputBar(
                searchEnabled = searchEnabled,
                onToggleSearch = vm::toggleSearch,
                sending = sending,
                onSend = vm::send,
            )
        }
    }
}

@Composable
private fun ThreadDrawer(
    threads: List<ThreadSummary>,
    email: String,
    onNew: () -> Unit,
    onOpen: (String) -> Unit,
    onDelete: (String) -> Unit,
    onLogout: () -> Unit,
) {
    Column(Modifier.fillMaxSize().statusBarsPadding().padding(12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 12.dp)) {
            Text("Koda", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text("AI", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = KodaAccent)
        }

        Row(
            Modifier
                .fillMaxWidth()
                .clickable { onNew() }
                .border(1.dp, KodaBorder, RoundedCornerShape(12.dp))
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Filled.Add, contentDescription = null, tint = KodaAccent, modifier = Modifier.width(18.dp).height(18.dp))
            Text("  New chat", color = MaterialTheme.colorScheme.onSurface, fontSize = 15.sp)
        }

        Text(
            "Chats",
            color = KodaMuted,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(top = 16.dp, bottom = 6.dp),
        )

        if (threads.isEmpty()) {
            Text("No saved chats yet.", color = KodaMuted, fontSize = 13.sp)
        }

        LazyColumn(Modifier.weight(1f)) {
            items(threads, key = { it.id }) { t ->
                Row(
                    Modifier.fillMaxWidth().padding(vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(
                        Modifier
                            .weight(1f)
                            .clickable { onOpen(t.id) }
                            .padding(vertical = 8.dp),
                    ) {
                        Text(
                            t.title,
                            color = MaterialTheme.colorScheme.onSurface,
                            fontSize = 14.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(relativeTime(t.updatedAt), color = KodaMuted, fontSize = 11.sp)
                    }
                    IconButton(onClick = { onDelete(t.id) }) {
                        Icon(Icons.Filled.Delete, contentDescription = "Delete chat", tint = KodaMuted, modifier = Modifier.width(18.dp).height(18.dp))
                    }
                }
            }
        }

        HorizontalDivider(color = KodaBorder)
        Row(
            Modifier.fillMaxWidth().clickable { onLogout() }.padding(vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(email, color = KodaMuted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("Sign out", color = KodaAccentSoft, fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun TopBar(
    models: List<String>,
    selectedModel: String?,
    onSelectModel: (String) -> Unit,
    onMenu: () -> Unit,
    onNewChat: () -> Unit,
) {
    var menuOpen by remember { mutableStateOf(false) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 6.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onMenu) {
            Icon(Icons.Filled.Menu, contentDescription = "Saved chats", tint = KodaMuted)
        }

        Box {
            TextButton(onClick = { menuOpen = true }, enabled = models.isNotEmpty()) {
                Text(
                    selectedModel ?: "Model",
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.widthIn(max = 150.dp),
                )
                Icon(Icons.Filled.ArrowDropDown, contentDescription = null, tint = KodaMuted)
            }
            DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                models.forEach { m ->
                    DropdownMenuItem(
                        text = { Text(m) },
                        onClick = { onSelectModel(m); menuOpen = false },
                    )
                }
            }
        }

        Spacer(Modifier.weight(1f))

        IconButton(onClick = onNewChat) {
            Icon(Icons.Filled.Add, contentDescription = "New chat", tint = KodaAccent)
        }
    }
}

@Composable
private fun UserBubble(text: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
        Box(
            Modifier
                .widthIn(max = 320.dp)
                .background(KodaSurface2, RoundedCornerShape(16.dp))
                .padding(horizontal = 14.dp, vertical = 10.dp),
        ) {
            Text(text, color = MaterialTheme.colorScheme.onSurface, fontSize = 15.sp)
        }
    }
}

@Composable
private fun AssistantBlock(
    msg: ChatMessage,
    onFollowup: (String) -> Unit,
    sending: Boolean,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        if (msg.sources.isNotEmpty()) SourceRow(msg.sources)

        when {
            msg.error != null -> Text(
                msg.error,
                color = MaterialTheme.colorScheme.error,
                fontSize = 14.sp,
            )
            msg.content.isEmpty() && msg.streaming -> ThinkingDots()
            else -> MarkdownText(
                text = msg.content + if (msg.streaming) " ▍" else "",
                color = MaterialTheme.colorScheme.onSurface,
            )
        }

        if (msg.followups.isNotEmpty() && !msg.streaming) {
            Spacer(Modifier.height(2.dp))
            Text("Related", color = KodaMuted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            msg.followups.forEach { q ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clickable(enabled = !sending) { onFollowup(q) }
                        .border(1.dp, KodaBorder, RoundedCornerShape(12.dp))
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                ) {
                    Text(q, color = KodaAccentSoft, fontSize = 14.sp)
                }
            }
        }
    }
}

@Composable
private fun SourceRow(sources: List<Source>) {
    Column {
        Text(
            "Sources · ${sources.size}",
            color = KodaMuted,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(bottom = 6.dp),
        )
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(sources) { s ->
                Column(
                    Modifier
                        .width(190.dp)
                        .background(KodaSurface, RoundedCornerShape(12.dp))
                        .border(1.dp, KodaBorder, RoundedCornerShape(12.dp))
                        .padding(10.dp),
                ) {
                    Text(
                        domainOf(s.url),
                        color = KodaMuted,
                        fontSize = 11.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        s.title,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun ThinkingDots() {
    Row(verticalAlignment = Alignment.CenterVertically) {
        CircularProgressIndicator(strokeWidth = 2.dp, modifier = Modifier.width(16.dp).height(16.dp))
        Text("  Thinking…", color = KodaMuted, fontSize = 14.sp)
    }
}

@Composable
private fun EmptyState(onPick: (String) -> Unit) {
    val suggestions = listOf(
        "Latest breakthroughs in AI",
        "Explain RAG in simple terms",
        "Best practices for prompt engineering",
    )
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Ask anything, privately.", fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
        Text(
            "Search-augmented AI by Koda AI.",
            color = KodaMuted,
            modifier = Modifier.padding(top = 6.dp, bottom = 20.dp),
        )
        suggestions.forEach { s ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
                    .clickable { onPick(s) }
                    .border(1.dp, KodaBorder, RoundedCornerShape(12.dp))
                    .padding(horizontal = 14.dp, vertical = 12.dp),
            ) {
                Text(s, color = KodaAccentSoft, fontSize = 14.sp)
            }
        }
    }
}

@Composable
private fun InputBar(
    searchEnabled: Boolean,
    onToggleSearch: () -> Unit,
    sending: Boolean,
    onSend: (String) -> Unit,
) {
    var text by remember { mutableStateOf("") }
    val submit = {
        if (text.isNotBlank() && !sending) {
            onSend(text)
            text = ""
        }
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .imePadding()
            .navigationBarsPadding()
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        val toggleBg = if (searchEnabled) KodaAccent else KodaSurface2
        val toggleFg = if (searchEnabled) Color.White else KodaMuted
        Box(
            Modifier
                .background(toggleBg, CircleShape)
                .clickable { onToggleSearch() }
                .padding(10.dp),
        ) {
            Icon(Icons.Filled.Search, contentDescription = "Toggle web search", tint = toggleFg, modifier = Modifier.width(20.dp).height(20.dp))
        }

        Spacer(Modifier.width(8.dp))

        OutlinedTextField(
            value = text,
            onValueChange = { text = it },
            placeholder = { Text(if (searchEnabled) "Ask anything…" else "Ask (no search)…") },
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(24.dp),
            maxLines = 4,
        )

        Spacer(Modifier.width(8.dp))

        IconButton(
            onClick = submit,
            enabled = text.isNotBlank() && !sending,
        ) {
            if (sending) {
                CircularProgressIndicator(strokeWidth = 2.dp, modifier = Modifier.width(22.dp).height(22.dp))
            } else {
                Icon(
                    Icons.AutoMirrored.Filled.Send,
                    contentDescription = "Send",
                    tint = if (text.isNotBlank()) KodaAccent else KodaMuted,
                )
            }
        }
    }
}

private fun domainOf(url: String): String =
    runCatching {
        url.substringAfter("://").substringBefore("/").removePrefix("www.")
    }.getOrDefault(url)

private fun relativeTime(epochMs: Long): String {
    if (epochMs <= 0) return ""
    val diff = System.currentTimeMillis() - epochMs
    val mins = diff / 60_000
    val hours = diff / 3_600_000
    val days = diff / 86_400_000
    return when {
        mins < 1 -> "just now"
        mins < 60 -> "${mins}m ago"
        hours < 24 -> "${hours}h ago"
        days < 7 -> "${days}d ago"
        else -> "${days / 7}w ago"
    }
}
