package org.hsrprojects.kodaai

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import org.hsrprojects.kodaai.ui.MainViewModel
import org.hsrprojects.kodaai.ui.auth.AuthScreen
import org.hsrprojects.kodaai.ui.chat.ChatScreen
import org.hsrprojects.kodaai.ui.theme.KodaTheme

class MainActivity : ComponentActivity() {

    private val vm: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        handleIntent(intent)
        setContent {
            KodaTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AppRoot(vm)
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        if (intent?.action == Intent.ACTION_VIEW && intent.data?.scheme == "kodaai" && intent.data?.host == "auth") {
            val token = intent.data?.getQueryParameter("token")
            if (token != null) {
                vm.adoptToken(token)
            }
        }
    }
}

@Composable
private fun AppRoot(vm: MainViewModel) {
    val booting by vm.booting.collectAsStateWithLifecycle()
    val user by vm.user.collectAsStateWithLifecycle()
    val showSettings by vm.showSettings.collectAsStateWithLifecycle()

    when {
        booting -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        user == null -> AuthScreen(onAuthenticated = vm::onAuthenticated)
        showSettings -> org.hsrprojects.kodaai.ui.settings.SettingsScreen(
            user = user!!,
            onBack = { vm.setShowSettings(false) },
            onLogout = vm::logout,
            onUserUpdated = vm::onAuthenticated
        )
        else -> ChatScreen(
            user = user!!, 
            onLogout = vm::logout,
            onSettingsClick = { vm.setShowSettings(true) }
        )
    }
}
