#!/usr/bin/env python3
"""Build a Meta App Review screencast MP4 (slideshow + brand assets)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
BRAND = ROOT / "apps/web/public/brand"
W, H = 1280, 720
BG = (7, 6, 12)
CARD = (17, 14, 28)
VIOLET = (124, 58, 237)
WHITE = (255, 255, 255)
MUTED = (161, 161, 170)
OK = (52, 211, 153)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt, max_w: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines or [""]


def slide(title: str, bullets: list[str], footer: str, image_name: str | None = None) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    # glow
    draw.ellipse((900, -120, 1400, 380), fill=(40, 20, 80))
    draw.rounded_rectangle((48, 48, W - 48, H - 48), radius=28, outline=(60, 50, 90), width=2)

    logo_path = BRAND / "logo.jpg"
    if logo_path.exists():
        logo = Image.open(logo_path).convert("RGB").resize((72, 72))
        img.paste(logo, (72, 72))

    title_font = font(36, bold=True)
    body_font = font(24)
    small = font(18)
    draw.text((160, 88), "KRAFTSANDKODES AutoDM", fill=WHITE, font=font(22, bold=True))
    draw.text((160, 118), "Meta App Review screencast", fill=MUTED, font=small)

    y = 190
    for line in wrap(draw, title, title_font, 700):
        draw.text((72, y), line, fill=WHITE, font=title_font)
        y += 46

    y += 12
    for bullet in bullets:
        lines = wrap(draw, bullet, body_font, 650)
        for i, line in enumerate(lines):
            label = f"• {line}" if i == 0 else f"  {line}"
            draw.text((72, y), label, fill=WHITE if i == 0 else MUTED, font=body_font)
            y += 34
        y += 8

    draw.text((72, H - 90), footer, fill=VIOLET, font=small)

    if image_name:
        path = BRAND / image_name
        if path.exists():
            preview = Image.open(path).convert("RGBA")
            preview.thumbnail((420, 420))
            px = W - 72 - preview.width
            py = (H - preview.height) // 2
            # card behind preview
            draw.rounded_rectangle(
                (px - 16, py - 16, px + preview.width + 16, py + preview.height + 16),
                radius=20,
                fill=CARD,
            )
            if preview.mode == "RGBA":
                img.paste(preview, (px, py), preview)
            else:
                img.paste(preview, (px, py))
    return img


def main() -> None:
    frames: list[tuple[Image.Image, float]] = [
        (
            slide(
                "Comment → one private reply",
                [
                    "Creators connect a professional Instagram account",
                    "Keyword on a Reel/post triggers one Meta private reply",
                    "Not bulk DMs. Not unsolicited messaging.",
                ],
                "Permissions: basic + comments + messages",
                "hero-dashboard-preview.png",
            ),
            4.0,
        ),
        (
            slide(
                "1. Open the product",
                [
                    "Marketing: https://kraftsandkodes.com",
                    "App: https://app.kraftsandkodes.com",
                    "Reviewer signs up / logs in",
                ],
                "instagram_business_basic starts here",
                "logo.jpg",
            ),
            3.5,
        ),
        (
            slide(
                "2. Connect Instagram",
                [
                    "Dashboard → Connect Instagram",
                    "Instagram Login (Business) → Allow",
                    "Scopes: basic, manage_comments, manage_messages",
                    "Connected username appears in the app",
                ],
                "Shows instagram_business_basic usage",
                "instagram-hero-icon.png",
            ),
            5.0,
        ),
        (
            slide(
                "3. Create a keyword automation",
                [
                    "Automations → Create",
                    "Pick a specific Reel or post",
                    "Keywords example: TRAIN, LINK",
                    "Action: Send private reply with a link",
                ],
                "Rule is media-specific, not whole profile",
                "hero-analytics-icon.png",
            ),
            4.5,
        ),
        (
            slide(
                "4. Comment arrives (webhook)",
                [
                    "Someone comments TRAIN on that Reel",
                    "Meta sends comments webhook to our HTTPS endpoint",
                    "App matches keyword + media automation",
                ],
                "instagram_business_manage_comments",
                None,
            ),
            4.5,
        ),
        (
            slide(
                "5. One private reply is sent",
                [
                    "POST private reply using comment_id",
                    "Commenter receives one Instagram message",
                    "No follow-up spam. One reply per comment.",
                ],
                "instagram_business_manage_messages",
                None,
            ),
            5.0,
        ),
        (
            slide(
                "6. Activity shows the result",
                [
                    "Dashboard → Activity",
                    "Row: comment, keyword, status sent",
                    "Failed / waiting states are visible too",
                ],
                "End-to-end reviewer verification",
                "hero-dashboard-preview.png",
            ),
            4.0,
        ),
        (
            slide(
                "What we do NOT do",
                [
                    "No messaging people who did not comment",
                    "No bulk / cold DMs",
                    "No content publishing or insights scopes",
                    "Official Meta Instagram Login + Graph only",
                ],
                "Karan Digital Labs · KRAFTSANDKODES",
                None,
            ),
            4.0,
        ),
    ]

    OUT.mkdir(parents=True, exist_ok=True)
    list_path = OUT / "frames.txt"
    lines: list[str] = []
    for i, (frame, seconds) in enumerate(frames):
        path = OUT / f"frame-{i:02d}.png"
        frame.save(path)
        # ffmpeg concat demuxer needs duration after each file except last optional
        lines.append(f"file '{path.name}'")
        lines.append(f"duration {seconds}")
    # repeat last frame for concat demuxer
    lines.append(f"file '{OUT.name}/frame-{len(frames)-1:02d}.png'".replace(f"{OUT.name}/", ""))
    # fix last file line
    lines[-1] = f"file 'frame-{len(frames)-1:02d}.png'"
    list_path.write_text("\n".join(lines) + "\n")
    print(f"wrote {len(frames)} frames to {OUT}")


if __name__ == "__main__":
    main()
