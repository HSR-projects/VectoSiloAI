package org.hsrprojects.kodaai.ui.chat

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch
import org.hsrprojects.kodaai.data.Source
import org.hsrprojects.kodaai.data.UserDto
import org.hsrprojects.kodaai.ui.theme.KodaAccent
import org.hsrprojects.kodaai.ui.theme.KodaAccentDim
import org.hsrprojects.kodaai.ui.theme.KodaAccentSoft
import org.hsrprojects.kodaai.ui.theme.KodaBorder
import org.hsrprojects.kodaai.ui.theme.KodaMuted
import org.hsrprojects.kodaai.ui.theme.KodaSurface
import org.hsrprojects.kodaai.ui.theme.KodaSurface2
import org.hsrprojects.kodaai.ui.theme.KodaSurface3
import org.hsrprojects.kodaai.ui.theme.KodaSuccess
import org.hsrprojects.kodaai.ui.voice.VoiceModeScreen
import org.hsrprojects.kodaai.data.KodaClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import android.media.MediaPlayer
import java.io.File
import java.io.FileOutputStream

@Composable
fun ChatScreen(
    user: UserDto,
    onLogout: () -> Unit,
    onSettingsClick: () -> Unit = {},
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

    // Scroll to bottom when new messages arrive or content updates
    LaunchedEffect(messages.size, messages.lastOrNull()?.content) {
        if (messages.isNotEmpty()) {
            val targetIndex = (messages.size - 1).coerceAtLeast(0)
            runCatching { listState.animateScrollToItem(targetIndex) }
        }
    }

    // Detect if user has scrolled up
    val showScrollToBottom by remember {
        derivedStateOf {
            if (messages.isEmpty()) false
            else {
                val lastVisible = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
                lastVisible < messages.size - 1
            }
        }
    }
    
    var voiceModeVisible by rememberSaveable { mutableStateOf(false) }

    Box(Modifier.fillMaxSize()) {
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
                    onSettings = { onSettingsClick(); scope.launch { drawerState.close() } }
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
                onVoiceMode = { voiceModeVisible = true }
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
                            if (msg.role == "user") UserBubble(msg.content, user, onEdit = { newText -> vm.editAndResend(msg.id, newText) })
                            else AssistantBlock(
                                msg = msg,
                                onFollowup = vm::send,
                                onRetry = vm::regenerate,
                                sending = sending,
                            )
                        }
                    }
                }

                // Scroll-to-bottom FAB
                androidx.compose.animation.AnimatedVisibility(
                    visible = showScrollToBottom,
                    enter = fadeIn() + slideInVertically { it },
                    exit = fadeOut(),
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 12.dp),
                ) {
                    FloatingActionButton(
                        onClick = {
                            scope.launch {
                                val idx = (messages.size - 1).coerceAtLeast(0)
                                runCatching { listState.animateScrollToItem(idx) }
                            }
                        },
                        containerColor = KodaSurface2,
                        contentColor = KodaAccentSoft,
                        shape = CircleShape,
                        elevation = FloatingActionButtonDefaults.elevation(4.dp),
                        modifier = Modifier.size(40.dp),
                    ) {
                        Icon(
                            Icons.Filled.KeyboardArrowDown,
                            contentDescription = "Scroll to bottom",
                            modifier = Modifier.size(22.dp),
                        )
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
        
        if (voiceModeVisible) {
            VoiceModeScreen(
                model = selectedModel,
                onClose = { voiceModeVisible = false }
            )
        }
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
    onSettings: () -> Unit,
) {
    Column(Modifier.fillMaxSize().statusBarsPadding().padding(12.dp)) {
        // Brand header
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 16.dp, top = 4.dp),
        ) {
            Text("Koda", fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text("AI", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = KodaAccent)
        }

        // New chat button
        Row(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(
                    Brush.horizontalGradient(
                        listOf(KodaAccent.copy(alpha = 0.15f), Color.Transparent)
                    )
                )
                .border(1.dp, KodaBorder, RoundedCornerShape(12.dp))
                .clickable { onNew() }
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Filled.Add,
                contentDescription = null,
                tint = KodaAccent,
                modifier = Modifier.size(18.dp),
            )
            Spacer(Modifier.width(8.dp))
            Text("New chat", color = MaterialTheme.colorScheme.onSurface, fontSize = 15.sp)
        }

        Text(
            "CHATS",
            color = KodaMuted,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 1.sp,
            modifier = Modifier.padding(top = 20.dp, bottom = 8.dp),
        )

        if (threads.isEmpty()) {
            Text("No saved chats yet.", color = KodaMuted, fontSize = 13.sp)
        }

        LazyColumn(Modifier.weight(1f)) {
            items(threads, key = { it.id }) { t ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(vertical = 2.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .clickable { onOpen(t.id) }
                        .padding(vertical = 6.dp, horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            t.title,
                            color = MaterialTheme.colorScheme.onSurface,
                            fontSize = 14.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Text(relativeTime(t.updatedAt), color = KodaMuted, fontSize = 11.sp)
                    }
                    IconButton(onClick = { onDelete(t.id) }, modifier = Modifier.size(32.dp)) {
                        Icon(
                            Icons.Filled.Delete,
                            contentDescription = "Delete chat",
                            tint = KodaMuted.copy(alpha = 0.6f),
                            modifier = Modifier.size(16.dp),
                        )
                    }
                }
            }
        }

        HorizontalDivider(color = KodaBorder)
        Row(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .clickable { onSettings() }
                .padding(vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // User avatar
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .background(KodaAccentDim, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    email.firstOrNull()?.uppercase() ?: "?",
                    color = Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(email, color = KodaMuted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("Settings", color = KodaAccentSoft, fontSize = 13.sp)
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
    onVoiceMode: () -> Unit,
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
        
        IconButton(onClick = onVoiceMode) {
            Icon(Icons.Filled.Mic, contentDescription = "Voice mode", tint = KodaAccentSoft)
        }

        IconButton(onClick = onNewChat) {
            Icon(Icons.Filled.Add, contentDescription = "New chat", tint = KodaAccent)
        }
    }
}

@Composable
private fun UserBubble(text: String, user: UserDto, onEdit: (String) -> Unit) {
    var editing by rememberSaveable { mutableStateOf(false) }
    var draft by rememberSaveable { mutableStateOf(text) }
    val clipboard = LocalClipboardManager.current
    val haptic = LocalHapticFeedback.current

    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
        if (editing) {
            Column(
                Modifier
                    .fillMaxWidth(0.9f)
                    .clip(RoundedCornerShape(12.dp))
                    .background(KodaSurface2)
                    .border(1.dp, KodaBorder, RoundedCornerShape(12.dp))
                    .padding(12.dp)
            ) {
                OutlinedTextField(
                    value = draft,
                    onValueChange = { draft = it },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color.Transparent,
                        unfocusedBorderColor = Color.Transparent,
                        cursorColor = KodaAccentSoft,
                    ),
                )
                Spacer(Modifier.height(8.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = { editing = false; draft = text }) {
                        Text("Cancel", color = KodaMuted)
                    }
                    TextButton(
                        onClick = {
                            editing = false
                            if (draft.isNotBlank() && draft != text) onEdit(draft)
                        }
                    ) {
                        Text("Send", color = KodaAccentSoft)
                    }
                }
            }
        } else {
            Column(horizontalAlignment = Alignment.End) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Box(
                        Modifier
                            .widthIn(max = 300.dp)
                            .clip(RoundedCornerShape(18.dp, 18.dp, 4.dp, 18.dp))
                            .background(
                                Brush.linearGradient(
                                    listOf(KodaAccent, KodaAccentDim)
                                )
                            )
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                    ) {
                        Text(text, color = Color.White, fontSize = 15.sp)
                    }
                    Spacer(Modifier.width(6.dp))
                    // User avatar
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .background(KodaAccent.copy(alpha = 0.3f), CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            user.name.firstOrNull()?.uppercase() ?: user.email.firstOrNull()?.uppercase() ?: "?",
                            color = KodaAccentSoft,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
                
                // Actions (Copy & Edit)
                Row(modifier = Modifier.padding(top = 4.dp, end = 34.dp)) {
                    IconButton(
                        onClick = { 
                            clipboard.setText(AnnotatedString(text))
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        },
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(Icons.Filled.ContentCopy, contentDescription = "Copy", tint = KodaMuted, modifier = Modifier.size(14.dp))
                    }
                    IconButton(onClick = { editing = true }, modifier = Modifier.size(28.dp)) {
                        Icon(Icons.Filled.Edit, contentDescription = "Edit", tint = KodaMuted, modifier = Modifier.size(14.dp))
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun AssistantBlock(
    msg: ChatMessage,
    onFollowup: (String) -> Unit,
    onRetry: (String) -> Unit,
    sending: Boolean,
) {
    val clipboard = LocalClipboardManager.current
    val haptic = LocalHapticFeedback.current
    
    // TTS playback state
    var speaking by remember { mutableStateOf(false) }
    var mediaPlayer by remember { mutableStateOf<MediaPlayer?>(null) }
    val scope = rememberCoroutineScope()

    androidx.compose.runtime.DisposableEffect(Unit) {
        onDispose {
            mediaPlayer?.stop()
            mediaPlayer?.release()
        }
    }

    Column(
        verticalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier.combinedClickable(
            onClick = {},
            onLongClick = {
                if (msg.content.isNotBlank()) {
                    clipboard.setText(AnnotatedString(msg.content))
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                }
            },
        ),
    ) {
        if (msg.sources.isNotEmpty()) SourceRow(msg.sources)

        when {
            msg.error != null -> {
                // Error state with retry button
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.error.copy(alpha = 0.1f))
                        .border(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                        .padding(12.dp),
                ) {
                    Text(
                        msg.error,
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 14.sp,
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable(enabled = !sending) { onRetry(msg.id) }
                            .background(MaterialTheme.colorScheme.error.copy(alpha = 0.15f))
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Filled.Refresh,
                            contentDescription = "Retry",
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(16.dp),
                        )
                        Spacer(Modifier.width(6.dp))
                        Text("Retry", color = MaterialTheme.colorScheme.error, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                    }
                }
            }
            else -> {
                if (msg.thinking != null || (msg.content.isEmpty() && msg.streaming)) {
                    ThinkingBlock(msg.thinking, msg.thinkingMs, msg.streaming)
                }
                if (msg.content.isNotEmpty()) {
                    MarkdownText(
                        text = msg.content + if (msg.streaming) " ▍" else "",
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
        }

        if (!msg.streaming && msg.error == null) {
            // Message actions
            Row(modifier = Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                IconButton(
                    onClick = { 
                        clipboard.setText(AnnotatedString(msg.content))
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    },
                    modifier = Modifier.size(28.dp)
                ) {
                    Icon(Icons.Filled.ContentCopy, contentDescription = "Copy", tint = KodaMuted, modifier = Modifier.size(16.dp))
                }
                
                IconButton(
                    onClick = {
                        if (speaking) {
                            mediaPlayer?.stop()
                            mediaPlayer?.release()
                            mediaPlayer = null
                            speaking = false
                        } else {
                            speaking = true
                            scope.launch(Dispatchers.IO) {
                                try {
                                    val audioBytes = KodaClient.textToSpeech(msg.content)
                                    val tempFile = File.createTempFile("koda_tts_", ".wav")
                                    tempFile.deleteOnExit()
                                    FileOutputStream(tempFile).use { it.write(audioBytes) }
                                    
                                    val player = MediaPlayer()
                                    player.setDataSource(tempFile.absolutePath)
                                    player.prepare()
                                    player.setOnCompletionListener { 
                                        speaking = false
                                        player.release()
                                        mediaPlayer = null
                                    }
                                    player.start()
                                    mediaPlayer = player
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) { speaking = false }
                                }
                            }
                        }
                    },
                    modifier = Modifier.size(28.dp)
                ) {
                    if (speaking) {
                        Icon(Icons.Filled.Stop, contentDescription = "Stop", tint = KodaAccentSoft, modifier = Modifier.size(16.dp))
                    } else {
                        Icon(Icons.Filled.PlayArrow, contentDescription = "Read aloud", tint = KodaMuted, modifier = Modifier.size(16.dp))
                    }
                }
                
                IconButton(
                    onClick = { onRetry(msg.id) },
                    modifier = Modifier.size(28.dp),
                    enabled = !sending
                ) {
                    Icon(Icons.Filled.Refresh, contentDescription = "Regenerate", tint = KodaMuted, modifier = Modifier.size(16.dp))
                }
            }
        }

        if (msg.followups.isNotEmpty() && !msg.streaming) {
            Spacer(Modifier.height(2.dp))
            Text(
                "Related",
                color = KodaMuted,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 0.5.sp,
            )
            msg.followups.forEach { q ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .clickable(enabled = !sending) { onFollowup(q) }
                        .border(1.dp, KodaBorder, RoundedCornerShape(12.dp))
                        .background(KodaSurface.copy(alpha = 0.5f))
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Filled.Search,
                        contentDescription = null,
                        tint = KodaAccent.copy(alpha = 0.5f),
                        modifier = Modifier.size(14.dp),
                    )
                    Spacer(Modifier.width(8.dp))
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
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            Brush.verticalGradient(
                                listOf(KodaSurface2, KodaSurface)
                            )
                        )
                        .border(1.dp, KodaBorder, RoundedCornerShape(12.dp))
                        .padding(10.dp),
                ) {
                    // Domain pill
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(KodaAccent.copy(alpha = 0.1f))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                    ) {
                        Text(
                            domainOf(s.url),
                            color = KodaAccentSoft,
                            fontSize = 10.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    Text(
                        s.title,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun ThinkingBlock(thinking: String?, timeMs: Long?, streaming: Boolean) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    val transition = rememberInfiniteTransition(label = "thinking")
    val alpha by transition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "pulse",
    )

    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(KodaSurface2)
            .border(1.dp, KodaBorder, RoundedCornerShape(8.dp))
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .clickable { expanded = !expanded }
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (streaming) {
                // Pulsing dots
                repeat(3) { idx ->
                    val dotAlpha = if (idx == 0) alpha else if (idx == 1) (1f - alpha + 0.3f).coerceIn(0.3f, 1f) else (alpha * 0.7f + 0.3f)
                    Box(
                        Modifier
                            .padding(end = 4.dp)
                            .size(6.dp)
                            .background(
                                KodaAccentSoft.copy(alpha = dotAlpha),
                                CircleShape,
                            )
                    )
                }
                Spacer(Modifier.width(8.dp))
            }
            
            val timeStr = if (!streaming && timeMs != null) "for ${String.format("%.1f", timeMs / 1000f)}s" else ""
            Text(
                "Thought $timeStr".trim(),
                color = KodaMuted,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f)
            )
            
            Icon(
                if (expanded) Icons.Filled.KeyboardArrowDown else Icons.Filled.ArrowDropDown,
                contentDescription = null,
                tint = KodaMuted,
                modifier = Modifier.size(16.dp)
            )
        }
        
        if (expanded && !thinking.isNullOrEmpty()) {
            HorizontalDivider(color = KodaBorder)
            Box(Modifier.padding(12.dp)) {
                Text(
                    thinking,
                    color = KodaMuted.copy(alpha = 0.9f),
                    fontSize = 13.sp,
                    lineHeight = 20.sp
                )
            }
        }
    }
}

@Composable
private fun EmptyState(onPick: (String) -> Unit) {
    val suggestions = listOf(
        "🔍 Latest breakthroughs in AI",
        "💡 Explain RAG in simple terms",
        "🛠️ Best practices for prompt engineering",
        "🌐 Compare React vs Vue vs Svelte",
    )

    val transition = rememberInfiniteTransition(label = "glow")
    val glowAlpha by transition.animateFloat(
        initialValue = 0.15f,
        targetValue = 0.35f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "glow_alpha",
    )

    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Glowing accent circle behind brand
        Box(contentAlignment = Alignment.Center) {
            Box(
                Modifier
                    .size(80.dp)
                    .offset(y = (-4).dp)
                    .background(
                        Brush.radialGradient(
                            listOf(KodaAccent.copy(alpha = glowAlpha), Color.Transparent)
                        ),
                        CircleShape,
                    )
            )
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Row {
                    Text("Koda", fontSize = 28.sp, fontWeight = FontWeight.Bold)
                    Text("AI", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = KodaAccent)
                }
            }
        }

        Spacer(Modifier.height(6.dp))
        Text(
            "Search-augmented, private AI.",
            color = KodaMuted,
            fontSize = 15.sp,
        )

        Spacer(Modifier.height(28.dp))

        suggestions.forEach { s ->
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .clickable { onPick(s.dropWhile { !it.isLetter() && it != ' ' }.trim()) }
                    .border(1.dp, KodaBorder, RoundedCornerShape(12.dp))
                    .background(KodaSurface.copy(alpha = 0.3f))
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
    onSend: (String, List<org.hsrprojects.kodaai.data.Attachment>) -> Unit,
) {
    var text by rememberSaveable { mutableStateOf("") }
    var attachments by remember { mutableStateOf(emptyList<org.hsrprojects.kodaai.data.Attachment>()) }
    val haptic = LocalHapticFeedback.current
    val context = LocalContext.current

    val pickMultipleMedia = androidx.activity.compose.rememberLauncherForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.GetMultipleContents()
    ) { uris ->
        val newAttachments = mutableListOf<org.hsrprojects.kodaai.data.Attachment>()
        uris.forEach { uri ->
            val type = context.contentResolver.getType(uri) ?: ""
            val name = "attachment_${System.currentTimeMillis()}"
            if (type.startsWith("image/")) {
                val bytes = context.contentResolver.openInputStream(uri)?.use { stream -> stream.readBytes() }
                if (bytes != null) {
                    val base64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
                    newAttachments.add(org.hsrprojects.kodaai.data.ImageAttachment(name, bytes.size.toLong(), base64))
                }
            } else if (type.startsWith("text/") || type.contains("json") || type.contains("csv")) {
                val textContent = context.contentResolver.openInputStream(uri)?.use { stream -> stream.reader().readText() }
                if (textContent != null) {
                    newAttachments.add(org.hsrprojects.kodaai.data.DocumentAttachment(name, textContent.length.toLong(), textContent))
                }
            }
        }
        attachments = attachments + newAttachments
    }

    val submit = {
        if ((text.isNotBlank() || attachments.isNotEmpty()) && !sending) {
            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
            onSend(text, attachments)
            text = ""
            attachments = emptyList()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    listOf(Color.Transparent, KodaSurface.copy(alpha = 0.95f))
                )
            )
            .imePadding()
            .navigationBarsPadding()
            .padding(10.dp)
    ) {
        if (attachments.isNotEmpty()) {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 8.dp)) {
                items(attachments) { a ->
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(KodaSurface2)
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            if (a is org.hsrprojects.kodaai.data.ImageAttachment) Icons.Filled.Add else Icons.Filled.Menu, // Dummy icons for now
                            contentDescription = null,
                            tint = KodaMuted,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(a.name, color = KodaMuted, fontSize = 12.sp, maxLines = 1, modifier = Modifier.widthIn(max = 100.dp))
                        Spacer(Modifier.width(4.dp))
                        Icon(
                            Icons.Filled.Delete,
                            contentDescription = "Remove",
                            tint = KodaAccentSoft,
                            modifier = Modifier.size(14.dp).clickable { attachments = attachments.filter { it != a } }
                        )
                    }
                }
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Bottom,
        ) {
            // Attach toggle
            Box(
                Modifier
                    .padding(bottom = 4.dp)
                    .clip(CircleShape)
                    .background(KodaSurface3)
                    .clickable {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        pickMultipleMedia.launch("*/*")
                    }
                    .padding(10.dp),
            ) {
                Icon(
                    Icons.Filled.Add,
                    contentDescription = "Attach file",
                    tint = KodaMuted,
                    modifier = Modifier.size(20.dp),
                )
            }

            Spacer(Modifier.width(8.dp))

            // Search toggle
            val toggleBg = if (searchEnabled) KodaAccent else KodaSurface3
            val toggleFg = if (searchEnabled) Color.White else KodaMuted
            Box(
                Modifier
                    .padding(bottom = 4.dp)
                    .clip(CircleShape)
                    .background(toggleBg)
                    .clickable {
                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        onToggleSearch()
                    }
                    .padding(10.dp),
            ) {
                Icon(
                    Icons.Filled.Search,
                    contentDescription = "Toggle web search",
                    tint = toggleFg,
                    modifier = Modifier.size(20.dp),
                )
            }

            Spacer(Modifier.width(8.dp))

            OutlinedTextField(
                value = text,
                onValueChange = { text = it },
                placeholder = {
                    Text(
                        if (searchEnabled) "Ask anything…" else "Ask (no search)…",
                        color = KodaMuted.copy(alpha = 0.6f),
                    )
                },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(24.dp),
                maxLines = 4,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = KodaAccent.copy(alpha = 0.6f),
                    unfocusedBorderColor = KodaBorder,
                    cursorColor = KodaAccentSoft,
                ),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = { submit() }),
            )

            Spacer(Modifier.width(8.dp))

            // Send button
            Box(
                modifier = Modifier
                    .padding(bottom = 4.dp)
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(
                        if ((text.isNotBlank() || attachments.isNotEmpty()) && !sending) KodaAccent
                        else KodaSurface3
                    )
                    .clickable(enabled = (text.isNotBlank() || attachments.isNotEmpty()) && !sending) {
                        submit()
                    },
                contentAlignment = Alignment.Center,
            ) {
                if (sending) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = KodaMuted,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Icon(
                        Icons.AutoMirrored.Filled.Send,
                        contentDescription = "Send",
                        tint = if (text.isNotBlank() || attachments.isNotEmpty()) Color.Black else KodaMuted,
                        modifier = Modifier.size(20.dp).offset(x = 2.dp),
                    )
                }
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
