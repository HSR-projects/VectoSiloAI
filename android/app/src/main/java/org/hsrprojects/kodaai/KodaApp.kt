package org.hsrprojects.kodaai

import android.app.Application
import org.hsrprojects.kodaai.data.KodaClient

class KodaApp : Application() {
    override fun onCreate() {
        super.onCreate()
        KodaClient.init(this)
    }
}
