// blog-content-cleaner.js
// Fixed version - properly handles markdown and preserves content

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

        this.repetitiveOpenings = [
            /^Picture this:\s*/i,
            /^Imagine this:\s*/i,
            /^Think about this:\s*/i,
            /^Consider this:\s*/i,
            /^Here's the thing:\s*/i,
            /^Let me tell you:\s*/i,
            /^Here's what happened:\s*/i
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
        cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1'); // Remove bold
        cleaned = cleaned.replace(/\*(.+?)\*/g, '$1'); // Remove italic
        cleaned = cleaned.replace(/^#+\s*/gm, ''); // Remove headers
        
        // Trim whitespace
        cleaned = cleaned.trim();
        
        // Ensure first letter is capitalized
        if (cleaned.length > 0) {
            cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        }
        
        return cleaned;
    }

    cleanAndConvertContent(content) {
        if (!content) return '';
        
        let cleaned = content;
        
        // First, convert markdown to HTML
        cleaned = this.convertMarkdownToHTML(cleaned);
        
        // Then clean up any formatting issues
        cleaned = this.fixFormatting(cleaned);
        
        // Remove any unwanted prefixes from the beginning
        const lines = cleaned.split('\n');
        if (lines.length > 0) {
            this.unwantedPrefixes.forEach(pattern => {
                lines[0] = lines[0].replace(pattern, '');
            });
        }
        
        cleaned = lines.join('\n');
        
        return cleaned;
    }

    convertMarkdownToHTML(markdown) {
        if (!markdown) return '';
        
        let html = markdown;
        
        // Convert bold text FIRST (before other conversions)
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        
        // Convert italic text
        html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
        
        // Convert headers (must be at start of line)
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Convert lists
        html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
        
        // Wrap consecutive <li> elements in <ul>
        html = html.replace(/(<li>.*?<\/li>\s*)+/gs, function(match) {
            return '<ul>' + match + '</ul>';
        });
        
        // Convert paragraphs (split by double newlines)
        const paragraphs = html.split(/\n\n+/);
        html = paragraphs.map(para => {
            para = para.trim();
            
            // Don't wrap if already has HTML tags
            if (para && !para.match(/^<[^>]+>/)) {
                return `<p>${para}</p>`;
            }
            return para;
        }).join('\n\n');
        
        // Clean up spacing around block elements
        html = html.replace(/<\/p>\s*<p>/g, '</p>\n\n<p>');
        html = html.replace(/<\/h([1-6])>\s*<p>/g, '</h$1>\n\n<p>');
        html = html.replace(/<\/ul>\s*<p>/g, '</ul>\n\n<p>');
        
        return html;
    }

    cleanExcerpt(excerpt) {
        if (!excerpt) return '';
        
        let cleaned = excerpt;
        
        // Remove prefixes
        this.unwantedPrefixes.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });
        
        // Remove repetitive openings
        this.repetitiveOpenings.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });
        
        // Remove HTML tags
        cleaned = cleaned.replace(/<[^>]+>/g, '');
        
        // Remove markdown formatting
        cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
        cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');
        
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

    fixFormatting(content) {
        // Fix multiple line breaks
        content = content.replace(/\n{3,}/g, '\n\n');
        
        // Fix spacing around HTML tags
        content = content.replace(/>\s+</g, '><');
        
        // Ensure proper spacing after punctuation
        content = content.replace(/([.!?])\s*([A-Z])/g, '$1 $2');
        
        // Fix common HTML issues
        content = content.replace(/<p>\s*<\/p>/g, '');
        content = content.replace(/<p>\s*<p>/g, '<p>');
        content = content.replace(/<\/p>\s*<\/p>/g, '</p>');
        
        // Ensure lists are properly formatted
        content = content.replace(/<\/li>\s*<li>/g, '</li>\n<li>');
        
        return content.trim();
    }

    // Check if content needs cleaning
    needsCleaning(content) {
        if (!content) return false;
        
        // Check for any unwanted prefixes
        for (let pattern of this.unwantedPrefixes) {
            if (pattern.test(content)) return true;
        }
        
        // Check for repetitive openings
        for (let pattern of this.repetitiveOpenings) {
            if (pattern.test(content)) return true;
        }
        
        // Check for markdown formatting
        if (content.includes('**') || content.includes('##')) return true;
        
        return false;
    }

    // Extract clean content from AI response
    extractCleanContent(aiResponse) {
        if (!aiResponse) return null;
        
        // Remove any meta instructions or labels
        let cleaned = aiResponse;
        
        // Remove lines that are just labels
        const labelPatterns = [
            /^Title:.*$/gim,
            /^Opening:.*$/gim,
            /^Body:.*$/gim,
            /^Conclusion:.*$/gim,
            /^Meta Description:.*$/gim,
            /^SEO Title:.*$/gim,
            /^Keywords:.*$/gim,
            /^Tags:.*$/gim
        ];
        
        labelPatterns.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });
        
        // Extract title if it exists on its own line at the start
        const lines = cleaned.trim().split('\n');
        let title = '';
        let contentStartIndex = 0;
        
        // Look for a title (first non-empty line without HTML)
        for (let i = 0; i < Math.min(lines.length, 5); i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('<')) {
                // This could be our title
                title = this.cleanTitle(line);
                contentStartIndex = i + 1;
                break;
            }
        }
        
        // Get the rest as content
        const content = lines.slice(contentStartIndex).join('\n').trim();
        
        return {
            title: title,
            content: this.cleanAndConvertContent(content)
        };
    }
}

module.exports = BlogContentCleaner;