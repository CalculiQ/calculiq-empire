// fix-existing-posts.js
// Run this script to fix all existing blog posts in the database

const { Pool } = require('pg');
require('dotenv').config();

// Import the cleaner - using the CORRECT existing file name
const BlogContentCleaner = require('./blog-content-cleaner');

async function fixAllPosts() {
    console.log('🔧 Starting blog post formatting fix...');
    
    // Initialize database connection
    const db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    const cleaner = new BlogContentCleaner();
    
    try {
        // Fetch all blog posts
        const result = await db.query(
            'SELECT id, slug, title, content, excerpt FROM blog_posts WHERE status = $1',
            ['published']
        );
        
        const posts = result.rows;
        console.log(`📝 Found ${posts.length} posts to fix`);
        
        let fixedCount = 0;
        
        for (const post of posts) {
            try {
                console.log(`\nProcessing: ${post.title}`);
                
                // Check if content needs fixing
                if (post.content.includes('**') || post.content.includes('##') || !post.content.includes('<p>')) {
                    console.log('  - Needs fixing');
                    
                    // Clean the content
                    const cleaned = cleaner.cleanBlogPost({
                        title: post.title,
                        content: post.content,
                        excerpt: post.excerpt,
                        slug: post.slug,
                        calculatorType: 'unknown'
                    });
                    
                    // Update in database
                    await db.query(
                        'UPDATE blog_posts SET content = $1, title = $2, excerpt = $3 WHERE id = $4',
                        [cleaned.content, cleaned.title, cleaned.excerpt, post.id]
                    );
                    
                    console.log('  ✅ Fixed!');
                    fixedCount++;
                } else {
                    console.log('  - Already properly formatted');
                }
                
            } catch (error) {
                console.error(`  ❌ Error fixing post ${post.slug}:`, error.message);
            }
        }
        
        console.log(`\n✅ Fixed ${fixedCount} out of ${posts.length} posts`);
        
    } catch (error) {
        console.error('❌ Database error:', error);
    } finally {
        await db.end();
    }
}

// Run the fix
fixAllPosts().then(() => {
    console.log('\n🎉 Blog post fix complete!');
    process.exit(0);
}).catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});