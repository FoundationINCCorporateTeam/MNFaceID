// simpleMarkdownParser.js
function markdownToHtml(markdown) {
    // Convert headers
    let html = markdown.replace(/^(#{1,6})\s*(.+)$/gm, (match, hashes, title) => {
        const level = hashes.length;
        return `<h${level}>${title}</h${level}>`;
    });

    // Convert bold text
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Convert links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Convert images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;" />');

    // Convert unordered lists
    html = html.replace(/^\s*\*\s*(.+)$/gm, '<ul><li>$1</li></ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, ''); // Merge multiple lists into one

    // Convert line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
}

module.exports = { markdownToHtml };
