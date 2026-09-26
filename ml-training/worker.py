from __future__ import annotations

import argparse
import os
import socket
import time
from pathlib import Path
from typing import Any

from supabase import Client, create_client


def env(name: str) -> str:
    value = os.getenv(name, '').strip()
    if not value:
        raise RuntimeError(f'Missing required environment variable: {name}')
    return value


def claim(client: Client, worker_id: str, limit: int) -> list[dict[str, Any]]:
    result = client.rpc('claim_ai_finetune_jobs', {'p_worker_id': worker_id, 'p_limit': max(1, min(limit, 10))}).execute()
    return result.data or []


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--once', action='store_true')
    parser.add_argument('--limit', type=int, default=1)
    parser.add_argument('--poll-seconds', type=int, default=30)
    args = parser.parse_args()

    client = create_client(env('BOOKORA_SUPABASE_URL'), env('BOOKORA_SUPABASE_SERVICE_ROLE_KEY'))
    worker_id = os.getenv('BOOKORA_WORKER_ID', socket.gethostname())
    output_root = Path(os.getenv('BOOKORA_TRAINING_OUTPUT_DIR', './artifacts')).resolve()
    output_root.mkdir(parents=True, exist_ok=True)

    while True:
        jobs = claim(client, worker_id, args.limit)
        for job in jobs:
            from train import run_training
            dataset = client.table('ai_finetune_datasets').select('*').eq('id', job['dataset_id']).single().execute().data
            if not dataset:
                raise RuntimeError('Training dataset not found')
            started = client.rpc('start_ai_finetune_job', {'p_job_id': job['id'], 'p_worker_id': worker_id}).execute()
            if started.data is not True:
                continue
            out = output_root / job['id']
            out.mkdir(parents=True, exist_ok=True)
            try:
                result = run_training(job, dataset, out)
                client.rpc('complete_ai_finetune_job', {'p_job_id': job['id'], 'p_worker_id': worker_id, 'p_status': 'evaluating', 'p_checkpoint_path': str(out), 'p_adapter_path': result['adapter_path'], 'p_metrics': result['metrics']}).execute()
            except Exception as exc:
                client.rpc('complete_ai_finetune_job', {'p_job_id': job['id'], 'p_worker_id': worker_id, 'p_status': 'failed', 'p_metrics': {}, 'p_error': str(exc)[:4000]}).execute()
        if args.once:
            return 0
        time.sleep(max(5, args.poll_seconds))


if __name__ == '__main__':
    raise SystemExit(main())
