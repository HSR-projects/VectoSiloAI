package org.hsrprojects.kodaai.ui.auth

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
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
import org.hsrprojects.kodaai.ui.theme.KodaAccentDim
import org.hsrprojects.kodaai.ui.theme.KodaMuted

@Composable
fun AuthScreen(
    onAuthenticated: (UserDto) -> Unit,
    vm: AuthViewModel = viewModel(),
) {
    val busy by vm.busy.collectAsStateWithLifecycle()
    val context = LocalContext.current

    // Animated glow behind the brand
    val transition = rememberInfiniteTransition(label = "auth_glow")
    val glowAlpha by transition.animateFloat(
        initialValue = 0.15f,
        targetValue = 0.4f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "glow",
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .imePadding()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Brand with glow
        Box(contentAlignment = Alignment.Center) {
            Box(
                Modifier
                    .size(100.dp)
                    .offset(y = (-6).dp)
                    .background(
                        Brush.radialGradient(
                            listOf(KodaAccent.copy(alpha = glowAlpha), Color.Transparent)
                        ),
                        CircleShape,
                    )
            )
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    buildBrand(),
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "Private, search-augmented AI",
                    color = KodaMuted,
                    fontSize = 14.sp,
                )
            }
        }

        Spacer(Modifier.height(48.dp))

        Text(
            "Welcome to KodaAI Mobile",
            fontSize = 18.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(bottom = 16.dp),
            color = Color.White
        )
        
        Text(
            "To keep your data secure, please authorize the mobile app using the KodaAI website.",
            fontSize = 14.sp,
            color = KodaMuted,
            modifier = Modifier.padding(bottom = 32.dp),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )

        // Submit button with gradient
        Button(
            onClick = {
                val url = "${KodaClient.baseUrl()}/mobile-auth"
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                context.startActivity(intent)
            },
            enabled = !busy,
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = KodaAccent,
                disabledContainerColor = KodaAccentDim,
            ),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            if (busy) {
                CircularProgressIndicator(
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(20.dp),
                    color = Color.White,
                )
                Spacer(Modifier.padding(start = 8.dp))
            }
            Text(
                "Authorize with KodaAI",
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
                color = Color.White
            )
        }

        // App version
        Spacer(Modifier.height(40.dp))
        Text(
            "KodaAI v1.0 • Native Android",
            color = KodaMuted.copy(alpha = 0.4f),
            fontSize = 11.sp,
        )
    }
}

private fun buildBrand() = androidx.compose.ui.text.buildAnnotatedString {
    append("Koda")
    pushStyle(androidx.compose.ui.text.SpanStyle(color = KodaAccent))
    append("AI")
    pop()
}
