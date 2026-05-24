# TRL Agentic Reasoning Dashboard

Static dashboard, FastAPI backend prototype, and reproducible TRL experiment code.

> Note: dataset-derived logs, predictions, and experiment outputs are intentionally excluded from the public repository. Generate them locally with `trl_experiments/run_all_experiments.py`.

## Frontend

Open `frontend/index.html` locally or use GitHub Pages after deployment.

## Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

## Experiments

```bash
python trl_experiments/run_all_experiments.py \
  --input /path/to/TechPort_cleaned_for_TRL_rule_search.xlsx \
  --sheet Projects_Clean \
  --output_dir outputs \
  --log_dir logs \
  --random_state 42
```
