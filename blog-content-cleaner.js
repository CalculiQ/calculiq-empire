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
        
        // First, clean up any formatting issues
        cleaned = this.fixFormatting(cleaned);
        
        // Then convert markdown to HTML
        cleaned = this.convertMarkdownToHTML(cleaned);
        
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

        // First, detect and convert plain-text headers (lines that look like headers but don't have ##)
        // These are typically short lines (< 60 chars) that might be headers
        const lines = html.split('\n');
        const processedLines = lines.map((line, index) => {
            const trimmedLine = line.trim();
            
            // Check if this looks like a header:
            // - It's relatively short (less than 60 characters)
            // - It doesn't end with common punctuation (. , ! ?)
            // - It's preceded and followed by blank lines or is at start/end
            // - It doesn't start with HTML tags or markdown symbols
            if (trimmedLine.length > 0 && 
                trimmedLine.length < 60 && 
                !trimmedLine.endsWith('.') && 
                !trimmedLine.endsWith(',') && 
                !trimmedLine.endsWith('!') && 
                !trimmedLine.endsWith('?') && 
                !trimmedLine.endsWith(':') &&
                !trimmedLine.startsWith('<') &&
                !trimmedLine.startsWith('#') &&
                !trimmedLine.startsWith('-') &&
                !trimmedLine.startsWith('*') &&
                !trimmedLine.match(/^\d+\./) &&
                (index === 0 || lines[index - 1].trim() === '') &&
                (index === lines.length - 1 || lines[index + 1].trim() === '')) {
                
                // This looks like a header - convert it
                // Determine header level based on common patterns
                if (trimmedLine.match(/^(Today's|This Week's|Current|Breaking|Alert)/i) ||
                    trimmedLine.includes('Reality') ||
                    trimmedLine.includes('Scenarios') ||
                    trimmedLine.includes('Opportunities') ||
                    trimmedLine.includes('Mistakes') ||
                    trimmedLine.includes('Action Plan')) {
                    return `## ${trimmedLine}`;
                }
            }
            
            return line;
        });
        
        html = processedLines.join('\n');

        // CRITICAL: Convert headers FIRST (must be at start of line)
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Convert bold text - but NOT inside URLs or existing HTML tags
        html = html.replace(/\*\*([^*]+)\*\*/g, function(match, content, offset, string) {
            // Check if we're inside a URL
            const beforeText = string.substring(Math.max(0, offset - 50), offset);
            const afterText = string.substring(offset + match.length, offset + match.length + 50);
            
            if (beforeText.includes('](') || afterText.includes(')')) {
                return match; // Don't convert if part of a markdown link
            }
            return '<strong>' + content + '</strong>';
        });
        
        // Convert italic text
        html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        
        // Convert links AFTER bold/italic
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // Convert lists - only at start of lines
        html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

        // Wrap consecutive <li> elements in <ul>
        html = html.replace(/(<li>.*?<\/li>\s*)+/gs, function(match) {
            return '<ul>' + match + '</ul>';
        });
        
        // Handle numbered lists separately
        html = html.replace(/(<li>.*?<\/li>\s*)+/gs, function(match, offset, string) {
            // Check if this was originally a numbered list
            const originalSection = markdown.substring(
                Math.max(0, string.lastIndexOf('\n\n', offset)),
                string.indexOf('\n\n', offset + match.length)
            );
            
            if (/^\d+\./m.test(originalSection)) {
                return '<ol>' + match + '</ol>';
            }
            return '<ul>' + match + '</ul>';
        });

        // Convert paragraphs - this is the tricky part
        // First, protect existing HTML blocks
        const htmlBlocks = [];
        let blockIndex = 0;
        
        // Protect headers, lists, and other HTML elements
        html = html.replace(/(<h[1-6]>.*?<\/h[1-6]>|<ul>.*?<\/ul>|<ol>.*?<\/ol>|<div.*?>.*?<\/div>)/gs, function(match) {
            const placeholder = `<!--HTMLBLOCK${blockIndex}-->`;
            htmlBlocks[blockIndex] = match;
            blockIndex++;
            return placeholder;
        });
        
        // Now convert paragraphs (double newline separated text)
        const sections = html.split(/\n\n+/);
        html = sections.map(section => {
            section = section.trim();
            
            // Skip if it's a placeholder or already has HTML
            if (!section || section.includes('<!--HTMLBLOCK') || section.match(/^<[^>]+>/)) {
                return section;
            }
            
            // Wrap in paragraph tags
            return `<p>${section}</p>`;
        }).filter(s => s).join('\n\n');
        
        // Restore HTML blocks
        htmlBlocks.forEach((block, index) => {
            html = html.replace(`<!--HTMLBLOCK${index}-->`, block);
        });
        
        // Clean up spacing around block elements
        html = html.replace(/<\/p>\s*<p>/g, '</p>\n\n<p>');
        html = html.replace(/<\/h([1-6])>\s*<p>/g, '</h$1>\n\n<p>');
        html = html.replace(/<\/ul>\s*<p>/g, '</ul>\n\n<p>');
        html = html.replace(/<\/ol>\s*<p>/g, '</ol>\n\n<p>');
        html = html.replace(/<\/p>\s*<h([1-6])>/g, '</p>\n\n<h$1>');
        html = html.replace(/<\/p>\s*<ul>/g, '</p>\n\n<ul>');
        
        // Fix any double-wrapped paragraphs
        html = html.replace(/<p>\s*<p>/g, '<p>');
        html = html.replace(/<\/p>\s*<\/p>/g, '</p>');
        
        // Remove empty paragraphs
        html = html.replace(/<p>\s*<\/p>/g, '');
        
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
        cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        
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
        // Fix multiple line breaks (more than 2 becomes 2)
        content = content.replace(/\n{3,}/g, '\n\n');
        
        // Ensure proper spacing after punctuation
        content = content.replace(/([.!?])\s*([A-Z])/g, '$1 $2');
        
        // Fix common markdown issues
        content = content.replace(/\*\*\s+/g, '**'); // Remove space after opening bold
        content = content.replace(/\s+\*\*/g, '**'); // Remove space before closing bold
        
        // Ensure headers have proper spacing
        content = content.replace(/([^\n])\n(#{1,3} )/g, '$1\n\n$2');
        content = content.replace(/(#{1,3} [^\n]+)\n([^\n])/g, '$1\n\n$2');
        
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
        
        // Look for a title (first non-empty line without HTML or markdown)
        for (let i = 0; i < Math.min(lines.length, 5); i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('<') && !line.startsWith('#')) {
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

    // Additional method to fix already-published posts
    fixPublishedPost(post) {
        // This method can be used to fix posts that are already in the database
        return {
            ...post,
            content: this.cleanAndConvertContent(post.content)
        };
    }
}

module.exports = BlogContentCleaner;