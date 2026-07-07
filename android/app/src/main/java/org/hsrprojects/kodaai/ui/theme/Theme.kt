package org.hsrprojects.kodaai.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val KodaBg = Color(0xFF0A0A0C)
val KodaSurface = Color(0xFF141417)
val KodaSurface2 = Color(0xFF1E1E23)
val KodaBorder = Color(0xFF2A2A31)
val KodaText = Color(0xFFE8E8EA)
val KodaMuted = Color(0xFF9A9AA2)
val KodaAccent = Color(0xFF7C3AED)
val KodaAccentSoft = Color(0xFFA78BFA)

private val KodaColors = darkColorScheme(
    primary = KodaAccent,
    onPrimary = Color.White,
    secondary = KodaAccentSoft,
    background = KodaBg,
    onBackground = KodaText,
    surface = KodaSurface,
    onSurface = KodaText,
    surfaceVariant = KodaSurface2,
    onSurfaceVariant = KodaMuted,
    outline = KodaBorder,
    error = Color(0xFFF87171),
)

@Composable
fun KodaTheme(content: @Composable () -> Unit) {
    // The app is dark-first to match the web product; ignore system light mode.
    @Suppress("UNUSED_EXPRESSION")
    isSystemInDarkTheme()
    MaterialTheme(colorScheme = KodaColors, content = content)
}
