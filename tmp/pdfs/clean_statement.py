from io import BytesIO
from pathlib import Path
import sys

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas


def cleanup_page(page):
    width = float(page.mediabox.width)
    height = float(page.mediabox.height)

    layer = BytesIO()
    draw = canvas.Canvas(layer, pagesize=(width, height))
    draw.setFillColorRGB(1, 1, 1)
    # Remove the browser-added print header and footer while preserving the
    # statement's own heading, company information, and table.
    draw.rect(0, height - 28, width, 28, fill=1, stroke=0)
    draw.rect(0, 0, width, 25, fill=1, stroke=0)
    draw.save()
    layer.seek(0)
    page.merge_page(PdfReader(layer).pages[0])


source = Path(sys.argv[1])
destination = Path(sys.argv[2])
destination.parent.mkdir(parents=True, exist_ok=True)

reader = PdfReader(source)
writer = PdfWriter()
writer.metadata = reader.metadata
for source_page in reader.pages:
    cleanup_page(source_page)
    writer.add_page(source_page)

with destination.open("wb") as output:
    writer.write(output)

# Reopen the result as a structural sanity check.
verified = PdfReader(destination)
if len(verified.pages) != len(reader.pages):
    raise RuntimeError("Page count changed during cleanup")

