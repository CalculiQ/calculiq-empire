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
        // Keep it simple - just ensure good spacing
        // Don't add complex HTML that will break
        
        // Ensure headers have good spacing
        content = content.replace(/([.!?])\n(## )/g, '$1\n\n$2');
        content = content.replace(/(## .+)\n([^#\n])/g, '$1\n\n$2');
        
        return content;
    }

    convertMarkdownToHTML(markdown) {
        if (!markdown) return '';
        
        let html = markdown;

        // Convert headers FIRST - they must be at start of line
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Convert bold - but check we're not in a link
        html = html.replace(/\*\*([^*]+)\*\*/g, function(match, content, offset, string) {
            // Simple check - if there's a ]( before or ) after, skip
            const before = string.substring(Math.max(0, offset - 2), offset);
            const after = string.substring(offset + match.length, offset + match.length + 1);
            
            if (before.includes('](') || after.includes(')')) {
                return match;
            }
            return '<strong>' + content + '</strong>';
        });
        
        // Convert italic
        html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
        
        // Convert links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // Convert bullet lists properly
        const lines = html.split('\n');
        let inList = false;
        let processedLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                if (!inList) {
                    processedLines.push('<ul>');
                    inList = true;
                }
                processedLines.push('<li>' + trimmed.substring(2) + '</li>');
            } else if (inList && trimmed === '') {
                // Empty line - might be end of list
                if (i + 1 < lines.length && !lines[i + 1].trim().startsWith('* ') && !lines[i + 1].trim().startsWith('- ')) {
                    processedLines.push('</ul>');
                    processedLines.push('');
                    inList = false;
                }
            } else {
                if (inList) {
                    processedLines.push('</ul>');
                    inList = false;
                }
                processedLines.push(line);
            }
        }
        
        if (inList) {
            processedLines.push('</ul>');
        }
        
        html = processedLines.join('\n');
        
        // Convert paragraphs - simple approach
        html = html.split('\n\n').map(section => {
            section = section.trim();
            
            // Don't wrap if it's already HTML or empty
            if (!section || section.startsWith('<')) {
                return section;
            }
            
            return '<p>' + section + '</p>';
        }).join('\n\n');
        
        // Clean up spacing
        html = html.replace(/<\/p>\n\n<ul>/g, '</p>\n<ul>');
        html = html.replace(/<\/ul>\n\n<p>/g, '</ul>\n<p>');
        html = html.replace(/<\/h2>\n\n<p>/g, '</h2>\n<p>');
        html = html.replace(/<\/h3>\n\n<p>/g, '</h3>\n<p>');
        
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
        // Keep formatting simple - don't add complex classes that might break
        
        // Just ensure good spacing
        html = html.replace(/<\/p>\s*<h2>/g, '</p>\n\n<h2>');
        html = html.replace(/<\/h2>\s*<p>/g, '</h2>\n\n<p>');
        html = html.replace(/<\/p>\s*<h3>/g, '</p>\n\n<h3>');
        html = html.replace(/<\/h3>\s*<p>/g, '</h3>\n\n<p>');
        
        // Remove any empty paragraphs
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

    // Method to add professional styling to blog post page
    getProfessionalStyles() {
        return `
            /* Better typography */
            .blog-post p {
                margin-bottom: 1.5em;
                line-height: 1.8;
            }
            
            .blog-post h2 {
                margin-top: 2.5em;
                margin-bottom: 1em;
                padding-top: 0.5em;
                color: var(--text-primary);
            }
            
            .blog-post h3 {
                margin-top: 2em;
                margin-bottom: 0.8em;
                color: var(--text-primary);
            }
            
            /* Better list styling */
            .blog-post ul, .blog-post ol {
                margin: 1.5em 0;
                padding-left: 2em;
            }
            
            .blog-post li {
                margin: 0.5em 0;
                line-height: 1.7;
            }
            
            /* Make the content feel more spacious */
            .blog-post {
                font-size: 1.125rem;
            }
            
            /* Better link styling */
            .blog-post a {
                color: var(--accent-blue);
                font-weight: 500;
                text-decoration: none;
                border-bottom: 1px solid transparent;
                transition: all 0.2s ease;
            }
            
            .blog-post a:hover {
                border-bottom-color: var(--accent-blue);
            }
            
            /* Style strong text */
            .blog-post strong {
                color: var(--text-primary);
                font-weight: 600;
            }
            
            /* Add some visual interest to the CTA section */
            .blog-post h2:last-of-type {
                margin-top: 3em;
                text-align: center;
                background: var(--accent-gradient);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            
            /* Make the CTA link stand out - targeting the link after "Calculate Your" */
            .blog-post p a[href*="#calculators"] {
                display: inline-block;
                margin-top: 1em;
                padding: 0.8em 2em;
                background: var(--accent-gradient);
                color: white !important;
                border-radius: 30px;
                font-weight: 600;
                text-decoration: none;
                border: none;
                transition: all 0.3s ease;
                box-shadow: 0 10px 30px rgba(123, 47, 247, 0.3);
            }
            
            .blog-post p a[href*="#calculators"]:hover {
                transform: translateY(-2px);
                box-shadow: 0 15px 40px rgba(123, 47, 247, 0.4);
                border-bottom: none;
            }
        `;
    }
}

module.exports = BlogContentCleaner;