import os
import httpx


async def verify_turnstile(token: str) -> bool:
    secret_key = os.getenv("TURNSTILE_SECRET_KEY")

    if not secret_key:
        raise Exception("TURNSTILE_SECRET_KEY is missing")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={
                "secret": secret_key,
                "response": token
            }
        )

    result = response.json()
    print("TURNSTILE RESPONSE:", result)

    return result.get("success", False)