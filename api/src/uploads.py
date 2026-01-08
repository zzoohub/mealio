"""File upload utilities."""

import hashlib
import os
from io import BytesIO
from typing import Any
from uuid import uuid4

from PIL import Image
from fastapi import HTTPException, UploadFile, status

from src.config import settings


class FileUploadService:
    """File upload service for handling image uploads."""

    def __init__(self):
        self.allowed_extensions = settings.allowed_image_extensions
        self.max_file_size = settings.max_upload_size_mb * 1024 * 1024  # Convert to bytes
        self.max_dimensions = settings.max_image_dimensions

    def validate_file(self, file: UploadFile) -> None:
        """Validate uploaded file."""
        # Check file extension
        if file.filename:
            extension = os.path.splitext(file.filename)[1].lower()
            if extension not in self.allowed_extensions:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File type not allowed. Allowed types: {', '.join(self.allowed_extensions)}",
                )

        # Check file size
        if file.size and file.size > self.max_file_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size: {settings.max_upload_size_mb}MB",
            )

        # Check MIME type
        allowed_mime_types = [
            "image/jpeg",
            "image/jpg", 
            "image/png",
            "image/webp",
            "image/heic",
            "image/heif",
        ]
        if file.content_type and file.content_type not in allowed_mime_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type",
            )

    def generate_filename(self, original_filename: str | None = None) -> str:
        """Generate unique filename."""
        unique_id = str(uuid4())
        
        if original_filename:
            extension = os.path.splitext(original_filename)[1].lower()
            if not extension:
                extension = ".jpg"
        else:
            extension = ".jpg"
        
        return f"{unique_id}{extension}"

    async def process_image(
        self, 
        file: UploadFile,
        generate_thumbnail: bool = True,
        thumbnail_size: tuple[int, int] = (300, 300),
    ) -> dict[str, Any]:
        """Process uploaded image file."""
        self.validate_file(file)
        
        # Read file content
        content = await file.read()
        await file.seek(0)  # Reset file pointer
        
        # Generate hash for deduplication
        file_hash = hashlib.md5(content).hexdigest()
        
        try:
            # Open image with Pillow
            with Image.open(BytesIO(content)) as img:
                # Convert HEIC/HEIF to JPEG if needed
                if img.format in ["HEIC", "HEIF"]:
                    img = img.convert("RGB")
                
                # Get original dimensions
                width, height = img.size
                
                # Resize if too large
                if width > self.max_dimensions[0] or height > self.max_dimensions[1]:
                    img.thumbnail(self.max_dimensions, Image.Resampling.LANCZOS)
                    width, height = img.size
                
                # Generate filename
                filename = self.generate_filename(file.filename)
                
                # Convert to RGB if necessary (for JPEG)
                if img.mode in ("RGBA", "P", "LA"):
                    background = Image.new("RGB", img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
                    img = background
                
                # Save processed image
                processed_buffer = BytesIO()
                img.save(processed_buffer, format="JPEG", quality=90, optimize=True)
                processed_content = processed_buffer.getvalue()
                
                # Generate thumbnail if requested
                thumbnail_content = None
                if generate_thumbnail:
                    thumb_img = img.copy()
                    thumb_img.thumbnail(thumbnail_size, Image.Resampling.LANCZOS)
                    
                    thumbnail_buffer = BytesIO()
                    thumb_img.save(thumbnail_buffer, format="JPEG", quality=85, optimize=True)
                    thumbnail_content = thumbnail_buffer.getvalue()
                
                return {
                    "filename": filename,
                    "original_filename": file.filename,
                    "content": processed_content,
                    "thumbnail_content": thumbnail_content,
                    "width": width,
                    "height": height,
                    "file_size": len(processed_content),
                    "mime_type": "image/jpeg",
                    "file_hash": file_hash,
                }
                
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image file: {str(e)}",
            )

    async def upload_to_storage(
        self,
        content: bytes,
        filename: str,
        content_type: str = "image/jpeg",
    ) -> str:
        """Upload file to storage (S3, local, etc.)."""
        # TODO: Implement actual storage upload
        # For now, return a mock URL
        return f"https://storage.example.com/uploads/{filename}"

    async def delete_from_storage(self, file_url: str) -> bool:
        """Delete file from storage."""
        # TODO: Implement actual file deletion
        return True


# Global instance
upload_service = FileUploadService()