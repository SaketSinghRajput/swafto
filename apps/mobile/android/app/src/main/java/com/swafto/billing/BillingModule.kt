package com.swafto.billing

import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClient.BillingResponseCode
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

/**
 * PR-7 · Google Play Billing, as small as it can be (apps/mobile/src/net/billing.ts).
 *
 * Three jobs and no more: read the product's base plans and Play's prices, open
 * Play's purchase sheet with the obfuscated account id the SERVER supplied, and
 * hand back the purchase token. It never acknowledges and never decides whether
 * a purchase is Premium - the server does both, after asking Google (R4 §2).
 *
 * Anything that is not a real purchase resolves as such: "unavailable" when Play
 * or the product is not there (Play Console is not set up yet, R4-HA1/3/4),
 * "cancelled", "pending" or "failed". Never a token that was not given.
 */
class BillingModule(private val ctx: ReactApplicationContext) :
  ReactContextBaseJavaModule(ctx), PurchasesUpdatedListener {

  private val client: BillingClient =
    BillingClient.newBuilder(ctx)
      .setListener(this)
      .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
      .build()

  /** The purchase sheet in flight. One at a time; a second tap while it is open is refused. */
  private var inFlight: Promise? = null

  override fun getName() = "SwaftoBilling"

  private fun connected(onReady: () -> Unit, onFail: () -> Unit) {
    if (client.isReady) return onReady()
    client.startConnection(object : BillingClientStateListener {
      override fun onBillingSetupFinished(result: BillingResult) {
        if (result.responseCode == BillingResponseCode.OK) onReady() else onFail()
      }
      override fun onBillingServiceDisconnected() {}
    })
  }

  private fun details(productId: String, done: (ProductDetails?) -> Unit) {
    val params = QueryProductDetailsParams.newBuilder()
      .setProductList(
        listOf(
          QueryProductDetailsParams.Product.newBuilder()
            .setProductId(productId)
            .setProductType(BillingClient.ProductType.SUBS)
            .build()
        )
      ).build()
    client.queryProductDetailsAsync(params) { result, found ->
      done(if (result.responseCode == BillingResponseCode.OK) found.productDetailsList.firstOrNull() else null)
    }
  }

  @ReactMethod
  fun productDetails(productId: String, promise: Promise) {
    connected({
      details(productId) { product ->
        if (product == null) return@details promise.reject("unavailable", "no such product in Play")
        val plans = Arguments.createArray()
        // Base plans only: an offer (offerId != null) is a discount, and none is configured.
        for (offer in product.subscriptionOfferDetails.orEmpty().filter { it.offerId == null }) {
          val phase = offer.pricingPhases.pricingPhaseList.firstOrNull() ?: continue
          plans.pushMap(Arguments.createMap().apply {
            putString("basePlanId", offer.basePlanId)
            putString("offerToken", offer.offerToken)
            // Exact up to 2^53 micros; a price is far below that. Converted to paise in JS.
            putDouble("priceAmountMicros", phase.priceAmountMicros.toDouble())
            putString("formattedPrice", phase.formattedPrice)
            putString("billingPeriod", phase.billingPeriod)
          })
        }
        promise.resolve(Arguments.createMap().apply { putArray("plans", plans) })
      }
    }, { promise.reject("unavailable", "Google Play Billing is not available on this device") })
  }

  @ReactMethod
  fun purchase(productId: String, offerToken: String, obfuscatedAccountId: String, promise: Promise) {
    val activity = ctx.currentActivity
    if (activity == null || inFlight != null) return promise.resolve(outcome("unavailable", code = "busy"))
    connected({
      details(productId) { product ->
        if (product == null) return@details promise.resolve(outcome("unavailable", code = "no product"))
        val flow = BillingFlowParams.newBuilder()
          .setProductDetailsParamsList(
            listOf(
              BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(product)
                .setOfferToken(offerToken)
                .build()
            )
          )
          .setObfuscatedAccountId(obfuscatedAccountId)
          .build()
        inFlight = promise
        val launched = client.launchBillingFlow(activity, flow)
        if (launched.responseCode != BillingResponseCode.OK) {
          inFlight = null
          promise.resolve(fromCode(launched.responseCode))
        }
      }
    }, { promise.resolve(outcome("unavailable", code = "no billing service")) })
  }

  override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
    val promise = inFlight ?: return
    inFlight = null
    if (result.responseCode != BillingResponseCode.OK) return promise.resolve(fromCode(result.responseCode))
    val bought = purchases?.firstOrNull()
    when (bought?.purchaseState) {
      Purchase.PurchaseState.PURCHASED -> promise.resolve(outcome("purchased", bought.purchaseToken))
      Purchase.PurchaseState.PENDING -> promise.resolve(outcome("pending"))
      else -> promise.resolve(outcome("failed", code = "no purchase"))
    }
  }

  private fun fromCode(code: Int) = when (code) {
    BillingResponseCode.USER_CANCELED -> outcome("cancelled")
    BillingResponseCode.BILLING_UNAVAILABLE,
    BillingResponseCode.SERVICE_UNAVAILABLE,
    BillingResponseCode.SERVICE_DISCONNECTED,
    BillingResponseCode.FEATURE_NOT_SUPPORTED,
    BillingResponseCode.ITEM_UNAVAILABLE,
    BillingResponseCode.DEVELOPER_ERROR -> outcome("unavailable", code = code.toString())
    else -> outcome("failed", code = code.toString())
  }

  private fun outcome(kind: String, token: String? = null, code: String? = null) =
    Arguments.createMap().apply {
      putString("outcome", kind)
      if (token != null) putString("purchaseToken", token)
      if (code != null) putString("code", code)
    }
}

class BillingPackage : ReactPackage {
  override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> = listOf(BillingModule(ctx))
  override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
