const fs = require('fs');
const path = require('path');

module.exports = async function (context, req) {
    const articlesDir = path.join(__dirname, '../../articles');

    try {
        const files = fs.readdirSync(articlesDir);
        const articles = files
            .filter(file => file.endsWith('.md'))
            .map(file => {
                const filePath = path.join(articlesDir, file);
                const data = fs.readFileSync(filePath, 'utf-8');
                const title = data.split('\n')[0].replace(/^#\s*/, ''); // Extract title from first line
                return { title, id: file };
            });

        context.res = {
            status: 200,
            body: articles,
            headers: { 'Content-Type': 'application/json' }
        };
    } catch (error) {
        context.res = {
            status: 500,
            body: { error: 'Unable to fetch articles' }
        };
    }
};
