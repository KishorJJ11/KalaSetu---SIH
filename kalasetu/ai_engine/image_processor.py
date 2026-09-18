"""
KalaSetu AI Studio Image Enhancement
--------------------------------------
Removes cluttered rural-workshop backgrounds and re-composites the
product onto a clean studio canvas with a soft drop shadow, so a
single mid-range smartphone photo looks catalog-ready.
"""

import io
from typing import Tuple

from PIL import Image, ImageFilter, ImageOps, ImageChops, ImageEnhance
from rembg import remove, new_session

# rembg session is created once and reused across requests for speed.
_SESSION = new_session("u2net")

STUDIO_CANVAS_SIZE: Tuple[int, int] = (1600, 1600)
STUDIO_BG_COLOR = (250, 250, 250, 255)  # Warm off-white #FAFAFA
PRODUCT_MAX_FRACTION = 0.78  # product occupies at most 78% of canvas
SHADOW_BLUR_RADIUS = 28
SHADOW_OPACITY = 90  # 0-255
SHADOW_Y_OFFSET_FRACTION = 0.035


def _trim_transparent_border(img: Image.Image) -> Image.Image:
    """Crops fully-transparent padding around the cutout subject."""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    if bbox:
        return img.crop(bbox)
    return img


def _build_drop_shadow(cutout: Image.Image, canvas_size: Tuple[int, int]) -> Image.Image:
    """Builds a soft, blurred elliptical drop shadow beneath the product."""
    shadow_layer = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    alpha = cutout.split()[-1]
    silhouette = Image.new("RGBA", cutout.size, (33, 33, 33, SHADOW_OPACITY))
    silhouette.putalpha(alpha)

    # Flatten the silhouette into a soft blob rather than a sharp copy.
    flat_shadow = silhouette.filter(ImageFilter.GaussianBlur(SHADOW_BLUR_RADIUS))
    # Squash vertically for a grounded "resting on surface" look.
    squash_height = max(1, int(flat_shadow.height * 0.35))
    flat_shadow = flat_shadow.resize((flat_shadow.width, squash_height))

    return flat_shadow


def enhance_product_image(image_bytes: bytes) -> bytes:
    """
    Full enhancement pipeline:
      1. Auto light enhancement (Brightness, Contrast, Sharpness, Color).
      2. Background removal (rembg / u2net).
      3. Trim transparent padding to the product's true bounding box.
      4. Scale product to fit within the studio canvas with margin.
      5. Composite a soft drop shadow.
      6. Paste product onto a clean warm off-white studio canvas.
    Returns the final PNG image as bytes.
    """
    input_img = Image.open(io.BytesIO(image_bytes))
    input_img = ImageOps.exif_transpose(input_img)  # respect phone camera orientation
    if input_img.mode != "RGBA":
        input_img = input_img.convert("RGBA")

    # Step 1: Light Enhancement
    # Brightness (15% boost)
    input_img = ImageEnhance.Brightness(input_img).enhance(1.15)
    # Contrast (15% boost)
    input_img = ImageEnhance.Contrast(input_img).enhance(1.15)
    # Sharpness (20% boost)
    input_img = ImageEnhance.Sharpness(input_img).enhance(1.20)
    # Color Saturation (10% boost)
    input_img = ImageEnhance.Color(input_img).enhance(1.10)

    # Step 2: remove background
    cutout_bytes = remove(
        input_img,
        session=_SESSION,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=15,
        alpha_matting_erode_size=8,
    )
    cutout = cutout_bytes if isinstance(cutout_bytes, Image.Image) else Image.open(
        io.BytesIO(cutout_bytes)
    )
    if cutout.mode != "RGBA":
        cutout = cutout.convert("RGBA")

    # Step 2: trim transparent padding
    cutout = _trim_transparent_border(cutout)

    # Step 3: scale to fit within canvas
    canvas_w, canvas_h = STUDIO_CANVAS_SIZE
    max_w = int(canvas_w * PRODUCT_MAX_FRACTION)
    max_h = int(canvas_h * PRODUCT_MAX_FRACTION)
    scale = min(max_w / cutout.width, max_h / cutout.height, 1.0) if cutout.width and cutout.height else 1.0
    # Upscale modestly too if the source photo was small/cropped tight.
    if cutout.width and cutout.height:
        upscale = min(max_w / cutout.width, max_h / cutout.height)
        scale = min(upscale, 3.0)
    new_size = (max(1, int(cutout.width * scale)), max(1, int(cutout.height * scale)))
    cutout = cutout.resize(new_size, Image.LANCZOS)

    # Step 4: build canvas + shadow
    canvas = Image.new("RGBA", STUDIO_CANVAS_SIZE, STUDIO_BG_COLOR)

    paste_x = (canvas_w - cutout.width) // 2
    paste_y = (canvas_h - cutout.height) // 2

    shadow = _build_drop_shadow(cutout, cutout.size)
    shadow_y = paste_y + cutout.height - shadow.height // 2
    shadow_y = min(canvas_h - shadow.height, shadow_y + int(canvas_h * SHADOW_Y_OFFSET_FRACTION))
    canvas.alpha_composite(shadow, dest=(paste_x, max(0, shadow_y)))

    # Step 5: paste the product on top of the shadow
    canvas.alpha_composite(cutout, dest=(paste_x, paste_y))

    final_rgb = canvas.convert("RGB")
    out_buffer = io.BytesIO()
    final_rgb.save(out_buffer, format="PNG", optimize=True)
    return out_buffer.getvalue()
