package org.hsrprojects.kodaai.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.hsrprojects.kodaai.data.KodaClient
import org.hsrprojects.kodaai.data.UserDto

/** Owns the signed-in session: restores it on launch and clears it on logout. */
class MainViewModel : ViewModel() {

    private val _user = MutableStateFlow<UserDto?>(null)
    val user: StateFlow<UserDto?> = _user.asStateFlow()

    private val _booting = MutableStateFlow(true)
    val booting: StateFlow<Boolean> = _booting.asStateFlow()

    init {
        viewModelScope.launch {
            _user.value = KodaClient.me()
            _booting.value = false
        }
    }

    fun onAuthenticated(u: UserDto) {
        _user.value = u
    }

    fun logout() {
        viewModelScope.launch {
            KodaClient.logout()
            _user.value = null
        }
    }
}
