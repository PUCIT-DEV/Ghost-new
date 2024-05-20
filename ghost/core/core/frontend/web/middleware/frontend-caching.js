/**
 * @file Middleware to set the appropriate cache headers on the frontend
 */
const config = require('../../../shared/config');
const shared = require('../../../server/web/shared');

/**
 * 
 * @param {object} member 
 * @returns string|null - The member's active tier, or null if the member has more than one active subscription
 */
function calculateMemberTier(member) {
    const activeSubscriptions = member.subscriptions.filter(sub => sub.status === 'active');
    let memberTier;
    if (activeSubscriptions.length === 0) {
        memberTier = 'free';
    } else if (activeSubscriptions.length === 1) {
        memberTier = activeSubscriptions[0].tier.slug;
    } else {
        // Member has more than one active subscription
        // This is rare, but it can happen. 
        // In this case, don't bother caching the content
        return null;
    }
    return memberTier;
}

/**
 * Site frontend is NOT cacheable if:
 * - the site is set to private
 * - the request is made by a member (and caching members content is not enabled)
 * 
 * Site frontend is cacheable if:
 * - the site is public, and the request is not made by a member
 * - the site is public, the request is made by a member, and caching members content is enabled
 *    - Note: Caching member's content is an experimental feature, and should not be enabled by default
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function setFrontendCacheHeaders(req, res, next) {
    // Site frontend is cacheable unless:
    // - the site is set to private
    // - the request is made by a member and the site is not configured to cache members content

    // Only cache member's content if the site is explicitly configured to do so
    const shouldCacheMembersContent = config.get('members:cacheMembersContent');

    // CASE: Never cache if the blog is set to private
    if (res.isPrivateBlog) {
        return shared.middleware.cacheControl('private')(req, res, next);
    }

    // CASE: Never cache if the request is made by a member and the site is not configured to cache members content
    // Note: Member's caching is an experimental feature, and shouldn't be enabled by default
    if (req.member && !shouldCacheMembersContent) {
        return shared.middleware.cacheControl('private')(req, res, next);
    }

    // CASE: Cache the request if the request is made by a member and the site _is_ configured to cache members content
    // Add some additional cache headers to inform the caching layer how to cache the content
    if (req.member && shouldCacheMembersContent) {
        // Set the 'cache-control' header to 'public'
        const memberTier = calculateMemberTier(req.member);
        if (!memberTier) {
            // Member has more than one active subscription, don't cache the content
            return shared.middleware.cacheControl('private')(req, res, next);
        }
        // The member is either on the free tier or has a single active subscription
        // Cache the content based on the member's tier
        res.set({'X-Member-Cache-Tier': memberTier});
        let varyValue = res.get('Vary');
        varyValue = varyValue ? `${varyValue}, X-Member-Cache-Tier` : 'X-Member-Cache-Tier';
        res.set({Vary: varyValue});
        return shared.middleware.cacheControl('public', {maxAge: config.get('caching:frontend:maxAge')})(req, res, next);
    }

    // CASE: Site is not private and the request is not made by a member — cache the content
    return shared.middleware.cacheControl('public', {maxAge: config.get('caching:frontend:maxAge')})(req, res, next);
}

const frontendCachingModule = module.exports = setFrontendCacheHeaders;
frontendCachingModule.calculateMemberTier = calculateMemberTier; // Expose the member tier calculation function for testing