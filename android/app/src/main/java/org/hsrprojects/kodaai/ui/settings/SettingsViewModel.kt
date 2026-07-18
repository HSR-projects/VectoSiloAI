package org.hsrprojects.kodaai.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.hsrprojects.kodaai.data.KodaClient
import org.hsrprojects.kodaai.data.UserDto

class SettingsViewModel : ViewModel() {

    private val _availableModels = MutableStateFlow<List<String>>(emptyList())
    val availableModels: StateFlow<List<String>> = _availableModels.asStateFlow()

    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy.asStateFlow()

    init {
        viewModelScope.launch {
            val resp = KodaClient.models()
            _availableModels.value = resp.models
        }
    }

    fun updateProfile(name: String, avatarColor: String, onUpdated: (UserDto) -> Unit) {
        if (_busy.value) return
        viewModelScope.launch {
            _busy.value = true
            val updatedUser = KodaClient.updateAccount(
                name = name.ifBlank { null },
                avatarColor = avatarColor.ifBlank { null }
            )
            if (updatedUser != null) {
                onUpdated(updatedUser)
            }
            _busy.value = false
        }
    }
}
