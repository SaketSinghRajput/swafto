# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# ---- OPS-13 (UNVERIFIED-BUILD): R8 keep rules for the release build ----------
# No release build has been made on the machine that wrote these. They are the
# documented rules for each library; the first real `bundleRelease` + boot test
# (Wave 5) is what proves them. A missing rule shows as a launch crash or a
# "class not found" in logcat from JNI/reflection, never as a build error.

# React Native 0.81 / Hermes / fbjni: react-android and hermes-android ship
# consumer rules in their AARs, and the RN template adds nothing to this file.
# These two are the template's documented belt-and-braces for JNI lookups.
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Nitro Modules (react-native-nitro-modules, and MMKV 4.x which is built on it):
# C++ finds these classes by name through JNI (fbjni), so renaming or removing
# them crashes at the first native call. Documented in the Nitro README.
-keep class com.margelo.nitro.** { *; }
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}

# react-native-mmkv: its package class is autolinked by name.
-keep class com.margelo.nitro.mmkv.** { *; }

# op-sqlite: the native module and its JNI bridge are looked up by name.
-keep class com.op.sqlite.** { *; }

# Our own native modules (device lock/share, billing): React Native discovers
# @ReactMethod methods by reflection, so the class and methods must keep names.
-keep class com.swafto.** { *; }
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# Google Play Billing 8.x ships its own consumer rules (AAR); this keeps the
# one interface the service binds to by name, as its documentation lists.
-keep class com.android.vending.billing.** { *; }
