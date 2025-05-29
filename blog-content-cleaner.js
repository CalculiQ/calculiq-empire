// blog-content-cleaner.js
// Simple, working version that preserves formatting

class BlogContentCleaner {
    constructor() {
        this.unwantedPrefixes = [
            /^Title:\s*/i,
            /^Opening:\s*/i,
            /^Headline:\s*/i,
            /^Introduction:\s*/i,
            /^Body:\s*/i,
            /^Content:\s*/i,
            /^Article:\s*/i,
            /^Blog post:\s*/i,
            /^Post:\s*/i
        ];
    }

    cleanBlogPost(blogPost) {
        return {
            title: this.cleanTitle(blogPost.title),
            content: this.cleanAndConvertContent(blogPost.content),
            excerpt: this.cleanExcerpt(blogPost.excerpt),
            slug: blogPost.slug,
            calculatorType: blogPost.calculatorType,
            metaDescription: this.cleanMetaDescription(blogPost.metaDescription || blogPost.excerpt)
        };
    }

    cleanTitle(title) {
        if (!title) return '';
        
        let cleaned = title;
        
        // Remove any prefix patterns
        this.unwantedPrefixes.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });
        
        // Remove quotes if they wrap the entire title
        cleaned = cleaned.replace(/^["'](.+)["']$/, '$1');
        
        // Remove any markdown formatting
        cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
        cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');
        cleaned = cleaned.replace(/^#+\s*/gm, '');
        
        return cleaned.trim();
    }

    cleanAndConvertContent(content) {
        if (!content) return '';
        
        let cleaned = content;
        
        // First, ensure proper line breaks
        cleaned = this.fixFormatting(cleaned);
        
        // Convert markdown to HTML
        cleaned = this.convertMarkdownToHTML(cleaned);
        
        return cleaned;
    }

    convertMarkdownToHTML(markdown) {
        if (!markdown) return '';
        
        let html = markdown;

        // Convert headers first
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Convert bold text
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Convert italic
        html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
        
        // Convert links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // Handle lists properly
        html = this.convertLists(html);
        
        // Convert paragraphs - MOST IMPORTANT PART
        const blocks = html.split(/\n\n+/);
        
        html = blocks.map(block => {
            block = block.trim();
            
            // Skip empty blocks
            if (!block) return '';
            
            // Skip if it's already HTML
            if (block.match(/^<[^>]+>/)) {
                return block;
            }
            
            // Otherwise wrap in paragraph
            return '<p>' + block + '</p>';
        }).filter(b => b).join('\n\n');
        
        return html;
    }

    convertLists(html) {
        const lines = html.split('\n');
        const result = [];
        let inList = false;
        let listType = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            // Check for list items
            if (trimmed.match(/^[*-] /)) {
                if (!inList) {
                    result.push('<ul>');
                    inList = true;
                    listType = 'ul';
                }
                result.push('<li>' + trimmed.substring(2) + '</li>');
            } else if (trimmed.match(/^\d+\. /)) {
                if (!inList || listType !== 'ol') {
                    if (inList) result.push(`</${listType}>`);
                    result.push('<ol>');
                    inList = true;
                    listType = 'ol';
                }
                result.push('<li>' + trimmed.replace(/^\d+\. /, '') + '</li>');
            } else {
                // Not a list item
                if (inList) {
                    result.push(`</${listType}>`);
                    inList = false;
                    listType = null;
                }
                result.push(line);
            }
        }
        
        // Close any open list
        if (inList) {
            result.push(`</${listType}>`);
        }
        
        return result.join('\n');
    }

    fixFormatting(content) {
        // Normalize line breaks
        content = content.replace(/\r\n/g, '\n');
        content = content.replace(/\r/g, '\n');
        
        // Ensure headers have blank lines around them
        content = content.replace(/([^\n])\n(#{1,3} )/g, '$1\n\n$2');
        content = content.replace(/(#{1,3} [^\n]+)\n([^\n])/g, '$1\n\n$2');
        
        // Fix multiple line breaks (more than 2 becomes 2)
        content = content.replace(/\n{3,}/g, '\n\n');
        
        return content.trim();
    }

    cleanExcerpt(excerpt) {
        if (!excerpt) return '';
        
        let cleaned = excerpt;
        
        // Remove HTML tags
        cleaned = cleaned.replace(/<[^>]+>/g, '');
        
        // Remove markdown formatting
        cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
        cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');
        cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        cleaned = cleaned.replace(/[#_`]/g, '');
        
        // Trim and limit length
        cleaned = cleaned.trim();
        if (cleaned.length > 160) {
            cleaned = cleaned.substring(0, 157) + '...';
        }
        
        return cleaned;
    }

    cleanMetaDescription(description) {
        return this.cleanExcerpt(description);
    }
}

module.exports = BlogContentCleaner;