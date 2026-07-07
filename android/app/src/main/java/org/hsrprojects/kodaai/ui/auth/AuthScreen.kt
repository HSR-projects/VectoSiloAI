package org.hsrprojects.kodaai.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import org.hsrprojects.kodaai.data.UserDto
import org.hsrprojects.kodaai.ui.theme.KodaAccent
import org.hsrprojects.kodaai.ui.theme.KodaAccentSoft
import org.hsrprojects.kodaai.ui.theme.KodaBorder
import org.hsrprojects.kodaai.ui.theme.KodaMuted

@Composable
fun AuthScreen(
    onAuthenticated: (UserDto) -> Unit,
    vm: AuthViewModel = viewModel(),
) {
    var isLogin by rememberSaveable { mutableStateOf(true) }
    var name by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var showGoogle by remember { mutableStateOf(false) }

    val busy by vm.busy.collectAsStateWithLifecycle()
    val error by vm.error.collectAsStateWithLifecycle()
    val notice by vm.notice.collectAsStateWithLifecycle()

    if (showGoogle) {
        GoogleSignInWebView(onResult = { ok ->
            showGoogle = false
            vm.completeGoogleSignIn(ok, onAuthenticated)
        })
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .imePadding()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            buildBrand(),
            fontSize = 30.sp,
            fontWeight = FontWeight.Bold,
        )
        Text(
            "Private, search-augmented AI",
            color = KodaMuted,
            modifier = Modifier.padding(top = 4.dp, bottom = 24.dp),
        )

        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(20.dp)) {
                Text(
                    if (isLogin) "Welcome back" else "Create your account",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(bottom = 16.dp),
                )

                if (!isLogin) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                    )
                }

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth(),
                )

                error?.let {
                    Text(
                        it,
                        color = MaterialTheme.colorScheme.error,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 12.dp),
                    )
                }
                notice?.let {
                    Text(
                        it,
                        color = KodaAccentSoft,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 12.dp),
                    )
                }

                Button(
                    onClick = {
                        vm.submit(isLogin, name, email, password, onAuthenticated)
                    },
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                ) {
                    if (busy) {
                        CircularProgressIndicator(
                            strokeWidth = 2.dp,
                            modifier = Modifier.padding(end = 8.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                        )
                    }
                    Text(if (isLogin) "Sign in" else "Create account")
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 14.dp),
                ) {
                    HorizontalDivider(Modifier.weight(1f), color = KodaBorder)
                    Text("  or  ", color = KodaMuted, fontSize = 12.sp)
                    HorizontalDivider(Modifier.weight(1f), color = KodaBorder)
                }

                OutlinedButton(
                    onClick = { showGoogle = true },
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Continue with Google")
                }

                TextButton(
                    onClick = { isLogin = !isLogin },
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                ) {
                    Text(
                        if (isLogin) "New here? Create an account"
                        else "Already have an account? Sign in",
                        color = KodaMuted,
                    )
                }
            }
        }
    }
}

private fun buildBrand() = androidx.compose.ui.text.buildAnnotatedString {
    append("Koda")
    pushStyle(androidx.compose.ui.text.SpanStyle(color = KodaAccent))
    append("AI")
    pop()
}
