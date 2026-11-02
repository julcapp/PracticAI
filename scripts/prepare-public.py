from pathlib import Path

root = Path(__file__).resolve().parents[1]
page = root / 'public' / 'index.html'
html = page.read_text()

if 'id="course-catalog"' not in html:
    nav_item = '    <li><a href="#experts">Эксперты</a></li>'
    assert nav_item in html
    html = html.replace(nav_item, nav_item + '\n'
        '    <li><a href="#education">Образование</a></li>\n'
        '    <li><a href="#course-catalog">Курсы</a></li>\n'
        '    <li><a href="#organization">Об организации</a></li>', 1)
    assert '<!-- CONTACT -->' in html
    html = html.replace('<!-- CONTACT -->',
                        (root / 'education-home.html').read_text() + '<!-- CONTACT -->', 1)
    html = html.replace('</head>', (root / 'education-home.css').read_text() + '</head>', 1)

if 'src="/site-enhancements.js"' not in html:
    html = html.replace('</body>', '<script src="/site-enhancements.js" defer></script>\n</body>', 1)

page.write_text(html)


# Version the consultant bundle so returning browsers load the new widget.
for public_page in (root / 'public').rglob('*.html'):
    markup = public_page.read_text()
    markup = markup.replace('src="/assistant-widget.js"', 'src="/assistant-widget.js?v=20261102-scenarios"')
    public_page.write_text(markup)
