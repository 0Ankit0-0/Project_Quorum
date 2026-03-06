# Pretrained AI Plan (System Update)

## Project
Quorum - AI-Powered Log Analysis for Secure Offline Environments

## Purpose
This document records the planned upgrade path for adding a pre-trained AI detector to the current Quorum analysis pipeline, without disrupting the existing working system.

## Current System (Already Implemented)
Quorum currently runs a hybrid ensemble in `backend/ai_engine/ensemble.py` with:

- `isolation_forest` (weight `0.35`)
- `one_class_svm` (weight `0.25`)
- `statistical` (weight `0.20`)
- `keyword` scoring engine (weight `0.20`)

Analysis orchestration is handled by `backend/services/analysis_service.py`:

- Feature extraction
- Algorithm selection
- Anomaly detection
- MITRE mapping
- Session and report generation

## Update Scope: Pretrained Model Integration
This update introduces a **fifth detector path** as architecture-ready enhancement:

- New component: `pretrained`
- Proposed initial weight: `0.20`
- Existing weights to be rebalanced during validation
- No runtime replacement of current detectors

Target high-level flow:

1. Load pre-trained base model from offline package
2. Optional environment adaptation (fine-tune/calibration)
3. Produce anomaly score from pretrained path
4. Merge into weighted ensemble score
5. Continue existing thresholding and severity pipeline

## Planned Integration Points
The planned code touchpoints are:

- `backend/ai_engine/ensemble.py`
  - add `pretrained` score source
  - include `pretrained` in weight dictionary
  - combine with existing score fusion path

- `backend/services/analysis_service.py`
  - load/configure pretrained path through detector settings
  - keep current chunking/session flow unchanged

- `backend/config/settings.py`
  - add flags such as:
    - `AI_ENABLE_PRETRAINED=false`
    - `AI_PRETRAINED_MODEL_PATH=...`
    - `AI_PRETRAINED_WEIGHT=0.20`

## Implementation Status
- Ensemble + analysis pipeline: **Done**
- Pretrained architecture design: **Done**
- Pretrained runtime integration in production path: **Planned**
- Fine-tuning pipeline: **Planned**
- Benchmark and weight optimization: **Planned**

## Why This Is Correct for Quorum
- Fits air-gapped deployment (model shipped offline)
- Preserves existing stable detection pipeline
- Adds cold-start improvement path without forcing immediate retraining
- Supports staged rollout with config flag

## Risk Control
- Keep pretrained path disabled by default (`AI_ENABLE_PRETRAINED=false`)
- Enable only after model package validation
- Compare against baseline using same datasets before promoting default

## Evaluation Plan (Post-Integration)
Validate before enabling by default:

- Precision, Recall, F1
- False Positive Rate
- Detection latency per 10k logs
- Ablation: 4-component ensemble vs 5-component ensemble

## Deliverable Statement
Quorum has been **updated at architecture level** to support pretrained AI integration while retaining the current working hybrid ensemble as the primary production path.

