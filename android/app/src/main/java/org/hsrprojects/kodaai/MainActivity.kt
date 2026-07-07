package org.hsrprojects.kodaai

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import org.hsrprojects.kodaai.ui.MainViewModel
import org.hsrprojects.kodaai.ui.auth.AuthScreen
import org.hsrprojects.kodaai.ui.chat.ChatScreen
import org.hsrprojects.kodaai.ui.theme.KodaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            KodaTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AppRoot()
                }
            }
        }
    }
}

@Composable
private fun AppRoot(vm: MainViewModel = viewModel()) {
    val booting by vm.booting.collectAsStateWithLifecycle()
    val user by vm.user.collectAsStateWithLifecycle()

    when {
        booting -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        user == null -> AuthScreen(onAuthenticated = vm::onAuthenticated)
        else -> ChatScreen(user = user!!, onLogout = vm::logout)
    }
}
