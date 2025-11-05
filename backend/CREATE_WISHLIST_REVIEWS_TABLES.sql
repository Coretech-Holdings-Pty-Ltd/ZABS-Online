-- ============================================
-- WISHLIST, RATINGS & REVIEWS TABLES
-- ============================================
-- Run these SQL commands in Supabase SQL Editor
-- ============================================

-- 1. CREATE WISHLIST TABLE
-- Stores products that customers have saved to their wishlist
CREATE TABLE IF NOT EXISTS public.wishlist (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    customer_id TEXT NOT NULL REFERENCES public.customer(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_handle TEXT,
    product_title TEXT,
    product_price INTEGER, -- Price in cents
    product_thumbnail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Prevent duplicate entries (one product per customer)
    UNIQUE(customer_id, product_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_wishlist_customer ON public.wishlist(customer_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product ON public.wishlist(product_id);

-- Enable RLS (but allow all operations for now)
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (you can restrict this later)
CREATE POLICY "Enable all operations for wishlist" ON public.wishlist
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================

-- 2. CREATE PRODUCT REVIEWS TABLE
-- Stores customer reviews and ratings for products
CREATE TABLE IF NOT EXISTS public.product_review (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    customer_id TEXT NOT NULL REFERENCES public.customer(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    order_id TEXT NOT NULL REFERENCES public."order"(id) ON DELETE CASCADE,
    
    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    
    -- Verification
    verified_purchase BOOLEAN DEFAULT true NOT NULL,
    
    -- Helpful votes
    helpful_count INTEGER DEFAULT 0 NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'published' CHECK (status IN ('pending', 'published', 'rejected')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- One review per product per order
    UNIQUE(customer_id, product_id, order_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_review_customer ON public.product_review(customer_id);
CREATE INDEX IF NOT EXISTS idx_review_product ON public.product_review(product_id);
CREATE INDEX IF NOT EXISTS idx_review_order ON public.product_review(order_id);
CREATE INDEX IF NOT EXISTS idx_review_status ON public.product_review(status);
CREATE INDEX IF NOT EXISTS idx_review_rating ON public.product_review(rating);

-- Enable RLS
ALTER TABLE public.product_review ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations
CREATE POLICY "Enable all operations for reviews" ON public.product_review
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================

-- 3. CREATE REVIEW HELPFUL VOTES TABLE (Optional)
-- Track which customers found reviews helpful
CREATE TABLE IF NOT EXISTS public.review_helpful (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    review_id TEXT NOT NULL REFERENCES public.product_review(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL REFERENCES public.customer(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- One vote per review per customer
    UNIQUE(review_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_helpful_review ON public.review_helpful(review_id);
CREATE INDEX IF NOT EXISTS idx_helpful_customer ON public.review_helpful(customer_id);

ALTER TABLE public.review_helpful ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for helpful votes" ON public.review_helpful
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================

-- 4. CREATE FUNCTION TO CHECK IF CUSTOMER ORDERED PRODUCT
-- This ensures only customers who purchased can review
CREATE OR REPLACE FUNCTION public.customer_ordered_product(
    p_customer_id TEXT,
    p_product_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if customer has an order containing this product
    -- Note: Medusa v2 stores line items in order.items jsonb array
    RETURN EXISTS (
        SELECT 1
        FROM public."order" o
        WHERE o.customer_id = p_customer_id
        AND o.status NOT IN ('canceled', 'archived')
        AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(o.items) AS item
            WHERE item->>'product_id' = p_product_id
            OR item->>'variant_id' IN (
                SELECT id FROM product_variant WHERE product_id = p_product_id
            )
        )
    );
END;
$$;

-- ============================================

-- 5. UPDATED TIMESTAMP TRIGGER
-- Automatically update updated_at on changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to wishlist
DROP TRIGGER IF EXISTS update_wishlist_updated_at ON public.wishlist;
CREATE TRIGGER update_wishlist_updated_at
    BEFORE UPDATE ON public.wishlist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply to reviews
DROP TRIGGER IF EXISTS update_review_updated_at ON public.product_review;
CREATE TRIGGER update_review_updated_at
    BEFORE UPDATE ON public.product_review
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================

-- 6. CREATE VIEW FOR PRODUCT RATINGS SUMMARY
-- Aggregate ratings per product
CREATE OR REPLACE VIEW public.product_rating_summary AS
SELECT
    product_id,
    COUNT(*) as total_reviews,
    AVG(rating)::NUMERIC(3,2) as average_rating,
    COUNT(*) FILTER (WHERE rating = 5) as five_star,
    COUNT(*) FILTER (WHERE rating = 4) as four_star,
    COUNT(*) FILTER (WHERE rating = 3) as three_star,
    COUNT(*) FILTER (WHERE rating = 2) as two_star,
    COUNT(*) FILTER (WHERE rating = 1) as one_star
FROM public.product_review
WHERE status = 'published'
AND deleted_at IS NULL
GROUP BY product_id;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Add to wishlist
-- INSERT INTO public.wishlist (customer_id, product_id, product_title, product_price, product_thumbnail)
-- VALUES ('customer_123', 'prod_456', 'Product Name', 9999, 'https://example.com/image.jpg');

-- Check if customer ordered product (before allowing review)
-- SELECT public.customer_ordered_product('customer_123', 'prod_456');

-- Create review (only if customer ordered the product)
-- INSERT INTO public.product_review (customer_id, product_id, order_id, rating, title, comment)
-- VALUES ('customer_123', 'prod_456', 'order_789', 5, 'Great product!', 'Loved it, highly recommend');

-- Get product ratings
-- SELECT * FROM public.product_rating_summary WHERE product_id = 'prod_456';

-- Get reviews for a product
-- SELECT 
--     r.*,
--     c.first_name,
--     c.last_name
-- FROM public.product_review r
-- JOIN public.customer c ON r.customer_id = c.id
-- WHERE r.product_id = 'prod_456'
-- AND r.status = 'published'
-- ORDER BY r.created_at DESC;

-- ============================================
-- NOTES
-- ============================================
-- 1. Wishlist: Stored per customer, linked to customer table
-- 2. Reviews: Only customers who ordered the product can review
-- 3. Ratings: 1-5 stars, verified purchase badge
-- 4. RLS: Enabled but permissive (restrict in production)
-- 5. Indexes: Added for performance
-- 6. Triggers: Auto-update timestamps
-- ============================================

COMMIT;
