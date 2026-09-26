from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import socket
from pathlib import Path
from typing import Any

from datasets import Dataset
from supabase import Client, create_client


def required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def dataset_hash(value: Any) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(raw).hexdigest()


def validate_examples(examples: list[dict[str, Any]]) -> None:
    if not examples:
        raise ValueError("Training dataset is empty")
    for i, row in enumerate(examples):
        messages = row.get("messages")
        if not isinstance(messages, list) or not messages:
            raise ValueError(f"Example {i} has no messages")
        roles = {m.get("role") for m in messages if isinstance(m, dict)}
        if "user" not in roles or "assistant" not in roles:
            raise ValueError(f"Example {i} must contain user and assistant messages")
        if any(not isinstance(m, dict) or not isinstance(m.get("content"), str) for m in messages):
            raise ValueError(f"Example {i} contains invalid message content")


def row(client: Client, table: str, item_id: str) -> dict[str, Any]:
    result = client.table(table).select("*").eq("id", item_id).single().execute()
    if not result.data:
        raise RuntimeError(f"{table} row not found: {item_id}")
    return result.data


def run_training(job: dict[str, Any], data: dict[str, Any], out: Path) -> dict[str, Any]:
    import torch
    from unsloth import FastLanguageModel

    if not torch.cuda.is_available() and os.getenv("BOOKORA_ALLOW_CPU_TRAINING") != "true":
        raise RuntimeError("CUDA is required for normal Unsloth training")

    examples = data.get("examples") or []
    validate_examples(examples)
    digest = dataset_hash(examples)
    if data.get("dataset_hash") and data["dataset_hash"] != digest:
        raise RuntimeError("Dataset hash mismatch; refusing to train")

    cfg = job.get("training_config") or {}
    max_seq_length = int(cfg.get("max_seq_length", 2048))
    load_in_4bit = bool(cfg.get("load_in_4bit", True))
    rank = int(cfg.get("lora_rank", 16))

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=job["base_model"],
        max_seq_length=max_seq_length,
        load_in_4bit=load_in_4bit,
    )
    model = FastLanguageModel.get_peft_model(
        model,
        r=rank,
        lora_alpha=rank * 2,
        lora_dropout=0,
        target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"],
        use_gradient_checkpointing="unsloth",
        random_state=3407,
    )

    from trl import SFTConfig, SFTTrainer

    train_set = Dataset.from_list(examples)
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=train_set,
        args=SFTConfig(
            output_dir=str(out),
            num_train_epochs=float(cfg.get("epochs", 1.0)),
            learning_rate=float(cfg.get("learning_rate", 2e-4)),
            per_device_train_batch_size=int(cfg.get("batch_size", 1)),
            gradient_accumulation_steps=int(cfg.get("gradient_accumulation_steps", 4)),
            logging_steps=int(cfg.get("logging_steps", 5)),
            save_strategy="steps",
            save_steps=int(cfg.get("save_steps", 100)),
            report_to="none",
        ),
    )
    result = trainer.train()
    adapter = out / "adapter"
    model.save_pretrained(adapter)
    tokenizer.save_pretrained(adapter)

    metrics = dict(getattr(result, "metrics", {}) or {})
    metrics.update({
        "dataset_hash": digest,
        "example_count": len(examples),
        "base_model": job["base_model"],
        "trainer": "unsloth",
        "cuda_available": bool(torch.cuda.is_available()),
        "device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "cpu",
        "host": socket.gethostname(),
        "platform": platform.platform(),
    })
    return {"adapter_path": str(adapter), "metrics": metrics}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--job-id", required=True)
    args = parser.parse_args()

    client = create_client(required("BOOKORA_SUPABASE_URL"), required("BOOKORA_SUPABASE_SERVICE_ROLE_KEY"))
    worker_id = os.getenv("BOOKORA_WORKER_ID", socket.gethostname())
    output_root = Path(os.getenv("BOOKORA_TRAINING_OUTPUT_DIR", "./artifacts")).resolve()
    output_root.mkdir(parents=True, exist_ok=True)

    job = row(client, "ai_finetune_jobs", args.job_id)
    data = row(client, "ai_finetune_datasets", job["dataset_id"])

    claimed = client.rpc("start_ai_finetune_job", {"p_job_id": args.job_id, "p_worker_id": worker_id}).execute()
    if claimed.data is not True:
        raise RuntimeError("Training job is not claimed by this worker")

    job_dir = output_root / args.job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    try:
        result = run_training(job, data, job_dir)
        client.rpc("complete_ai_finetune_job", {
            "p_job_id": args.job_id,
            "p_worker_id": worker_id,
            "p_status": "evaluating",
            "p_checkpoint_path": str(job_dir),
            "p_adapter_path": result["adapter_path"],
            "p_metrics": result["metrics"],
        }).execute()
        print(json.dumps({"status": "evaluating", **result}, ensure_ascii=False))
        return 0
    except Exception as exc:
        client.rpc("complete_ai_finetune_job", {
            "p_job_id": args.job_id,
            "p_worker_id": worker_id,
            "p_status": "failed",
            "p_metrics": {},
            "p_error": str(exc)[:4000],
        }).execute()
        raise


if __name__ == "__main__":
    raise SystemExit(main())
