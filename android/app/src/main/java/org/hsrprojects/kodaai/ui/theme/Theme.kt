package org.hsrprojects.kodaai.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// ─── Color tokens ────────────────────────────────────────────────────────────

val KodaBg = Color(0xFF0A0A0C)
val KodaSurface = Color(0xFF141417)
val KodaSurface2 = Color(0xFF1E1E23)
val KodaSurface3 = Color(0xFF262630)
val KodaBorder = Color(0xFF2A2A31)
val KodaText = Color(0xFFE8E8EA)
val KodaMuted = Color(0xFF9A9AA2)
val KodaAccent = Color(0xFF10B981)
val KodaAccentSoft = Color(0xFF34D399)
val KodaAccentDim = Color(0xFF047857)
val KodaSuccess = Color(0xFF4ADE80)
val KodaWarning = Color(0xFFFBBF24)

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

// ─── Typography ──────────────────────────────────────────────────────────────
// Uses the system sans-serif (which is typically Roboto/Google Sans on modern
// Android) with tuned weights and sizes for a premium look.

private val KodaTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 34.sp,
        letterSpacing = (-0.5).sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 22.sp,
        lineHeight = 28.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
        lineHeight = 24.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 16.sp,
        lineHeight = 22.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        letterSpacing = 0.1.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.5.sp,
    ),
)

@Composable
fun KodaTheme(content: @Composable () -> Unit) {
    // Dark-first theme matching the web product.
    MaterialTheme(
        colorScheme = KodaColors,
        typography = KodaTypography,
        content = content,
    )
}
