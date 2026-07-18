package org.hsrprojects.kodaai.ui.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import org.hsrprojects.kodaai.data.KodaClient
import org.hsrprojects.kodaai.data.UserDto
import org.hsrprojects.kodaai.ui.theme.KodaAccent
import org.hsrprojects.kodaai.ui.theme.KodaBorder
import org.hsrprojects.kodaai.ui.theme.KodaMuted
import org.hsrprojects.kodaai.ui.theme.KodaSurface

private val AVATAR_COLORS = listOf(
    "#7c3aed", "#2563eb", "#0891b2", "#16a34a",
    "#d97706", "#e11d48", "#db2777", "#475569"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    user: UserDto,
    onBack: () -> Unit,
    onLogout: () -> Unit,
    onUserUpdated: (UserDto) -> Unit,
    vm: SettingsViewModel = viewModel()
) {
    val busy by vm.busy.collectAsStateWithLifecycle()
    val context = LocalContext.current

    var nameDraft by remember { mutableStateOf(user.name) }
    var colorDraft by remember { mutableStateOf(user.avatarColor ?: AVATAR_COLORS.first()) }
    
    // Quick fix for avatar color from user if it exists. Dto.kt might not have it yet.
    // Wait, UserDto in Dto.kt doesn't have avatarColor! Let me rely on the web app's defaults or just use the draft.

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = KodaSurface,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        },
        containerColor = Color.Black
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            
            // Profile Section
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Profile", color = KodaMuted, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                
                OutlinedTextField(
                    value = nameDraft,
                    onValueChange = { nameDraft = it },
                    label = { Text("Display Name") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Text("Avatar Color", color = KodaMuted, fontSize = 12.sp)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(AVATAR_COLORS) { hex ->
                        val color = Color(android.graphics.Color.parseColor(hex))
                        val isSelected = colorDraft == hex
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(color)
                                .clickable { colorDraft = hex }
                                .padding(4.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            if (isSelected) {
                                Icon(Icons.Default.Check, contentDescription = "Selected", tint = Color.White)
                            }
                        }
                    }
                }

                Button(
                    onClick = {
                        vm.updateProfile(nameDraft, colorDraft, onUserUpdated)
                    },
                    enabled = !busy && (nameDraft != user.name || colorDraft != (user.avatarColor ?: AVATAR_COLORS.first())),
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = KodaAccent)
                ) {
                    if (busy) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.padding(start = 8.dp))
                    }
                    Text("Save Profile", color = Color.White)
                }
            }
            
            // Advanced Settings
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Account", color = KodaMuted, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                
                Button(
                    onClick = {
                        val url = KodaClient.baseUrl()
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        context.startActivity(intent)
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = KodaBorder)
                ) {
                    Text("Manage Account on Web (2FA, Password)", color = Color.White)
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = onLogout,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Red.copy(alpha = 0.8f))
            ) {
                Text("Sign Out", color = Color.White)
            }
        }
    }
}
