package com.swafto

import android.content.res.Configuration
import android.os.Bundle
import android.content.Intent
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "SWAFTO"

  /**
   * THE SYSTEM BARS SAT ON TOP OF THE APP, AND ONLY A REAL HANDSET SHOWED IT.
   *
   * On the first launch on a Galaxy A36 the brand bar drew UNDER the status bar:
   * the screen title and the system clock were painted in the same place. The
   * bottom was the same story against the gesture pill.
   *
   * Android 15 made edge-to-edge the default for apps targeting SDK 35, and
   * Android 16 REMOVED the opt-out for apps targeting 36 - this app targets 36
   * and the test device runs 16, so `windowOptOutEdgeToEdgeEnforcement` and
   * React Native's own `edgeToEdgeEnabled=false` in gradle.properties are both
   * ignored by the OS. The window is edge-to-edge whether the app asks for it
   * or not, so the app has to inset itself.
   *
   * NO INSTRUMENT IN THIS REPOSITORY COULD HAVE CAUGHT THIS. `check:layout`
   * measures a 360x800 viewport in headless Chromium and the contact sheet
   * renders the same way; neither has a status bar, a gesture pill or a display
   * cutout. It is H8 - "a real handset" - being exactly the thing it was listed
   * as.
   *
   * WHY HERE AND NOT IN JAVASCRIPT. The alternatives were a new native
   * dependency (`react-native-safe-area-context`) or `StatusBar.currentHeight`,
   * which covers the top only and would leave the bottom to a hardcoded guess -
   * a raw value and an invented number, both of which this build forbids. The
   * platform already reports every inset exactly; this asks it.
   *
   * `systemBars()` covers the status bar, the navigation bar and the gesture
   * pill; `displayCutout()` covers a punch-hole or notch in landscape. Taking
   * the maximum of the two is what AndroidX documents, because on a cutout
   * device in landscape the cutout can exceed the bar inset.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    fontScale = resources.configuration.fontScale
    val content = findViewById<android.view.View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, windowInsets ->
      /*
       * `ime()` TOO (DV-6). Under enforced edge-to-edge `adjustResize` no
       * longer shrinks the window, so the keyboard drew straight over the
       * new-customer sheet and hid its phone field - found on the device.
       * The keyboard's inset is the bottom padding while it is open, which is
       * what adjustResize used to do.
       */
      val insets =
          windowInsets.getInsets(
              WindowInsetsCompat.Type.systemBars() or
                  WindowInsetsCompat.Type.displayCutout() or
                  WindowInsetsCompat.Type.ime())
      view.setPadding(insets.left, insets.top, insets.right, insets.bottom)
      /*
       * CONSUMED, not the insets themselves: the padding has been applied here,
       * and passing them on would let a child apply the same inset a second
       * time - which reads as a stripe of dead space rather than as a bug.
       */
      WindowInsetsCompat.CONSUMED
    }
  }

  /**
   * HT-35: A FONT-SIZE CHANGE WHILE THE APP IS OPEN STARTS A FRESH PROCESS.
   *
   * Recreating the activity (Android's default) reopened on the splash screen,
   * and in BOTH that and a handled change React Native's Fabric text layer
   * reused measurements made at the OLD scale: new glyphs in old boxes, clipped
   * on every screen until a force-stop. Refreshing DisplayMetricsHolder and
   * remounting the tree were both tried on the device and neither cleared it;
   * only a new process did. The book is on disk (SQLite survives an exit); what
   * is lost is a half-typed figure, which is better than a screen nobody can
   * read. The fresh process opens where the stored state says (Host).
   * ponytail: process restart; drop it when Fabric re-measures on fontScale.
   */
  private var fontScale = 0f

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    if (fontScale != 0f && newConfig.fontScale != fontScale) {
      val relaunch = packageManager.getLaunchIntentForPackage(packageName)
      if (relaunch != null) {
        relaunch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        startActivity(relaunch)
        Runtime.getRuntime().exit(0)
      }
    }
    fontScale = newConfig.fontScale
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
