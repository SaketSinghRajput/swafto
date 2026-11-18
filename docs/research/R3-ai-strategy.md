# R3 · AI strategy: chatbot, shop-context answers, forecasting

*Researched 2026-10-26 by the AI/ML research agent. No app code changed.*

**Number discipline.** Every figure below is one of three kinds and is labelled:
**[cited]**: taken from the linked source, on the source's hardware, not ours;
**[estimate]**: arithmetic or judgement by this research agent, not measured;
**[unmeasured]**: we have no number and say so. Nothing here was measured on
the target ₹7,000 handset. The first engineering task of any AI work is to
measure it (section 7).

**Scope note (product owner, 2026-10-26).** No stock or inventory availability
is tracked in either plan. No reorder point, no stock-on-hand, no "you will run
out". Item-level *sales history* (products per sale, Premium) remains in scope:
item demand forecasts, top and slow items, customer buying patterns. Note that
V1's decision D5 removes item data entirely; Premium item capture needs its own
recorded decision before any item feature below is built.

---

## 1 · Recommendation in one screen

| Need | Recommendation | Model | Server cost |
|---|---|---|---|
| Free chatbot | Trilingual FAQ + intent matcher in pure TypeScript, on device | none | ₹0 |
| Paid shop-context chatbot | **Hybrid (c) without the LLM**: intent + slots → formula-engine query → i18n template. Numbers come only from the engine | none in V1 | ₹0 |
| Free-text understanding, if the matcher proves too weak | Add `multilingual-e5-small` (MIT) embeddings on device via `onnxruntime-react-native` (MIT), *only* for intent routing | small encoder | ₹0 |
| Generative phrasing | **Rejected for now.** Revisit only if a measured gap appears and a native Odia reviewer signs off | none | none |
| Reports and predictions | Deterministic, explainable forecasting in `formula-engine` style: seasonal naive, Holt-Winters/ETS, Croston/TSB, festival-week comparison, RFM, basket co-occurrence; each gated on data and on beating seasonal naive | none | ₹0 |

The paid tier's value is *the shop's own numbers, asked in its own language*.
That is a query problem, not a generation problem. The engine already computes
every figure correctly, offline, clock-free, in integer paise; the i18n layer
already phrases things in Odia, Hindi and English. A language model adds the one
thing this product forbids, a number nobody typed and nobody derived, and the
evidence (section 3.3) is that the small models that fit a phone are close to
chance on Odia.

---

## 2 · Free chatbot: FAQ + intent matching, offline, zero server cost

### Design

```
user text ──normalise──▶ tokens + char-trigrams ──score vs intent bank──▶ best intent (+ margin)
   (NFC, lowercase,          (script-agnostic:              │
    strip punctuation,       Odia, Devanagari,              ├─ static intent → FAQ answer (i18n key)
    digits → ASCII)          Latin, romanised Hindi)        ├─ data intent   → engine call → template
                                                            └─ low margin    → "Did you mean…" top 3 chips
```

- **Intent bank** lives beside the existing i18n bundles: per intent, an answer
  key plus 10–30 example phrasings per language, *including romanised Hindi and
  romanised Odia* ("aaj ka sale", "udhar kete") and code-mixing. Shopkeepers type
  the way they speak.
- **Scoring**: TF-IDF over word tokens + character trigrams, cosine against each
  intent's examples. Character trigrams survive spelling variation and the
  matra/halant differences that break exact keyword matching in Indic scripts.
  Roughly 150 lines of TypeScript, no dependency, bank under 100 KB **[estimate]**.
- **Answer only above a threshold with a margin over the second intent**;
  otherwise show the top three as tappable chips. A wrong confident answer is
  worse than a choice.
- **Data intents** ("today's sales?", "who owes me most?") call the same
  formula-engine functions the Today and Reports tabs already use. A free-tier
  user can ask "today's sales" because the figure is already on their screen;
  the chatbot is another way to reach it.
- **Never an instruction.** Observations are phrased as something to review,
  consistent with CLAUDE.md's derived-output rule.

### Why not a model here

The free tier must run on every handset with no download and no server. A
deterministic matcher is testable with a fixed corpus (labelled phrasings to
intent), reproducible like the vector corpus, and explainable when it misfires.

### Acceptance (before shipping)

Build a labelled test set of at least 300 real phrasings per language, collected
from pilot shopkeepers, not written by us. Report top-1 intent accuracy and the
"chips shown" rate per language. **No target is set here**: thresholds belong in
`BENCHMARKS.md`, which is SHA-locked, and adding one is a human decision.

---

## 3 · Paid chatbot: three options compared

### 3.1 Option (a): small LLM on device

**Runtimes**

| Runtime | Licence | Android notes |
|---|---|---|
| `llama.rn` (llama.cpp binding) | MIT [cited, [GitHub](https://github.com/mybigday/llama.rn), npm] | arm64-v8a / x86_64 only; v0.10+ requires New Architecture (we have it); OpenCL only on Adreno 700+, Hexagon NPU only on Snapdragon 8 Gen 1+ [cited, same]. So on a ₹7,000 phone it is **CPU only** |
| ExecuTorch | BSD-3-Clause [cited via secondary sources, e.g. [Snyk](https://snyk.io/advisor/python/executorch); confirm upstream LICENSE] | Meta's path for Llama 3.2 quantised models |
| MLC LLM | Apache-2.0 [cited via [Cactus comparison](https://cactuscompute.com/compare/mlc-llm-vs-executorch); confirm upstream LICENSE] | GPU-oriented (OpenCL/Vulkan); weak fit for budget Mali GPUs [estimate] |

The `llama.rn@0.13.0-rc.8` npm package unpacks to 63.5 MB [cited, `npm view`];
that covers all ABIs and backends, so what it adds to the arm64 split is
**[unmeasured]**.

**Models (licence must allow commercial use)**

| Model | Params | Q4_K_M GGUF size | Licence | Hindi | Odia | Verdict |
|---|---|---|---|---|---|---|
| Qwen3-0.6B | 0.6B | 397 MB [cited, [unsloth GGUF](https://huggingface.co/unsloth/Qwen3-0.6B-GGUF)] | Apache-2.0 [cited, [Qwen3 blog](https://qwenlm.github.io/blog/qwen3/)] | listed | listed as "Oriya", one of 119 [cited, same] | Best licence and language coverage of the small set. Odia quality **[unmeasured]** |
| Qwen3-1.7B | 1.7B | 1.11 GB [cited, [unsloth GGUF](https://huggingface.co/unsloth/Qwen3-1.7B-GGUF)] | Apache-2.0 [cited] | listed | listed | Too large for 3–4 GB RAM alongside the app [estimate] |
| Qwen2.5-0.5B / 1.5B | 0.5 / 1.54B | not checked | Apache-2.0 [cited, [model card](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)] (Qwen2.5-3B is *not* Apache) | "over 29 languages" | not claimed | Superseded by Qwen3 |
| Gemma 3 1B | 1B | not checked | Gemma Terms of Use: commercial use and distribution allowed, but the Prohibited Use Policy must be passed downstream, and Google "reserves the right to restrict (remotely or otherwise)" [cited, [terms](https://ai.google.dev/gemma/terms)] | **English only** [cited, [HF blog](https://huggingface.co/blog/gemma3)] | no | Disqualified: English only |
| Gemma 3 270M | ~0.3B | not checked | Gemma Terms (as above) | 140-language training data [cited, [model card](https://huggingface.co/google/gemma-3-270m)] | in training data | Meant to be fine-tuned for a narrow task; too weak for open chat [estimate]. Licence carries flow-down obligations |
| Llama 3.2 1B | 1B | 1,083 MB SpinQuant [cited, [model card](https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct)] | Llama 3.2 Community Licence; commercial use allowed below 700M MAU [cited, same] | official | **not** in official list | Disqualified for Odia |
| SmolLM2 | 135M–1.7B | not checked | Apache-2.0 (not re-fetched) | English-centric | no | Disqualified for Indic |
| Sarvam-1 | 2B | not checked | **Sarvam non-commercial licence** [cited, [HF](https://huggingface.co/sarvamai/sarvam-1)] | yes | yes, one of 10 Indic [cited] | Best Indic coverage, **disqualified by licence** |
| Sarvam-M | 24B | not checked | Apache-2.0 (not re-fetched) | yes | yes | Far too large for a phone; server-only |

**Speed and memory on device.** No source found reports tokens/sec for a
0.5–1B model on a MediaTek Helio G-85 / G-99 / Snapdragon 680-class SoC, the chips in
₹7,000 phones. What exists is flagship data: Llama 3.2 1B SpinQuant on a
OnePlus 12 at 50.2 tok/s decode, 1,921 MB RSS [cited, Meta model card];
Llama-3.2-1B Q4_0 via llama.cpp CPU at about 12 tok/s on a Snapdragon phone
[cited, [snapdragon-npu-llm](https://github.com/avisre/snapdragon-npu-llm/blob/main/docs/BENCHMARKS.md), a repo write-up];
Qwen2.5 1.5B 4-bit at 10.83 tok/s mean across flagship platforms
[cited, [arXiv 2603.23640](https://arxiv.org/html/2603.23640v2)]. Budget-chip
throughput is **[unmeasured]**; expect it to be several times lower [estimate].

**Collision with the locked benchmarks.** B24 caps the arm64 APK download at
25 MB and B22 caps peak memory during day close at 220 MB. A 397 MB model cannot
ship in the APK and would need a post-install download; its resident memory alone
would exceed the B22 figure if loaded during close **[estimate]**. Neither
threshold moves.

### 3.2 Option (b): self-hosted open model on our server

Licences: llama.cpp (MIT), Ollama (MIT), vLLM (Apache-2.0), all commercial-safe
[from upstream repos; not re-fetched in this research].

Prices are AWS ap-south-1 on-demand Linux per hour [cited,
[vantage g4dn.xlarge](https://instances.vantage.sh/aws/ec2/g4dn.xlarge?region=ap-south-1),
[vantage c7g.2xlarge](https://instances.vantage.sh/aws/ec2/c7g.2xlarge?region=ap-south-1)].
INR conversion uses ₹92.6492/USD, the RBI reference rate of 10-Apr-2026
[cited, [MSEI archive of RBI rates](https://www.msei.in/markets/currency/historical-data/rbireferenceratearchives.aspx)];
no later rate was found, so re-price at build time. Monthly = hourly × 730 h
**[estimate: arithmetic]**.

| Box | $/h [cited] | ₹/month, 730 h [estimate] | What it would run |
|---|---|---|---|
| c7g.2xlarge (8 vCPU Graviton3, 16 GiB) on-demand | 0.290 | ≈ ₹19,600 | Qwen3-1.7B Q4 via llama.cpp on CPU |
| c7g.2xlarge 1-yr reserved | 0.191 | ≈ ₹12,900 | same |
| c7g.2xlarge spot | 0.122 | ≈ ₹8,300 | same, interruptible |
| g4dn.xlarge (1× T4 16 GB) on-demand | 0.526 | ≈ ₹35,600 | 4B–8B class quantised via vLLM |
| g4dn.xlarge 1-yr reserved | 0.331 | ≈ ₹22,400 | same |

Plus storage, egress and a second box for availability, not costed.

**Per 1,000 paid users** **[estimate]**: assume 5 questions per user per day ×
about 150 output tokens = 750k tokens/day, about 9 tok/s on average, perhaps 5×
that at the evening close-time peak (about 45 tok/s). Graviton figures in the
literature are for other models and instance sizes, e.g. about 36 tok/s
single-request on c7g.8xlarge
[cited, [AWS community](https://community.aws/content/2eazHYzSfcY9flCGKsuGjpwqq1B/run-llms-on-cpu-with-amazon-sagemaker-real-time-inference)]
and about 60 tok/s for a Q4_0 4.5B model on c8g.4xlarge
[cited, [Arm learning path](https://learn.arm.com/learning-paths/servers-and-cloud-computing/arcee-foundation-model-on-aws/07_evaluating_the_quantized_models/)].
So one c7g.2xlarge for 1,000 users is plausible but **[unmeasured]**. That is
about ₹13–20 per paid user per month on CPU and ₹22–36 on GPU **[estimate]**,
before redundancy.

Beyond cost, option (b) cuts against the product: it needs the network (the app
is offline-first), and it sends the shop's ledger off the device for a new
purpose, which under the DPDP Act 2023 needs its own itemised notice and specific
consent and widens the surface that Rule 7 breach timings apply to. That is legal
work rather than a bar, but it is a cost.

### 3.3 The Odia evidence

IndicParam (Dec 2025, 4-option multiple choice, so 25% is chance) reports Odia
accuracy of Qwen2.5-3B 28.8%, Llama-3.2-3B 27.0%, Gemma-3-4B 31.5%, Qwen3-4B
34.7%, and only 39.9–40.4% for Gemma-3-27B and Qwen3-30B-A3B [cited,
[arXiv 2512.00333](https://arxiv.org/html/2512.00333v2)]. Those are 3–30B models;
the 0.6B that fits a phone was not tested. It is a knowledge benchmark, not a
fluency one, so it does not measure phrasing directly, but it is the best
evidence found, and it says Odia is weak at every size we could afford. No source
found evaluates Odia *generation* quality for any sub-2B model **[unmeasured]**.

### 3.4 Option (c): hybrid, deterministic answers, model only for phrasing

The answer is computed by the engine; a model only words it. This is the right
shape, and it removes the invented-number risk if the model may only emit
placeholders (`{sales}`) that are filled after generation, with any digit in the
model's raw output rejected.

But once the numbers come from the engine, **the phrasing the model would add is
already in the i18n templates**, written by a person and (after H13) reviewed by a
native speaker. A template costs no download, no inference time, and is correct
in Odia. So the recommendation is option (c) with the model removed:

```
text ─▶ intent matcher (section 2) ─▶ slots: period ("today", "last week", "this month"),
                                            party (fuzzy match vs the shop's own party list),
                                            mode (cash / UPI / udhar)
      ─▶ formula-engine query, today passed in (ADR-012), integer paise
      ─▶ i18n template filled with the engine's values via the existing money formatter
      ─▶ optional derived observation ("credit outstanding has risen 5 business days running; worth a look")
```

Paid-tier intents (illustrative): sales or profit for a period; cash expected vs
counted on a day; confirmed UPI total; who owes most, oldest udhar; a party's
balance and last payment; this week vs last week; best and slow items (Premium
item history); a festival-week comparison.

**Minimal code path** **[estimate]**: one `intent.ts` (matcher, about 150 lines,
no dependency, with a test corpus), one `slots.ts` (period and party parsing,
reusing `dates.ts` and the party list), one dispatch table from intent to existing
engine functions, plus template strings in the three bundles. No native module,
no download, no server, nothing added to the APK beyond the intent bank.

**When to add a model.** Only if the labelled-corpus measurement shows the
matcher misroutes too often on free text. Then the next rung is a multilingual
*encoder* for intent routing, not a generator: `intfloat/multilingual-e5-small`,
MIT, Oriya among its listed languages [cited,
[model card](https://huggingface.co/intfloat/multilingual-e5-small)], run with
`onnxruntime-react-native` (MIT, 1.24.3 [cited, `npm view`]). It classifies; it
never writes a sentence or a number. Its int8 size and on-device latency are
**[unmeasured]**; it becomes a post-install download if it would break B24.

---

## 4 · Reports and predictions (paid)

All of it fits `formula-engine`'s rules: pure functions, today passed in, no
`Date.now()`, results wrapped in the existing `gate()` / `Gated<T>` pattern
(`intelligence.ts` already gates its trend outputs on closed-day counts; reuse it).

### 4.1 Methods

| Method | Use | Why it is explainable | Reference |
|---|---|---|---|
| Seasonal naive, m = 7 | Daily sales baseline: "next Tuesday ≈ last Tuesday" | One sentence | [FPP3 §5.8](https://otexts.com/fpp3/accuracy.html) |
| Holt-Winters / ETS with weekly season (additive, optionally damped trend) | Daily sales and cash forecast with trend | Level + trend + weekday effect, each showable | [FPP3 ch. 8](https://otexts.com/fpp3/expsmooth.html) |
| Croston, SBA, TSB | Item demand with many zero days (Premium item history) | "sells about 2 every 5 days" | [FPP3 §13.2](https://otexts.com/fpp3/counts.html); TSB: Teunter, Syntetos & Babai 2011, *EJOR* 214(3) 606–615, [doi:10.1016/j.ejor.2011.05.018](https://doi.org/10.1016/j.ejor.2011.05.018) |
| Festival-week comparison | Diwali, Durga Puja, Raja, Rath Yatra, Eid, wedding season | "last Durga Puja week sales were X vs a normal week Y": an observation, not a model | festival dates from a shipped table, per state |
| RFM (recency, frequency, monetary) | Credit customers (named parties only; cash sales are anonymous) | Three numbers per party, quantile bands | standard |
| Basket co-occurrence (support, confidence, lift) | Items bought together (Premium) | "biscuits on 40 of 120 bills with tea" | standard association rules |

TSB is preferred over Croston for item demand because Croston does not update
during long zero runs and is biased [cited, Teunter et al. abstract], which is
exactly the slow-item case a small shop has.

Implementation notes:
- **Money stays integer paise.** Smoothing weights as integer basis points, every
  combination through `money.ts` helpers (`divideMoney`, `sum`); forecasts round
  to paise once, at the end. `check:money` applies to this code and its tests.
- Item quantities are counts, not money, and still get integer-safe arithmetic.
- No new dependency: each method is under about 100 lines **[estimate]**.
  Parameters fitted by a small grid search over the smoothing weights on the
  shop's own history; no optimiser library.
- Festival dates are data, not inference: a dated table shipped with the app
  (Odisha and national), maintained by us, never guessed from the sales curve.

### 4.2 Honest gates: when a prediction may be shown

Two gates, both must pass.

1. **Enough history.** Minimums proposed by this research, to be fixed as exact
   integers in the engine the way `BI_GATES` is:
   - seasonal naive: 14 closed business days (two full weeks);
   - Holt-Winters weekly: 56 closed days (eight weeks), so each weekday effect is
     estimated from more than a couple of observations;
   - item TSB/Croston: at least 8 non-zero sale days for that item in the last
     90 days; fewer → show "sold on N days in 90", no forecast;
   - festival effect: at least one previous occurrence of that festival in the
     shop's own data; before that, show nothing;
   - RFM: at least 30 closed days and at least 10 parties with activity;
   - basket pairs: at least 200 itemised bills and a pair seen at least 10 times.
2. **Beats the naive baseline.** Rolling-origin backtest on the shop's own data;
   a model is shown only if its MASE against seasonal naive is below 1
   [definition cited, FPP3 §5.8]. Otherwise show seasonal naive, labelled as
   such. A model that cannot beat "same as last week" has not earned the screen.

These gate values are proposals. Any that become product commitments go into
`BENCHMARKS.md` by the human process, not by this document.

### 4.3 What to show next to every prediction

- the method in one line ("based on the last 8 weeks, weekday pattern");
- a range, not a point: an 80% band from backtest residual quantiles (Croston has
  no algebraic interval [cited, FPP3 §13.2], so use empirical quantiles for all);
- MASE on the shop's own backtest, as a plain-language accuracy tier;
- the data window and how many days it used;
- the word "estimate". Never "you will sell", never an instruction to order.

Metrics: MASE (scale-free and defined with zero days, where MAPE is undefined
[cited, FPP3 §5.8]); for items, also bias (mean error), because a persistently
high item forecast is the failure that matters; and coverage of the 80% band.

### 4.4 Explicitly out

No reorder point, no safety stock, no days-of-cover, no stock-on-hand anywhere
(product owner, 2026-10-26). An item forecast says how much is likely to *sell*,
never how much is on the shelf or should be ordered.

---

## 5 · Indic ASR and translation

Not used for entry: no voice fill in the entry path, ever. For **chat input
only**, Android's own keyboard voice typing already exists and costs nothing; if
chat ever accepts speech, the resulting text goes through the same intent matcher
and can only *ask*, never write an entry. Open models exist (AI4Bharat
IndicConformer and IndicTrans2; OpenAI Whisper), but their licences and Odia
accuracy were not verified in this research, and their download size would not
fit B24. No translation model is needed: the answers are templates in all three
languages.

---

## 6 · Risks

| Risk | Where | Mitigation |
|---|---|---|
| A model produces a figure that was never entered or derived | any LLM option | No generator in V1; if ever, placeholder-only output and reject any digit |
| Odia quality: models near chance on Odia knowledge | options a, b | Templates; H13 native review of templates |
| Matcher misroutes code-mixed or romanised text | free and paid | Real-phrasing corpus, chips on low margin, measured per language |
| Forecast shown on too little data, or worse than naive | section 4 | Two gates: history and MASE below 1 |
| Gemma remote-restriction clause and flow-down obligations | Gemma models | Prefer Apache-2.0 (Qwen3) if a model is ever added |
| Sarvam-1 is non-commercial | Sarvam-1 | Excluded |
| Server LLM sends ledger data off the device | option b | Not chosen; would need DPDP itemised notice and specific consent |
| Item features conflict with V1 decision D5 | section 4 | Premium item capture needs a recorded decision first |
| On-device model breaks B22 / B24 | option a | Not chosen; any future model is a post-install download, measured first |
| Festival table wrong for a region | 4.1 | Shipped data, per state, reviewable; never inferred |

---

## 7 · If a model is ever reconsidered: measure first

On the actual target handset, with `llama-bench` (or `llama.rn`'s bench API):
Qwen3-0.6B Q4_K_M load time, RSS, prompt-processing and decode tok/s at 4
threads, and throttling over 10 minutes; plus a 100-question trilingual answer
set scored by native Odia and Hindi reviewers. Record results through the
`BENCHMARKS-RESULTS.md` generator. Until that exists, every on-device speed in
this document is somebody else's phone.

---

## Sources

1. [llama.rn](https://github.com/mybigday/llama.rn): MIT, Android arm64, GPU/NPU only on high-end Qualcomm
2. [Qwen3 blog](https://qwenlm.github.io/blog/qwen3/): Apache-2.0 dense models, 119 languages incl. Oriya and Hindi
3. [unsloth Qwen3-0.6B GGUF](https://huggingface.co/unsloth/Qwen3-0.6B-GGUF), [Qwen3-1.7B GGUF](https://huggingface.co/unsloth/Qwen3-1.7B-GGUF): file sizes
4. [Qwen2.5-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct): Apache-2.0
5. [Gemma 3 on Hugging Face](https://huggingface.co/blog/gemma3): 1B is English only
6. [Gemma 3 270M](https://huggingface.co/google/gemma-3-270m) and [Gemma Terms of Use](https://ai.google.dev/gemma/terms)
7. [Llama 3.2 1B Instruct](https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct): languages, licence, OnePlus 12 figures
8. [Sarvam-1](https://huggingface.co/sarvamai/sarvam-1): non-commercial licence, 10 Indic languages
9. [IndicParam, arXiv 2512.00333](https://arxiv.org/html/2512.00333v2): Odia accuracy of 3–30B models
10. [LLM inference at the edge, arXiv 2603.23640](https://arxiv.org/html/2603.23640v2): Qwen2.5 1.5B on flagship devices
11. [snapdragon-npu-llm benchmarks](https://github.com/avisre/snapdragon-npu-llm/blob/main/docs/BENCHMARKS.md): llama.cpp CPU vs OpenCL on a Snapdragon phone
12. [vantage.sh g4dn.xlarge](https://instances.vantage.sh/aws/ec2/g4dn.xlarge?region=ap-south-1), [c7g.2xlarge](https://instances.vantage.sh/aws/ec2/c7g.2xlarge?region=ap-south-1): ap-south-1 prices
13. [AWS: LLMs on CPU with SageMaker](https://community.aws/content/2eazHYzSfcY9flCGKsuGjpwqq1B/run-llms-on-cpu-with-amazon-sagemaker-real-time-inference), [Arm: AFM-4.5B on Graviton4](https://learn.arm.com/learning-paths/servers-and-cloud-computing/arcee-foundation-model-on-aws/07_evaluating_the_quantized_models/)
14. [MSEI archive of RBI reference rates](https://www.msei.in/markets/currency/historical-data/rbireferenceratearchives.aspx): ₹92.6492/USD, 10-Apr-2026
15. [multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small): MIT, Oriya listed
16. [FPP3 §5.8 accuracy](https://otexts.com/fpp3/accuracy.html), [§13.2 counts](https://otexts.com/fpp3/counts.html), [ch. 8 ETS](https://otexts.com/fpp3/expsmooth.html)
17. Teunter, Syntetos & Babai (2011), [doi:10.1016/j.ejor.2011.05.018](https://doi.org/10.1016/j.ejor.2011.05.018): the TSB method

**Gaps.** No measured tokens/sec for any model on a budget SoC (MediaTek Helio G-85 / G-99,
Snapdragon 680 class); no Odia generation evaluation of any sub-2B model;
ExecuTorch and MLC licences confirmed only through secondary sources; the INR
rate is from April 2026.
