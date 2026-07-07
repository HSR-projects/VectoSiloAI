# kotlinx.serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class **$$serializer { *; }
-keepclasseswithmembers class org.hsrprojects.kodaai.data.** {
    kotlinx.serialization.KSerializer serializer(...);
}
