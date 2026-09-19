import os
import json
import logging
import httpx
from fastapi import HTTPException, status, UploadFile
from fastapi.responses import StreamingResponse

logger = logging.getLogger("crimegpt.storage")

# Configuration
DEFAULT_SUPABASE_URL = "https://ouzmeeucsdmidkqufpfs.supabase.co"
DEFAULT_BUCKET = "evidence-media"
DEFAULT_MAX_SIZE_MB = 50

_cached_bucket_limit = None

def get_supabase_url() -> str:
    url = os.getenv("SUPABASE_URL", DEFAULT_SUPABASE_URL).rstrip("/")
    return url

def get_service_role_key() -> str:
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not key:
        logger.error("SUPABASE_SERVICE_ROLE_KEY is not configured in backend environment.")
    return key

def get_bucket_name() -> str:
    return os.getenv("SUPABASE_STORAGE_BUCKET", DEFAULT_BUCKET)

def get_configured_max_bytes() -> int:
    try:
        mb = int(os.getenv("MAX_UPLOAD_SIZE_MB", str(DEFAULT_MAX_SIZE_MB)))
    except ValueError:
        mb = DEFAULT_MAX_SIZE_MB
    return mb * 1024 * 1024

async def get_effective_upload_limit() -> int:
    """
    Returns effective byte limit: min(app_limit, bucket_file_size_limit).
    Caches bucket limit after first lookup.
    """
    global _cached_bucket_limit
    app_max = get_configured_max_bytes()
    
    if _cached_bucket_limit is not None:
        return min(app_max, _cached_bucket_limit)

    service_key = get_service_role_key()
    url = get_supabase_url()
    bucket = get_bucket_name()

    if not service_key:
        return app_max

    try:
        headers = {
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(f"{url}/storage/v1/bucket/{bucket}", headers=headers)
            if res.status_code == 200:
                data = res.json()
                b_limit = data.get("file_size_limit")
                if b_limit and isinstance(b_limit, int) and b_limit > 0:
                    _cached_bucket_limit = b_limit
                    logger.info(f"Supabase bucket '{bucket}' file_size_limit discovered: {b_limit} bytes")
                    return min(app_max, b_limit)
    except Exception as e:
        logger.warning(f"Could not inspect Supabase bucket limit: {e}")

    _cached_bucket_limit = app_max
    return app_max

async def upload_file_stream(storage_path: str, upload_file: UploadFile, bucket: str | None = None) -> dict:
    """
    Streams an UploadFile directly into Supabase Storage using 64 KB slices
    and an explicit Content-Length header to prevent full memory buffering.
    """
    service_key = get_service_role_key()
    if not service_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Storage service key is missing on the server. Contact administrator."
        )

    url = get_supabase_url()
    target_bucket = bucket or get_bucket_name()

    # 1. Determine exact file size via synchronous seek on the underlying temporary file
    upload_file.file.seek(0, 2)
    total_size = upload_file.file.tell()
    upload_file.file.seek(0)

    # 2. Check against effective upload limits
    effective_limit = await get_effective_upload_limit()
    if total_size > effective_limit:
        limit_mb = round(effective_limit / (1024 * 1024), 1)
        actual_mb = round(total_size / (1024 * 1024), 2)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File '{upload_file.filename}' ({actual_mb} MB) exceeds the upload limit of {limit_mb} MB."
        )

    # 3. Build async generator stream
    async def stream_chunks():
        while chunk := await upload_file.read(65536):
            yield chunk

    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": upload_file.content_type or "application/octet-stream",
        "Content-Length": str(total_size),
        "x-upsert": "false"
    }

    upload_url = f"{url}/storage/v1/object/{target_bucket}/{storage_path}"
    timeout = httpx.Timeout(120.0, connect=10.0, read=120.0, write=120.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(upload_url, content=stream_chunks(), headers=headers)
            
            if response.status_code not in (200, 201):
                err_text = response.text
                logger.error(f"Supabase upload failed ({response.status_code}): {err_text}")
                
                # Check for Supabase size restriction response
                if response.status_code == 413 or "payload too large" in err_text.lower():
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Supabase Storage rejected file '{upload_file.filename}' as exceeding bucket limit."
                    )
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Storage upload failed: {response.status_code} - {err_text}"
                )
                
            return {
                "storage_path": storage_path,
                "file_size": total_size,
                "file_type": upload_file.content_type or "application/octet-stream"
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload connection error for {storage_path}: {e}")
        # Compensating cleanup: attempt to delete in case file was saved right before timeout
        try:
            await delete_files([storage_path], target_bucket)
        except Exception as cleanup_err:
            logger.critical(f"[ORPHAN_STORAGE_CLEANUP_FAILED] Path: {storage_path} | Error: {cleanup_err}")
            
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed transferring file to storage: {str(e)}"
        )

async def delete_files(storage_paths: list[str], bucket: str | None = None) -> bool:
    """
    Deletes objects from Supabase Storage by prefix paths.
    Returns True if deletion succeeded or objects were already absent.
    """
    if not storage_paths:
        return True

    service_key = get_service_role_key()
    if not service_key:
        raise HTTPException(status_code=500, detail="Storage service key is missing.")

    url = get_supabase_url()
    target_bucket = bucket or get_bucket_name()

    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.request(
                "DELETE",
                f"{url}/storage/v1/object/{target_bucket}",
                json={"prefixes": storage_paths},
                headers=headers
            )
            if res.status_code in (200, 204):
                return True
            logger.error(f"Supabase delete failed ({res.status_code}): {res.text}")
            return False
    except Exception as e:
        logger.error(f"Exception during storage delete for {storage_paths}: {e}")
        return False

async def create_signed_url(storage_path: str, expires_in: int = 60, bucket: str | None = None) -> str:
    """
    Generates a short-lived (e.g. 60s) signed URL for private bucket viewing.
    """
    service_key = get_service_role_key()
    url = get_supabase_url()
    target_bucket = bucket or get_bucket_name()

    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.post(
            f"{url}/storage/v1/object/sign/{target_bucket}/{storage_path}",
            json={"expiresIn": expires_in},
            headers=headers
        )
        if res.status_code == 200:
            data = res.json()
            signed_rel = data.get("signedURL")
            if signed_rel:
                return f"{url}/storage/v1{signed_rel}"
        raise HTTPException(status_code=res.status_code, detail="Could not generate signed access URL.")

async def stream_storage_file(storage_path: str, media_type: str, filename: str, download: bool = False, bucket: str | None = None) -> StreamingResponse:
    """
    Streams file bytes directly from Supabase Storage to the HTTP client
    without buffering the entire content in server RAM.
    """
    service_key = get_service_role_key()
    url = get_supabase_url()
    target_bucket = bucket or get_bucket_name()

    headers = {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key
    }

    file_url = f"{url}/storage/v1/object/{target_bucket}/{storage_path}"
    client = httpx.AsyncClient(timeout=120.0)

    try:
        req = client.build_request("GET", file_url, headers=headers)
        res = await client.send(req, stream=True)

        if res.status_code != 200:
            err_body = await res.aread()
            await res.aclose()
            await client.aclose()
            try:
                err_json = json.loads(err_body.decode("utf-8"))
                if res.status_code == 404 or err_json.get("code") == "NoSuchKey" or str(err_json.get("statusCode")) == "404" or err_json.get("error") == "not_found":
                    raise HTTPException(status_code=404, detail="File not found in storage.")
            except (ValueError, json.JSONDecodeError):
                pass
            if res.status_code == 404:
                raise HTTPException(status_code=404, detail="File not found in storage.")
            raise HTTPException(status_code=res.status_code, detail="Failed to retrieve file from storage.")

        disposition = "attachment" if download else "inline"
        response_headers = {
            "Content-Disposition": f'{disposition}; filename="{filename}"',
            "Cache-Control": "private, no-store, max-age=0, must-revalidate",
            "Referrer-Policy": "no-referrer",
            "X-Content-Type-Options": "nosniff"
        }
        if "content-length" in res.headers:
            response_headers["Content-Length"] = res.headers["content-length"]

        async def stream_generator():
            try:
                async for chunk in res.aiter_bytes(chunk_size=65536):
                    yield chunk
            finally:
                await res.aclose()
                await client.aclose()

        return StreamingResponse(
            stream_generator(),
            media_type=media_type,
            headers=response_headers
        )
    except HTTPException:
        raise
    except Exception as e:
        await client.aclose()
        logger.error(f"Streaming error for {storage_path}: {e}")
        raise HTTPException(status_code=500, detail=f"Error streaming file: {str(e)}")
