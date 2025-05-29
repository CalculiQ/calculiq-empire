// blog-content-cleaner-enhanced.js
// Enhanced version with professional formatting rules

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
        
        // Add professional formatting enhancements
        cleaned = this.addProfessionalFormatting(cleaned);
        
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
        
        // Final formatting pass
        cleaned = this.finalFormattingPass(cleaned);
        
        return cleaned;
    }

    addProfessionalFormatting(content) {
        // Add visual separators between major sections
        content = content.replace(/\n## /g, '\n\n---\n\n## ');
        
        // Enhance key callouts
        content = content.replace(/💡 \*\*Key Insight:\*\*/g, '<div class="key-insight">💡 <strong>Key Insight:</strong>');
        content = content.replace(/📊 \*\*By the Numbers:\*\*/g, '<div class="by-numbers">📊 <strong>By the Numbers:</strong>');
        content = content.replace(/⚡ \*\*Quick Tip:\*\*/g, '<div class="quick-tip">⚡ <strong>Quick Tip:</strong>');
        content = content.replace(/📌 \*\*Note:\*\*/g, '<div class="note">📌 <strong>Note:</strong>');
        
        // Close the divs after the paragraph
        content = content.replace(/(<div class="[^"]+">.*?)(\n\n)/gs, '$1</div>$2');
        
        return content;
    }

    convertMarkdownToHTML(markdown) {
        if (!markdown) return '';
        
        let html = markdown;

        // Process in specific order for clean conversion
        
        // 1. Convert horizontal rules first
        html = html.replace(/^---$/gm, '<hr class="section-divider">');
        
        // 2. Convert headers (must be at start of line)
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // 3. Convert bold text (but not inside URLs)
        html = html.replace(/\*\*([^*]+)\*\*/g, function(match, content, offset, string) {
            const beforeText = string.substring(Math.max(0, offset - 50), offset);
            const afterText = string.substring(offset + match.length, offset + match.length + 50);
            
            if (beforeText.includes('](') || afterText.includes(')')) {
                return match; // Don't convert if part of a markdown link
            }
            return '<strong>' + content + '</strong>';
        });
        
        // 4. Convert italic text
        html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        
        // 5. Convert links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // 6. Convert lists
        html = this.convertLists(html);
        
        // 7. Convert paragraphs (complex)
        html = this.convertParagraphs(html);
        
        // 8. Clean up spacing
        html = this.cleanupSpacing(html);
        
        return html;
    }

    convertLists(html) {
        // Split by double newlines to process sections
        const sections = html.split(/\n\n+/);
        
        return sections.map(section => {
            // Check if this section is a list
            const lines = section.split('\n');
            const listLines = [];
            let inList = false;
            let listType = null;
            
            for (const line of lines) {
                if (line.match(/^\* /) || line.match(/^- /)) {
                    inList = true;
                    listType = 'ul';
                    listLines.push('<li>' + line.substring(2) + '</li>');
                } else if (line.match(/^\d+\. /)) {
                    inList = true;
                    listType = 'ol';
                    listLines.push('<li>' + line.replace(/^\d+\. /, '') + '</li>');
                } else if (inList && line.trim() === '') {
                    // Empty line in list - ignore
                } else if (inList) {
                    // Non-list line - close the list
                    const listHtml = `<${listType}>${listLines.join('')}</${listType}>`;
                    return listHtml + '\n' + line;
                } else {
                    return line;
                }
            }
            
            if (inList && listLines.length > 0) {
                return `<${listType}>${listLines.join('')}</${listType}>`;
            }
            
            return section;
        }).join('\n\n');
    }

    convertParagraphs(html) {
        // Protect existing HTML blocks
        const htmlBlocks = [];
        let blockIndex = 0;
        
        // Protect all HTML elements
        html = html.replace(/(<[^>]+>.*?<\/[^>]+>|<[^>]+\/>|<hr[^>]*>)/gs, function(match) {
            const placeholder = `<!--HTMLBLOCK${blockIndex}-->`;
            htmlBlocks[blockIndex] = match;
            blockIndex++;
            return placeholder;
        });
        
        // Now convert paragraphs
        const sections = html.split(/\n\n+/);
        html = sections.map(section => {
            section = section.trim();
            
            // Skip if it's a placeholder or starts with HTML
            if (!section || section.includes('<!--HTMLBLOCK')) {
                return section;
            }
            
            // Check if it's already wrapped or is a special element
            if (section.match(/^<[^>]+>/) || section.match(/^---$/)) {
                return section;
            }
            
            // Wrap in paragraph tags
            return `<p>${section}</p>`;
        }).filter(s => s).join('\n\n');
        
        // Restore HTML blocks
        htmlBlocks.forEach((block, index) => {
            html = html.replace(`<!--HTMLBLOCK${index}-->`, block);
        });
        
        return html;
    }

    cleanupSpacing(html) {
        // Ensure proper spacing between elements
        html = html.replace(/<\/p>\s*<p>/g, '</p>\n\n<p>');
        html = html.replace(/<\/h2>\s*<p>/g, '</h2>\n\n<p>');
        html = html.replace(/<\/h3>\s*<p>/g, '</h3>\n\n<p>');
        html = html.replace(/<\/p>\s*<h2>/g, '</p>\n\n<h2>');
        html = html.replace(/<\/p>\s*<h3>/g, '</p>\n\n<h3>');
        html = html.replace(/<\/ul>\s*<p>/g, '</ul>\n\n<p>');
        html = html.replace(/<\/ol>\s*<p>/g, '</ol>\n\n<p>');
        html = html.replace(/<hr class="section-divider">\s*<h2>/g, '<hr class="section-divider">\n\n<h2>');
        
        // Remove empty paragraphs
        html = html.replace(/<p>\s*<\/p>/g, '');
        
        // Fix any double-wrapped elements
        html = html.replace(/<p>\s*<p>/g, '<p>');
        html = html.replace(/<\/p>\s*<\/p>/g, '</p>');
        
        return html;
    }

    finalFormattingPass(html) {
        // Add professional CSS classes for styling
        html = html.replace(/<h2>/g, '<h2 class="section-header">');
        html = html.replace(/<h3>/g, '<h3 class="subsection-header">');
        
        // Enhance tables if present
        html = html.replace(/<table>/g, '<table class="data-table">');
        
        // Add classes to lists for better styling
        html = html.replace(/<ul>/g, '<ul class="content-list">');
        html = html.replace(/<ol>/g, '<ol class="numbered-list">');
        
        // Ensure calculator CTAs have proper styling
        html = html.replace(/(<div class="calculator-cta-section">)/g, '$1');
        html = html.replace(/(<a[^>]*href=["'][^"']*#calculators["'][^>]*>)/g, function(match) {
            if (!match.includes('class=')) {
                return match.replace('>', ' class="calculator-link">');
            }
            return match;
        });
        
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

    // Method to add custom styling to blog post page
    getProfessionalStyles() {
        return `
            .section-divider {
                margin: 50px 0;
                border: none;
                height: 1px;
                background: linear-gradient(to right, transparent, var(--glass-border), transparent);
            }
            
            .section-header {
                margin-top: 50px;
                padding-top: 20px;
            }
            
            .subsection-header {
                margin-top: 35px;
                padding-top: 15px;
            }
            
            .key-insight, .by-numbers, .quick-tip, .note {
                background: var(--glass-bg);
                border-left: 4px solid var(--accent-blue);
                padding: 20px 25px;
                margin: 30px 0;
                border-radius: 8px;
            }
            
            .by-numbers {
                border-left-color: var(--accent-purple);
            }
            
            .quick-tip {
                border-left-color: #ffa726;
            }
            
            .note {
                border-left-color: #66bb6a;
            }
            
            .data-table {
                margin: 30px 0;
                width: 100%;
                border-collapse: collapse;
                background: var(--glass-bg);
                border-radius: 10px;
                overflow: hidden;
            }
            
            .data-table th {
                background: var(--secondary-dark);
                color: var(--accent-blue);
                padding: 15px;
                font-weight: 600;
            }
            
            .data-table td {
                padding: 12px 15px;
                border-bottom: 1px solid var(--glass-border);
            }
            
            .content-list, .numbered-list {
                margin: 25px 0;
                padding-left: 25px;
            }
            
            .content-list li, .numbered-list li {
                margin: 12px 0;
                line-height: 1.7;
            }
            
            .calculator-link {
                color: var(--accent-blue);
                font-weight: 600;
                text-decoration: none;
                transition: all 0.3s ease;
            }
            
            .calculator-link:hover {
                color: var(--accent-purple);
                text-decoration: underline;
            }
        `;
    }
}

module.exports = BlogContentCleaner;