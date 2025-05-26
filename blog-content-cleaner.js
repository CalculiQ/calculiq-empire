// blog-content-cleaner.js
// Cleans AI-generated blog content to remove unwanted prefixes and patterns

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
            content: this.cleanContent(blogPost.content),
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
        
        // Trim whitespace
        cleaned = cleaned.trim();
        
        // Ensure first letter is capitalized
        if (cleaned.length > 0) {
            cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        }
        
        return cleaned;
    }

    cleanContent(content) {
        if (!content) return '';
        
        let cleaned = content;
        
        // Split into lines for line-by-line processing
        let lines = cleaned.split('\n');
        
        // Process each line
        lines = lines.map(line => {
            // Remove unwanted prefixes from any line
            let cleanedLine = line;
            this.unwantedPrefixes.forEach(pattern => {
                cleanedLine = cleanedLine.replace(pattern, '');
            });
            
            // Remove repetitive opening patterns
            this.repetitiveOpenings.forEach(pattern => {
                cleanedLine = cleanedLine.replace(pattern, '');
            });
            
            return cleanedLine.trim();
        });
        
        // Remove empty lines at the beginning
        while (lines.length > 0 && lines[0] === '') {
            lines.shift();
        }
        
        // Join lines back together
        cleaned = lines.join('\n');
        
        // Clean up any remaining formatting issues
        cleaned = this.fixFormatting(cleaned);
        
        return cleaned;
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
        
        // Check if first non-empty line is a title (no HTML tags)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.startsWith('<')) {
                title = this.cleanTitle(line);
                contentStartIndex = i + 1;
                break;
            }
        }
        
        // Get the rest as content
        const content = lines.slice(contentStartIndex).join('\n').trim();
        
        return {
            title: title,
            content: this.cleanContent(content)
        };
    }
}

module.exports = BlogContentCleaner;