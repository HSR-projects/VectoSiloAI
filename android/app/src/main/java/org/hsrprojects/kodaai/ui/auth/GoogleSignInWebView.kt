package org.hsrprojects.kodaai.ui.auth

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.webkit.CookieManager
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import org.hsrprojects.kodaai.data.KodaClient

/**
 * Runs the server-side Google OAuth flow inside a WebView. When the flow lands
 * back on the app origin, the `koda_session` cookie the backend just set is read
 * from the WebView's CookieManager and adopted into OkHttp's jar.
 *
 * [onResult] is invoked exactly once with true (signed in) or false (error/cancel).
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun GoogleSignInWebView(onResult: (Boolean) -> Unit) {
    val base = KodaClient.baseUrl()
    val handled = remember { mutableStateOf(false) }

    fun finish(success: Boolean) {
        if (handled.value) return
        handled.value = true
        onResult(success)
    }

    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                val cookieManager = CookieManager.getInstance()
                cookieManager.setAcceptCookie(true)

                WebView(ctx).apply {
                    cookieManager.setAcceptThirdPartyCookies(this, true)
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true

                    webViewClient = object : WebViewClient() {
                        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                            if (url == null || handled.value) return
                            when {
                                url.contains("auth_error") -> finish(false)
                                // Back on the app origin and out of the OAuth path
                                // means the callback set the session cookie.
                                url.startsWith(base) && !url.contains("/api/auth/google") -> {
                                    view?.stopLoading()
                                    cookieManager.flush()
                                    val cookies = cookieManager.getCookie(base)
                                    val ok = cookies != null &&
                                        cookies.contains("koda_session=") &&
                                        KodaClient.adoptSessionCookie(cookies)
                                    finish(ok)
                                }
                            }
                        }
                    }

                    loadUrl("$base/api/auth/google/init")
                }
            },
        )
        CircularProgressIndicator()
    }
}
