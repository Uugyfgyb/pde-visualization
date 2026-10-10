from pathlib import Path

source = Path(__file__).resolve().parent
text = (source / 'textbook.html').read_text(encoding='utf-8')
text = text.replace('href="../../../index.html"', 'href="../../index.html"')
text = text.replace('href="../README.md"', 'href="README.md"')
(source.parent / 'index.html').write_text(text, encoding='utf-8')
print('Built harmonic-functions/index.html (offline, no external assets).')
