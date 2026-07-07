package org.hsrprojects.kodaai.data

import android.content.Context
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

/**
 * A small persistent cookie jar so the HMAC-signed `koda_session` cookie set by
 * the backend survives app restarts (the session is valid for 30 days). Cookies
 * are stored in SharedPreferences as "originUrl|||Set-Cookie" pairs and rebuilt
 * with [Cookie.parse] against the same origin.
 */
class SessionCookieJar(context: Context) : CookieJar {

    private val prefs =
        context.getSharedPreferences("koda_cookies", Context.MODE_PRIVATE)
    private val cache = mutableMapOf<String, Cookie>()

    init {
        prefs.getStringSet(KEY, emptySet())?.forEach { raw ->
            val sep = raw.indexOf(DELIM)
            if (sep <= 0) return@forEach
            val origin = raw.substring(0, sep).toHttpUrlOrNull() ?: return@forEach
            val header = raw.substring(sep + DELIM.length)
            Cookie.parse(origin, header)?.let { cache[it.name] = it }
        }
    }

    @Synchronized
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        for (c in cookies) cache[c.name] = c
        persist(url)
    }

    @Synchronized
    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val now = System.currentTimeMillis()
        return cache.values.filter { it.expiresAt > now && it.matches(url) }
    }

    /** Store a single cookie directly (used to adopt the OAuth session cookie). */
    @Synchronized
    fun store(url: HttpUrl, cookie: Cookie) {
        cache[cookie.name] = cookie
        persist(url)
    }

    @Synchronized
    fun clear() {
        cache.clear()
        prefs.edit().remove(KEY).apply()
    }

    private fun persist(url: HttpUrl) {
        val origin = "${url.scheme}://${url.host}"
        val set = cache.values.map { "$origin$DELIM$it" }.toSet()
        prefs.edit().putStringSet(KEY, set).apply()
    }

    private companion object {
        const val KEY = "cookies"
        const val DELIM = "|||"
    }
}
