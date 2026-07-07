package org.hsrprojects.kodaai.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import org.hsrprojects.kodaai.data.AuthResult
import org.hsrprojects.kodaai.data.KodaClient
import org.hsrprojects.kodaai.data.UserDto

class AuthViewModel : ViewModel() {

    val busy = MutableStateFlow(false)
    val error = MutableStateFlow<String?>(null)
    val notice = MutableStateFlow<String?>(null)

    fun submit(
        isLogin: Boolean,
        name: String,
        email: String,
        password: String,
        onAuthenticated: (UserDto) -> Unit,
    ) {
        if (busy.value) return
        val trimmedEmail = email.trim()
        if (trimmedEmail.isEmpty() || password.isEmpty() || (!isLogin && name.isBlank())) {
            error.value = "Please fill in all fields."
            return
        }
        viewModelScope.launch {
            busy.value = true
            error.value = null
            notice.value = null
            val result = if (isLogin) {
                KodaClient.login(trimmedEmail, password)
            } else {
                KodaClient.register(name.trim(), trimmedEmail, password)
            }
            when (result) {
                is AuthResult.Success -> onAuthenticated(result.user)
                is AuthResult.NeedsVerification ->
                    notice.value =
                        "We sent a verification link to ${result.email}. " +
                        "Click it to activate your account, then sign in."
                is AuthResult.Error -> error.value = result.message
            }
            busy.value = false
        }
    }

    /**
     * Called after the Google OAuth WebView completes. On success the session
     * cookie is already adopted, so we just resolve the current user.
     */
    fun completeGoogleSignIn(success: Boolean, onAuthenticated: (UserDto) -> Unit) {
        if (!success) {
            error.value = "Google sign-in was cancelled or failed."
            return
        }
        viewModelScope.launch {
            busy.value = true
            error.value = null
            val user = KodaClient.me()
            if (user != null) onAuthenticated(user) else error.value = "Could not complete Google sign-in."
            busy.value = false
        }
    }
}
