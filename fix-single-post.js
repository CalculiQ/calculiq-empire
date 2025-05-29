 fix-single-post.js
 Fix a specific blog post by slug

const { Pool } = require('pg');
require('dotenv').config();
const BlogContentCleaner = require('.blog-content-cleaner');

async function fixSinglePost(slug) {
    console.log(`🔧 Fixing blog post ${slug}`);
    
    const db = new Pool({
        connectionString process.env.DATABASE_URL,
        ssl {
            rejectUnauthorized false
        }
    });
    
    const cleaner = new BlogContentCleaner();
    
    try {
         Fetch the specific post
        const result = await db.query(
            'SELECT id, slug, title, content, excerpt FROM blog_posts WHERE slug = $1',
            [slug]
        );
        
        if (result.rows.length === 0) {
            console.log('❌ Post not found');
            return;
        }
        
        const post = result.rows[0];
        console.log(`📝 Found post ${post.title}`);
        
         Clean the content
        const cleaned = cleaner.cleanBlogPost({
            title post.title,
            content post.content,
            excerpt post.excerpt,
            slug post.slug,
            calculatorType 'investment'
        });
        
         Update in database
        await db.query(
            'UPDATE blog_posts SET content = $1, title = $2, excerpt = $3 WHERE id = $4',
            [cleaned.content, cleaned.title, cleaned.excerpt, post.id]
        );
        
        console.log('✅ Post fixed successfully!');
        
    } catch (error) {
        console.error('❌ Error', error);
    } finally {
        await db.end();
    }
}

 Run with the problem post
fixSinglePost('trumps-new-tariff-threats-shake-up-investment-landscape-how-to-adapt-in-the-next-2025-05-29')
    .then(() = process.exit(0))
    .catch(error = {
        console.error(error);
        process.exit(1);
    });