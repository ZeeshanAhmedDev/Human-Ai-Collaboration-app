import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "ai_collab_team")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
tasks = db["tasks"]
ai_task_results = db["ai_task_results"]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _safe_float(value, default=0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value, default=0) -> int:
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_average(values: list[float]) -> float:
    numbers = [value for value in values if value is not None]
    if not numbers:
        return 0.0
    return round(sum(numbers) / len(numbers), 4)


def save_task(task_data: dict):
    result = tasks.insert_one(task_data)
    return str(result.inserted_id)


def normalize_ai_task_result(task_data: dict) -> dict:
    ai_response = task_data.get("ai_response", "")
    ai_generated_lines = _safe_int(
        task_data.get("ai_generated_lines"),
        len(str(ai_response).splitlines()) if ai_response else 0,
    )

    return {
        "task_id": str(task_data.get("task_id") or ""),
        "prompt": str(task_data.get("prompt") or ""),
        "ai_response": ai_response,
        "model": str(task_data.get("model") or "unknown"),
        "status": str(task_data.get("status") or "failed"),
        "response_time_seconds": _safe_float(task_data.get("response_time_seconds")),
        "validation_time_seconds": _safe_float(task_data.get("validation_time_seconds")),
        "tests_total": _safe_int(task_data.get("tests_total")),
        "tests_passed": _safe_int(task_data.get("tests_passed")),
        "user_feedback_score": task_data.get("user_feedback_score"),
        "human_modified_lines": _safe_int(task_data.get("human_modified_lines")),
        "ai_generated_lines": ai_generated_lines,
        "estimated_cost": _safe_float(task_data.get("estimated_cost")),
        "error_message": task_data.get("error_message"),
        "llm_metadata": task_data.get("llm_metadata", []),
        "created_at": task_data.get("created_at") or _utc_now(),
    }


def save_ai_task_result(task_data: dict):
    normalized_task = normalize_ai_task_result(task_data)
    result = ai_task_results.insert_one(normalized_task)
    return str(result.inserted_id)


def calculate_kpis() -> dict:
    records = list(ai_task_results.find({}))
    total_tasks = len(records)

    if total_tasks == 0:
        return {
            "total_tasks": 0,
            "successful_tasks": 0,
            "failed_tasks": 0,
            "success_rate": 0.0,
            "average_response_time": 0.0,
            "average_validation_time": 0.0,
            "validation_time_ratio": 0.0,
            "average_test_pass_rate": 0.0,
            "average_user_feedback_score": 0.0,
            "average_post_generation_modification_rate": 0.0,
            "average_cost_per_task": 0.0,
        }

    successful_tasks = sum(1 for record in records if record.get("status") == "success")
    failed_tasks = total_tasks - successful_tasks

    response_times = [_safe_float(record.get("response_time_seconds")) for record in records]
    validation_times = [_safe_float(record.get("validation_time_seconds")) for record in records]
    feedback_scores = [
        _safe_float(record.get("user_feedback_score"))
        for record in records
        if record.get("user_feedback_score") is not None
    ]
    costs = [_safe_float(record.get("estimated_cost")) for record in records]

    test_pass_rates = []
    modification_rates = []

    for record in records:
        tests_total = _safe_int(record.get("tests_total"))
        tests_passed = _safe_int(record.get("tests_passed"))
        if tests_total > 0:
            # Test pass rate formula: passed tests divided by all available tests.
            test_pass_rates.append((tests_passed / tests_total) * 100)

        ai_generated_lines = _safe_int(record.get("ai_generated_lines"))
        human_modified_lines = _safe_int(record.get("human_modified_lines"))
        if ai_generated_lines > 0:
            # Modification rate formula: human-edited lines divided by AI-generated lines.
            modification_rates.append((human_modified_lines / ai_generated_lines) * 100)

    total_response_time = sum(response_times)
    total_validation_time = sum(validation_times)

    return {
        "total_tasks": total_tasks,
        "successful_tasks": successful_tasks,
        "failed_tasks": failed_tasks,
        # Success rate formula: successful AI tasks divided by total AI tasks.
        "success_rate": round((successful_tasks / total_tasks) * 100, 2),
        "average_response_time": _safe_average(response_times),
        "average_validation_time": _safe_average(validation_times),
        # Validation time ratio formula: validation time divided by generation time.
        "validation_time_ratio": round(
            (total_validation_time / total_response_time) * 100,
            2,
        )
        if total_response_time > 0
        else 0.0,
        "average_test_pass_rate": _safe_average(test_pass_rates),
        "average_user_feedback_score": _safe_average(feedback_scores),
        "average_post_generation_modification_rate": _safe_average(modification_rates),
        "average_cost_per_task": _safe_average(costs),
    }
