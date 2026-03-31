# YD 2026 Project Index

## Active Production Projects

### P1: GWX
- **Location**: `projects/production/gwx/`
- **Status**: ✅ v1.0.0 (PR #3 breaking changes resolved)
- **Stack**: Node.js, TypeScript
- **Last Update**: 2026-03-30

### P2: TG Bot (Claude Code Telegram Bot)
- **Location**: `projects/production/claude_code_telegram_bot/`
- **Status**: ✅ KB Health Report + Mon 09:15 scheduled
- **Stack**: Python, Telegram API
- **Features**: Auto-tagging, stale detection
- **Last Update**: 2026-03-31

### P3: NS_0327
- **Location**: `projects/experimental/NS_0327/`
- **Status**: ✅ 6 SOPs completed + parallel framework v1 prod-ready
- **Stack**: Python
- **Last Update**: 2026-03-30

### P4: VWRS (Video Watermark Removal System)
- **Location**: `projects/production/video-watermark-removal-system/`
- **Status**: 🔨 Phase 2 Complete - Tracking Layer (CSRT + Stabilization)
- **Stack**: Python, OpenCV, PyTorch-ready
- **Architecture**: 4-layer pipeline (Tracking ✅ → TemporalRef → SpatialRestore → Integration)
- **Phase 2 Deliverables**:
  - Tracker (CSRT algorithm with drift detection)
  - MaskStabilizer (temporal smoothing + edge feathering + morphological denoising)
  - TrackingVisualizer (debug visualization for tracking results)
  - 12+ unit tests (coverage ~85%), complete demo script, automated test suite
  - Performance: 100 frames (480p) in ~4s total
- **Next Phase**: Phase 3 - Temporal Reference Layer (OpticalFlow + Frame Alignment)
- **Last Update**: 2026-03-31

## Experimental Projects

### HR Admin Bot (v0.5)
- **Location**: `projects/experimental/hr-admin-bot/`
- **Status**: Development

## Libraries

### Clausidian (v3.4.0)
- **Location**: `projects/tools/clausidian/`
- **Status**: ✅ Architecture refactored (table-formatter + frontmatter-helper)
- **Last Update**: 2026-03-31

---

## Quick Commands

```bash
source ~/.zshrc-workspace

p1  # cd to GWX
p2  # cd to TG Bot
p3  # cd to NS_0327
p4  # cd to VWRS (NEW)
pw  # cd to workspace root
kb  # cd to obsidian/
```

## Development Checklist

### VWRS Phase 1 ✅
- [x] Project structure
- [x] 4-layer architecture design
- [x] VideoReader / VideoWriter
- [x] MaskHandler (ROI support)
- [x] Pipeline coordinator
- [x] CLI framework
- [x] Configuration system (YAML)
- [x] Architecture documentation
- [x] Development guide + code templates
- [x] Initial commit

### VWRS Phase 2 ✅
- [x] Tracker (CSRT with drift detection)
- [x] MaskStabilizer (temporal smoothing + edge feathering + denoising)
- [x] Tracking visualization (bbox + mask overlay)
- [x] 12+ unit tests (~85% coverage)
- [x] Complete demo script (synthetic video generation)
- [x] Automated test suite (test_phase2.sh)
- [x] Phase 2 completion report

### VWRS Phase 3 (Next)
- [ ] OpticalFlowEstimator (Farneback)
- [ ] FrameAligner (frame warping + confidence)
- [ ] ReferenceFetcher (temporal window sampling + weighted fusion)
- [ ] Unit tests for temporal ref layer
- [ ] Demo script + visualization

### VWRS Phase 4-6
- [ ] Spatial restoration (inpainting backends: Telea/NS/optional LaMa)
- [ ] Integration layer (boundary blending, temporal filtering, grain matching)
- [ ] Performance optimization + batch processing
- [ ] Full test coverage + E2E testing
- [ ] CLI completion + documentation

---

*Updated: 2026-03-31*
