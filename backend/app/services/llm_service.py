import os
import re
import json
import time
import hashlib
from dotenv import load_dotenv
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# .env එකේ comma වලින් වෙන් කරලා models දෙන්න පුළුවන්. උදා:
# GEMINI_MODELS=gemini-3.6-flash,<වෙන model එකක නම>
# පළවෙනි එක මුලින් පාවිච්චි වෙනවා. එකේ quota ඉවර වුණොත් ඊළඟ එකට මාරු වෙනවා.
MODEL_NAMES = [
    m.strip() for m in os.getenv("GEMINI_MODELS", "gemini-3.6-flash").split(",") if m.strip()
]

BLOCK_SECONDS = 15 * 60   # quota ඉවර වුණ model එක මේ කාලයට skip කරනවා
MAX_SHORT_WAIT = 10       # retry_delay මෙච්චර තත්පරවලට අඩු නම් ඉඳලා එක සැරයක් ආයෙත් try කරනවා

QUOTA_MESSAGE = (
    "AI usage limit එක දැනට ඉවරයි. ටිකක් ඉඳලා ආයෙත් try කරන්න "
    "(daily limit එකක් නම් හෙට)."
)

_models = {}
_blocked_until = {}
_cache = {}


class QuotaExceeded(Exception):
    pass


def _get_model(name):
    if name not in _models:
        _models[name] = genai.GenerativeModel(name)
    return _models[name]


def _is_quota_error(e) -> bool:
    return isinstance(e, ResourceExhausted) or "429" in str(e)


def _retry_seconds(e):
    match = re.search(r"retry_delay\s*\{\s*seconds:\s*(\d+)", str(e))
    return int(match.group(1)) if match else None


def _generate(prompt: str) -> str:
    """Tries each configured model in order; moves on to the next one when a model's quota is used up."""
    for name in MODEL_NAMES:
        if _blocked_until.get(name, 0) > time.time():
            continue

        model = _get_model(name)

        for attempt in range(2):
            try:
                return model.generate_content(prompt).text
            except Exception as e:
                if not _is_quota_error(e):
                    raise

                wait = _retry_seconds(e)
                if attempt == 0 and wait is not None and wait <= MAX_SHORT_WAIT:
                    time.sleep(wait + 1)
                    continue

                _blocked_until[name] = time.time() + BLOCK_SECONDS
                break

    raise QuotaExceeded()


def _cache_key(kind: str, context: str, count: int):
    return (kind, count, hashlib.sha256(context.encode("utf-8")).hexdigest())


def get_ai_answer(context: str, question: str) -> str:
    max_context_length = 8000
    if len(context) > max_context_length:
        context = context[:max_context_length]

    prompt = "You are an AI assistant that helps a student study. Use only the lecture notes content below to answer.\n"
    prompt += "Always answer in English, even if the question is written in Sinhala.\n\n"
    prompt += "Lecture Notes Content:\n" + context + "\n\n"
    prompt += "Student Question: " + question + "\n\n"
    prompt += "Answer (in clear and simple English):"

    try:
        return _generate(prompt)
    except QuotaExceeded:
        return QUOTA_MESSAGE
    except Exception as e:
        return "AI error එකක් ආවා: " + str(e)


def generate_quiz(context: str, num_questions: int = 5) -> list:
    max_context_length = 8000
    if len(context) > max_context_length:
        context = context[:max_context_length]

    key = _cache_key("quiz", context, num_questions)
    if key in _cache:
        return _cache[key]

    prompt = (
        "පහත lecture notes content එක විතරක් පාවිච්චි කරලා, "
        + str(num_questions)
        + " multiple-choice quiz questions හදන්න.\n\n"
        + "Lecture Notes Content:\n" + context + "\n\n"
        + "ඔයාගේ response එක JSON array එකක් විතරයි වෙන්න ඕන, වෙන කිසිම text එකක් නැතුව. "
        + "මේ exact format එකෙන්ම:\n"
        + '[{"question": "question text", "options": ["option A", "option B", "option C", "option D"], "correct_index": 0}]\n\n'
        + "correct_index එක 0,1,2,3 වලින් (options array එකේ position එක) correct answer එක කුමන index එකේද කියලා දෙන්න."
    )

    try:
        text = _generate(prompt).strip()

        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]

        quiz_data = json.loads(text.strip())
        _cache[key] = quiz_data
        return quiz_data
    except QuotaExceeded:
        return {"error": QUOTA_MESSAGE}
    except Exception as e:
        return {"error": "Quiz generate කරන කොට error එකක් ආවා: " + str(e)}


def generate_flashcards(context: str, num_cards: int = 8) -> list:
    """
    PDF content එකෙන් flashcards (term + definition pairs) generate කරනවා.
    Return: [{"term": "...", "definition": "..."}, ...]
    """
    max_context_length = 8000
    if len(context) > max_context_length:
        context = context[:max_context_length]

    key = _cache_key("flashcards", context, num_cards)
    if key in _cache:
        return _cache[key]

    prompt = (
        "පහත lecture notes content එක විතරක් පාවිච්චි කරලා, "
        + str(num_cards)
        + " flashcards හදන්න (key terms/concepts + ඒවායේ definitions/explanations).\n\n"
        + "Lecture Notes Content:\n" + context + "\n\n"
        + "ඔයාගේ response එක JSON array එකක් විතරයි වෙන්න ඕන, වෙන කිසිම text එකක් නැතුව. "
        + "මේ exact format එකෙන්ම:\n"
        + '[{"term": "term or concept name", "definition": "short, clear explanation"}]\n\n'
        + "definitions ටික short (sentences 1-2ක්) සහ student කෙනෙක්ට තේරෙන language එකකින් තියන්න."
    )

    try:
        text = _generate(prompt).strip()

        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]

        flashcard_data = json.loads(text.strip())
        _cache[key] = flashcard_data
        return flashcard_data
    except QuotaExceeded:
        return {"error": QUOTA_MESSAGE}
    except Exception as e:
        return {"error": "Flashcards generate කරන කොට error එකක් ආවා: " + str(e)}