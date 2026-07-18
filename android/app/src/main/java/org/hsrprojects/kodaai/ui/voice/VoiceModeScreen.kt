package org.hsrprojects.kodaai.ui.voice

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.draw.blur
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.withTransform
import org.hsrprojects.kodaai.ui.theme.KodaAccent
import org.hsrprojects.kodaai.ui.theme.KodaAccentDim
import org.hsrprojects.kodaai.ui.theme.KodaAccentSoft

@Composable
fun VoiceModeScreen(
    model: String?,
    onClose: () -> Unit,
    vm: VoiceModeViewModel = viewModel()
) {
    val step by vm.step.collectAsStateWithLifecycle()
    val transcript by vm.transcript.collectAsStateWithLifecycle()
    val reply by vm.reply.collectAsStateWithLifecycle()
    val error by vm.error.collectAsStateWithLifecycle()
    val highlightIndex by vm.highlightIndex.collectAsStateWithLifecycle()
    val amplitude by vm.amplitude.collectAsStateWithLifecycle()

    val context = LocalContext.current
    var hasPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        )
    }

    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasPermission = granted
        if (granted) {
            vm.startSession(model)
        } else {
            onClose()
        }
    }

    LaunchedEffect(Unit) {
        if (hasPermission) {
            vm.startSession(model)
        } else {
            launcher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    DisposableEffect(Unit) {
        onDispose { vm.stopSession() }
    }

    val haptic = LocalHapticFeedback.current
    LaunchedEffect(step) {
        when (step) {
            VoiceStep.LISTENING -> haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            VoiceStep.THINKING, VoiceStep.SPEAKING -> haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
            else -> {}
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xD9000000)) // 85% black backdrop
            .blur(32.dp) // Soft blur for depth
            .padding(24.dp)
    ) {
        IconButton(
            onClick = onClose,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 24.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.1f))
        ) {
            Icon(Icons.Filled.Close, contentDescription = "Close", tint = Color.White)
        }

        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Animated Orb
            AnimatedOrb(
                step = step,
                amplitude = amplitude,
                modifier = Modifier
                    .size(240.dp)
                    .clickable(
                        interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
                        indication = null
                    ) {
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        vm.tapOrb(model)
                    }
            )

            Spacer(Modifier.height(48.dp))

            // State label
            val label = when (step) {
                VoiceStep.IDLE -> "TAP TO SPEAK"
                VoiceStep.LISTENING -> "LISTENING…"
                VoiceStep.TRANSCRIBING -> "TRANSCRIBING…"
                VoiceStep.THINKING -> "THINKING…"
                VoiceStep.SPEAKING -> "SPEAKING…"
                VoiceStep.ERROR -> "ERROR"
            }
            Text(
                label,
                color = Color.White.copy(alpha = 0.7f),
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 2.sp,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(24.dp))

            // Text content
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp),
                contentAlignment = Alignment.TopCenter
            ) {
                if (error != null) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(error ?: "", color = Color(0xFFF87171), textAlign = TextAlign.Center)
                        Spacer(Modifier.height(16.dp))
                        Button(
                            onClick = { vm.tapOrb(model) },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White)
                        ) {
                            Text("Retry", color = Color.Black)
                        }
                    }
                } else if (step == VoiceStep.SPEAKING && reply.isNotEmpty()) {
                    WordHighlightedText(reply, highlightIndex)
                } else if (step == VoiceStep.THINKING || step == VoiceStep.TRANSCRIBING) {
                    Text(
                        if (reply.isEmpty()) "…" else reply,
                        color = Color.White.copy(alpha = 0.6f),
                        fontSize = 18.sp,
                        textAlign = TextAlign.Center,
                        maxLines = 4
                    )
                } else {
                    Text(
                        transcript,
                        color = Color.White.copy(alpha = 0.9f),
                        fontSize = 20.sp,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

@Composable
fun AnimatedOrb(step: VoiceStep, amplitude: Float, modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "orb")

    // Idle breathing animation
    val breathe by infiniteTransition.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "breathe"
    )

    // Thinking rotation animation
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation"
    )

    // Smooth amplitude for listening/speaking (audio reactive)
    val smoothedAmp by animateFloatAsState(
        targetValue = amplitude,
        animationSpec = tween(100, easing = LinearEasing),
        label = "amp"
    )
    
    val time by infiniteTransition.animateFloat(
        initialValue = 0f, 
        targetValue = (2.0 * Math.PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(4000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "time"
    )
    
    val path = remember { Path() }

    Canvas(modifier = modifier) {
        val center = Offset(size.width / 2, size.height / 2)
        val baseRadius = size.minDimension / 4f
        
        // Build the fluid blob path
        val points = 80
        path.reset()
        for (i in 0..points) {
            val angle = (i.toFloat() / points) * 2f * Math.PI.toFloat()
            // Wobble math: natural noise based on angle and time
            val noise = Math.sin((angle * 3 + time).toDouble()).toFloat() * 0.06f + 
                        Math.cos((angle * 5 - time * 1.5f).toDouble()).toFloat() * 0.04f
            
            // Amplitude impact for audio reactivity
            val currentAmp = smoothedAmp * 0.4f
            val reactive = Math.sin((angle * 4 + time * 3f).toDouble()).toFloat() * currentAmp
            
            val r = baseRadius * 1.5f * (1f + noise + reactive)
            
            val x = center.x + r * Math.cos(angle.toDouble()).toFloat()
            val y = center.y + r * Math.sin(angle.toDouble()).toFloat()
            
            if (i == 0) path.moveTo(x, y)
            else path.lineTo(x, y)
        }
        path.close()

        when (step) {
            VoiceStep.IDLE, VoiceStep.ERROR -> {
                scale(scale = breathe) {
                    drawPath(
                        path = path,
                        brush = Brush.radialGradient(
                            colors = listOf(Color.White, Color.White.copy(alpha = 0.2f), Color.Transparent),
                            center = center,
                            radius = baseRadius * 2f
                        )
                    )
                }
            }
            VoiceStep.LISTENING -> {
                // Reactive cyan/white blob
                val reactiveScale = 1f + (smoothedAmp * 0.5f)
                scale(scale = reactiveScale) {
                    drawPath(
                        path = path,
                        brush = Brush.radialGradient(
                            colors = listOf(Color.White, Color(0xFF67E8F9).copy(alpha = 0.5f), Color.Transparent),
                            center = center,
                            radius = baseRadius * 2.5f
                        )
                    )
                }
            }
            VoiceStep.TRANSCRIBING, VoiceStep.THINKING -> {
                // Swirling purple blob
                withTransform({
                    rotate(rotation, center)
                }) {
                    drawPath(
                        path = path,
                        brush = Brush.sweepGradient(
                            colors = listOf(KodaAccent, KodaAccentSoft, Color.Transparent, KodaAccent),
                            center = center
                        )
                    )
                    // Inner dark circle to make it a ring
                    drawCircle(color = Color.Black, radius = baseRadius * 1.2f, center = center)
                }
            }
            VoiceStep.SPEAKING -> {
                // Aggressively reactive bright purple blob
                val reactiveScale = 1f + (smoothedAmp * 0.7f)
                scale(scale = reactiveScale) {
                    drawPath(
                        path = path,
                        brush = Brush.radialGradient(
                            colors = listOf(Color.White, KodaAccentSoft, KodaAccentDim.copy(alpha = 0.4f), Color.Transparent),
                            center = center,
                            radius = baseRadius * 2.5f
                        )
                    )
                }
            }
        }
    }
}

@Composable
fun WordHighlightedText(text: String, highlightIndex: Int) {
    val words = text.split("\\s+".toRegex())
    // Using a simple wrapping layout would be ideal (like FlowRow), but for simplicity
    // we'll just render it as a single string with spans if we had AnnotatedString, 
    // or just raw text if not. Since we want smooth highlighting, we will render it
    // as an AnnotatedString.
    
    val annotated = androidx.compose.ui.text.buildAnnotatedString {
        words.forEachIndexed { index, word ->
            if (index == highlightIndex) {
                pushStyle(androidx.compose.ui.text.SpanStyle(
                    color = KodaAccentSoft,
                    fontWeight = FontWeight.Bold
                ))
            } else {
                pushStyle(androidx.compose.ui.text.SpanStyle(
                    color = Color.White.copy(alpha = 0.8f)
                ))
            }
            append(word)
            append(" ")
            pop()
        }
    }

    Text(
        text = annotated,
        fontSize = 18.sp,
        textAlign = TextAlign.Center,
        lineHeight = 26.sp
    )
}
