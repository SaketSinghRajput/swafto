---
name: indic-open-llm
description: Method for evaluating on-device or self-hosted open-source language models (and the no-model alternative) for low-end Android apps in Indic languages (Odia, Hindi, English), under no-paid-API, commercial-licence and minimal-cost constraints. Use before proposing any chatbot, LLM, embedding model, forecasting or "AI" feature for SWAFTO.
---

# Indic open-model evaluation (low-end Android)

Findings of record: `docs/research/R3-ai-strategy.md` (2026-10-26). Re-check
the facts below before relying on them; models and licences change.

## Method, in order (stop at the first rung that holds)

1. **Is it a query, not a generation?** If the answer is a number the engine
   can compute, use intent matching + slots + formula-engine + i18n template.
   No model. Most "shop chatbot" questions are this.
2. **Deterministic matcher first.** TF-IDF over tokens + character trigrams,
   trilingual + romanised intent bank, confidence margin → chips. Measure top-1
   accuracy on a real-phrasing corpus per language before considering a model.
3. **Encoder before generator.** If the matcher is measurably weak, add a
   multilingual sentence encoder for *classification only*
   (`intfloat/multilingual-e5-small`, MIT, lists Oriya) via
   `onnxruntime-react-native` (MIT).
4. **Generator last, and only with a placeholder guard.** The model may emit
   `{placeholders}` only; any digit in raw output is rejected; numbers are filled
   from the engine. Never in the entry path.

## Checks for any candidate model

- **Licence**: Apache-2.0 / MIT preferred. Gemma Terms allow commercial use but
  carry flow-down obligations and a remote-restriction clause. Llama 3.2: 700M MAU
  clause. **Sarvam-1 is non-commercial: excluded.** Qwen2.5-3B is not Apache.
- **Odia actually supported?** Gemma 3 1B is English only; Llama 3.2 does not
  list Odia; Qwen3 lists "Oriya". IndicParam (arXiv 2512.00333) shows 3–4B models
  at 27–35% on Odia (chance is 25%).
- **Fits the locked benchmarks?** B24 (arm64 APK at most 25 MB) and B22 (peak
  memory during day close at most 220 MB) never move. Qwen3-0.6B Q4_K_M is 397 MB,
  so it can only be a post-install download.
- **Hardware path**: llama.rn GPU (Adreno 700+) and NPU (SD 8 Gen 1+) paths do
  not exist on ₹7,000 phones. CPU only.
- **Measured on the target handset?** Published tok/s are flagship numbers. Run
  `llama-bench` on the real device (load time, RSS, pp/tg tok/s, 10-minute
  throttle) before quoting anything.
- **Server option**: price from vantage.sh for ap-south-1, convert at a cited RBI
  rate, × 730 h. Also weigh DPDP (new purpose → itemised notice + consent) and
  offline-first breakage.

## Forecasting (no model needed)

Seasonal naive (m=7) → Holt-Winters weekly → TSB (over Croston) for intermittent
item demand → festival-week *comparison* from a shipped date table → RFM and
basket lift. Gate every output on history (via `gate()` / `Gated<T>`) **and** on
rolling-origin MASE below 1 vs seasonal naive. Integer paise through `money.ts`.
Clock-free. No reorder points or stock levels (product owner, 2026-10-26).

## Reporting rules

Label every number [cited] / [estimate] / [unmeasured]. Never set a threshold in
a research document; thresholds go to `BENCHMARKS.md` by the human process.
In `docs/`, write SoC names like "Helio G-85" with a hyphen: `check:prose` treats
bare `B<n>`/`G<n>`/`H<n>`/`AD-<n>` tokens as IDs and fails on undefined ones.
