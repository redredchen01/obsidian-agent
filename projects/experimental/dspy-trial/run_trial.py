#!/usr/bin/env python3
"""DSPy tag prediction trial — baseline vs optimized comparison."""

import json
import os
from pathlib import Path

import dspy
from dspy.teleprompt import BootstrapFewShot

DATA_FILE = Path(__file__).parent / "dataset.json"
RESULTS_FILE = Path(__file__).parent / "results.json"


# --- Signature ---

class TagPredictor(dspy.Signature):
    """Given an Obsidian note's title, type, summary, and content snippet,
    predict the appropriate tags from the knowledge base's tag vocabulary."""

    title: str = dspy.InputField(desc="Note title")
    note_type: str = dspy.InputField(desc="Note type (area/project/resource/journal/idea)")
    summary: str = dspy.InputField(desc="One-line note summary")
    content: str = dspy.InputField(desc="Note content snippet (first ~1500 chars)")
    available_tags: str = dspy.InputField(desc="Comma-separated list of all valid tags")
    tags: str = dspy.OutputField(desc="Comma-separated predicted tags (choose from available_tags)")


# --- Metric ---

def tag_f1_score(example, prediction, trace=None) -> float:
    """Compute F1 score between predicted and actual tags."""
    actual = set(t.strip() for t in example.tags.split(",") if t.strip())
    predicted = set(t.strip() for t in prediction.tags.split(",") if t.strip())

    if not actual and not predicted:
        return 1.0
    if not actual or not predicted:
        return 0.0

    tp = len(actual & predicted)
    precision = tp / len(predicted) if predicted else 0
    recall = tp / len(actual) if actual else 0

    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)


# --- Data Loading ---

def load_data() -> tuple[list, list, str]:
    """Load dataset and convert to DSPy examples."""
    data = json.loads(DATA_FILE.read_text())
    all_tags_str = ", ".join(data["unique_tags"])

    def to_example(note: dict) -> dspy.Example:
        return dspy.Example(
            title=note["title"],
            note_type=note["type"],
            summary=note["summary"],
            content=note["content"][:800],  # Trim for token efficiency
            available_tags=all_tags_str,
            tags=", ".join(note["tags"]),
        ).with_inputs("title", "note_type", "summary", "content", "available_tags")

    train = [to_example(n) for n in data["train"]]
    test = [to_example(n) for n in data["test"]]
    return train, test, all_tags_str


# --- Evaluation ---

def evaluate(predictor, test_data: list, label: str) -> dict:
    """Run predictor on test set and compute metrics."""
    scores = []
    details = []

    for ex in test_data:
        pred = predictor(
            title=ex.title,
            note_type=ex.note_type,
            summary=ex.summary,
            content=ex.content,
            available_tags=ex.available_tags,
        )
        score = tag_f1_score(ex, pred)
        scores.append(score)
        details.append({
            "title": ex.title,
            "actual": ex.tags,
            "predicted": pred.tags,
            "f1": round(score, 3),
        })

    avg_f1 = sum(scores) / len(scores) if scores else 0
    print(f"\n{'='*50}")
    print(f"{label}: avg F1 = {avg_f1:.3f} ({len(scores)} samples)")
    print(f"{'='*50}")

    for d in sorted(details, key=lambda x: x["f1"]):
        emoji = "✅" if d["f1"] > 0.7 else "⚠️" if d["f1"] > 0.3 else "❌"
        print(f"  {emoji} {d['title']}: F1={d['f1']} actual=[{d['actual']}] pred=[{d['predicted']}]")

    return {"label": label, "avg_f1": round(avg_f1, 3), "details": details}


# --- Main ---

def main():
    # Check API key
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("❌ ANTHROPIC_API_KEY not set!")
        print("   export ANTHROPIC_API_KEY='sk-ant-...'")
        return

    # Configure LM
    lm = dspy.LM("anthropic/claude-haiku-4-5")
    dspy.configure(lm=lm)

    # Load data
    print("Loading dataset...")
    train, test, all_tags = load_data()
    print(f"  Train: {len(train)}, Test: {len(test)}, Tags: {len(all_tags.split(', '))}")

    # Step 1: Baseline (zero-shot)
    print("\n🔵 Running BASELINE (zero-shot)...")
    baseline = dspy.Predict(TagPredictor)
    baseline_results = evaluate(baseline, test, "BASELINE")

    # Step 2: Optimize with BootstrapFewShot
    print("\n🟢 Running OPTIMIZATION (BootstrapFewShot)...")
    optimizer = BootstrapFewShot(
        metric=tag_f1_score,
        max_bootstrapped_demos=4,
        max_labeled_demos=4,
    )
    optimized = optimizer.compile(baseline, trainset=train)
    optimized_results = evaluate(optimized, test, "OPTIMIZED")

    # Step 3: Compare
    improvement = optimized_results["avg_f1"] - baseline_results["avg_f1"]
    pct = (improvement / baseline_results["avg_f1"] * 100) if baseline_results["avg_f1"] > 0 else 0

    print(f"\n{'='*50}")
    print(f"📊 COMPARISON")
    print(f"{'='*50}")
    print(f"  Baseline F1:  {baseline_results['avg_f1']:.3f}")
    print(f"  Optimized F1: {optimized_results['avg_f1']:.3f}")
    print(f"  Improvement:  {improvement:+.3f} ({pct:+.1f}%)")

    if pct > 10:
        print("\n✅ GO — F1 提升 > 10%，建議正式整合到工作流")
    elif pct > 5:
        print("\n⚠️ HOLD — F1 提升 5-10%，保留備用")
    else:
        print("\n❌ NO-GO — F1 提升 < 5%，手工 prompt 已夠用")

    # Save results
    results = {
        "baseline": baseline_results,
        "optimized": optimized_results,
        "improvement": round(improvement, 3),
        "improvement_pct": round(pct, 1),
    }
    RESULTS_FILE.write_text(json.dumps(results, ensure_ascii=False, indent=2))
    print(f"\nResults saved to: {RESULTS_FILE}")


if __name__ == "__main__":
    main()
